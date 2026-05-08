/**
 * 정산 빌더 엑셀 Exporter.
 *
 * 공개 API:
 *   - buildSettlementExport(input): ExportArtifact 생성
 *   - downloadArtifact(artifact): 브라우저에서 다운로드 트리거
 *
 * Mode:
 *   - "all"       — 워크북 1개, 시트 2개(월별 요약 / 강사별 정산 세로 연결)
 *   - "per-sheet" — 워크북 1개, 시트 1(월별 요약) + N(선택 강사별 시트)
 *   - "per-file"  — 강사별 독립 워크북 → zip 묶음(월별 요약 미포함)
 *
 * 세금액 컬럼 산식:
 *   rule.taxable === true ? Math.round(result * 0.033) : ""
 *
 * 참조 계획서: .claude/plans/jeongsan-builder-exporter.md (2026-04-22)
 */

import ExcelJS from "exceljs";
import JSZip from "jszip";

import type {
  BaseId,
  CategoryId,
  MonthlySummary,
  OpId,
  RuleItem,
  RuleResult,
  SettlementCalculator,
  Teacher,
  TeacherSummary,
} from "@/features/jeongsan-builder/calculator";
import { WITHHOLDING_RATE } from "@/features/jeongsan-builder/calculator";

// ============================================================================
// Public API types
// ============================================================================

export type ExportMode = "all" | "per-file" | "per-sheet";

export interface ExportInput {
  calculator: SettlementCalculator;
  mode: ExportMode;
  teacherIds?: string[];
}

export type ExportArtifact =
  | { kind: "xlsx"; blob: Blob; fileName: string }
  | { kind: "zip"; blob: Blob; fileName: string; entries: string[] };

// ============================================================================
// Constants — 색상 팔레트 (파스텔 스카이블루 톤)
// ============================================================================

/** 헤더/하이라이트 배경색 — 파스텔 스카이블루 (tailwind blue-100 근사) */
const COLOR_HEADER_BG = "FFDBEAFE";
/** 강조 텍스트 색 (타이틀/볼드 수치) — 딥 스카이블루 */
const COLOR_ACCENT_TEXT = "FF1E40AF";
/** 강사 블록 굵은 외곽선 */
const COLOR_BORDER_STRONG = "FF60A5FA";
/** 일반 셀 얇은 보더 */
const COLOR_BORDER_LIGHT = "FFE2E8F0";
/** 정산액·실지급액 같은 최종 대표 수치 값 셀의 배경 (연한 핑크) */
const COLOR_FINAL_VALUE_BG = "FFFCE7F3";
/** 최종 대표 수치 값 셀의 텍스트 색 (딥 핑크) */
const COLOR_FINAL_VALUE_TEXT = "FFBE185D";

const BRAND_NAME = "티키타";

// ============================================================================
// Constants — 라벨 매핑
// ============================================================================

const CATEGORY_LABEL: Record<CategoryId, string> = {
  revenue: "수입",
  plus: "플러스",
  minus: "마이너스",
};

const BASE_LABEL: Record<BaseId, string> = {
  revenueVAT: "매출 (수수료 미적용)",
  revenueNet: "순매출 (수수료 적용)",
  revenueWithUnpaidVAT: "매출 + 미납회수 (수수료 미적용)",
  revenueWithUnpaidNet: "매출 + 미납회수 (수수료 적용)",
  hours: "시수",
  students: "학생 수",
  unpaidShare: "이번달 미납액 (-)",
  currentUnpaidNeg: "총 미납금액 (-)",
  direct: "직접 입력",
};

const OP_LABEL: Record<OpId, string> = {
  rate: "비율",
  fixed: "고정",
  multiply: "곱하기",
  add: "더하기",
  custom: "커스텀",
};

/**
 * 기존 4개 정보 컬럼(전월 미납액 / 이번달 미납액 / 전월 회수액 / 이번달 납부액)만으로
 * base 값을 표현 가능한 케이스. 컬럼을 추가하지 않고 해당 셀(또는 조합)을 그대로 참조한다.
 *
 * - 이번달 납부액(G) = sum of c.pay = agg.revenueNet
 * - 전월 회수액(F)   = agg.hoesu.payTotal
 * - 이번달 미납액(E) = agg.unpaid
 */
type BaseExprBuilder = (layout: RuleColumnLayout, row: number) => string;
const BASE_REUSE_EXPR: Partial<Record<BaseId, BaseExprBuilder>> = {
  unpaidShare: (l, r) => `${colLetter(l.thisMonthUnpaid)}${r}`,
  revenueNet: (l, r) => `${colLetter(l.thisMonthPaid)}${r}`,
  revenueWithUnpaidNet: (l, r) =>
    `(${colLetter(l.thisMonthPaid)}${r}+${colLetter(l.prevRecovered)}${r})`,
  // 총 미납(음수) = -(전월 미납 D + 이번달 미납 E)
  currentUnpaidNeg: (l, r) =>
    `-(${colLetter(l.prevUnpaid)}${r}+${colLetter(l.thisMonthUnpaid)}${r})`,
};

/**
 * 기존 컬럼으로 표현이 불가능해 별도 컬럼이 필요한 base. 사용된 것만 동적으로 추가된다.
 */
const BASE_COLUMN_LABEL: Partial<Record<BaseId, string>> = {
  revenueVAT: "매출(미적용)",
  revenueWithUnpaidVAT: "매출+미납(미적용)",
  hours: "시수",
  students: "학생 수",
  direct: "직접 입력",
};

const BASE_COLUMN_WIDTH: Partial<Record<BaseId, number>> = {
  revenueVAT: 14,
  revenueWithUnpaidVAT: 18,
  hours: 10,
  students: 10,
  direct: 12,
};

/** 신규 base 컬럼이 정렬되는 표시 순서. (기존 컬럼 재사용 base는 포함 X) */
const BASE_DISPLAY_ORDER: BaseId[] = [
  "revenueVAT",
  "revenueWithUnpaidVAT",
  "hours",
  "students",
  "direct",
];

const TEACHER_SUMMARY_HEADERS = [
  "항목수",
  "지급액 합계",
  "차감액 합계",
  "정산액",
  "세액(3.3%)",
  "과세기준액",
  "실지급액",
] as const;

const MONTHLY_TEACHER_HEADERS = [
  "#",
  "강사명",
  "과목",
  "항목수",
  "지급액",
  "차감액",
  "정산액",
  "과세기준액",
  "세액",
  "실지급액",
] as const;

// ============================================================================
// Public API — buildSettlementExport
// ============================================================================

export async function buildSettlementExport(
  input: ExportInput,
): Promise<ExportArtifact> {
  const { calculator, mode, teacherIds } = input;

  const year = calculator.getYear();
  const month = calculator.getMonth();
  const periodLabel = formatPeriodLabel(year, month);

  if (mode === "all") {
    return buildAllModeArtifact(calculator, periodLabel);
  }

  if (mode === "per-sheet") {
    const selected = resolveSelectedTeachers(calculator, teacherIds);
    return buildPerSheetArtifact(calculator, selected, periodLabel);
  }

  if (mode === "per-file") {
    const selected = resolveSelectedTeachers(calculator, teacherIds);
    return buildPerFileArtifact(calculator, selected, periodLabel);
  }

  throw new Error(`지원하지 않는 export mode: ${String(mode)}`);
}

// ============================================================================
// Public API — downloadArtifact
// ============================================================================

export function downloadArtifact(artifact: ExportArtifact): void {
  const url = URL.createObjectURL(artifact.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = artifact.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // revokeObjectURL은 click 후 즉시 해도 브라우저가 다운로드 완료 전에 잡고 있으므로 안전.
  // 다만 일부 브라우저(사파리)에서 타이밍 이슈 대비 microtask 뒤로 미룸.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ============================================================================
// Mode builders
// ============================================================================

async function buildAllModeArtifact(
  calculator: SettlementCalculator,
  periodLabel: string,
): Promise<ExportArtifact> {
  const workbook = new ExcelJS.Workbook();
  renderMonthlySummarySheet(workbook, calculator);

  const teachers = calculator.getTeachers();
  const sheet = workbook.addWorksheet("강사별 정산", {
    views: [{ showGridLines: true }],
  });
  // 동일 시트에 모든 강사가 세로로 누적되므로 모든 강사 rule의 합집합으로 컬럼을 결정한다.
  const allRules: RuleItem[] = [];
  for (const t of teachers) allRules.push(...calculator.getRules(t.id));
  const layout = buildRuleLayout(allRules);
  applyRuleColumnWidths(sheet, layout.widths);

  let row = 1;
  if (teachers.length === 0) {
    sheet.getCell(row, 1).value = "정산할 강사가 없습니다.";
  } else {
    for (const teacher of teachers) {
      row = renderTeacherBlock(sheet, calculator, teacher.id, row, layout);
      row += 2;
    }
  }

  const blob = await workbookToBlob(workbook);
  return {
    kind: "xlsx",
    blob,
    fileName: `${periodLabel}_전체강사_정산.xlsx`,
  };
}

async function buildPerSheetArtifact(
  calculator: SettlementCalculator,
  selectedTeachers: Teacher[],
  periodLabel: string,
): Promise<ExportArtifact> {
  if (selectedTeachers.length === 0) {
    throw new Error("내보낼 강사를 1명 이상 선택해 주세요.");
  }

  const workbook = new ExcelJS.Workbook();
  renderMonthlySummarySheet(workbook, calculator);

  for (const teacher of selectedTeachers) {
    renderTeacherSheet(workbook, calculator, teacher);
  }

  const blob = await workbookToBlob(workbook);
  return {
    kind: "xlsx",
    blob,
    fileName: `${periodLabel}_선택강사_${selectedTeachers.length}명_시트별.xlsx`,
  };
}

async function buildPerFileArtifact(
  calculator: SettlementCalculator,
  selectedTeachers: Teacher[],
  periodLabel: string,
): Promise<ExportArtifact> {
  if (selectedTeachers.length === 0) {
    throw new Error("내보낼 강사를 1명 이상 선택해 주세요.");
  }

  const zip = new JSZip();
  const entries: string[] = [];

  for (const teacher of selectedTeachers) {
    const workbook = new ExcelJS.Workbook();
    renderTeacherSheet(workbook, calculator, teacher);
    const buffer = await workbook.xlsx.writeBuffer();
    const safeName = sanitizeFileNamePart(teacher.name);
    const safeId = sanitizeFileNamePart(teacher.id);
    const entryName = `${periodLabel}_${safeName}_${safeId}.xlsx`;
    zip.file(entryName, buffer);
    entries.push(entryName);
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
  });

  return {
    kind: "zip",
    blob,
    fileName: `${periodLabel}_선택강사_${selectedTeachers.length}명.zip`,
    entries,
  };
}

// ============================================================================
// Teacher sheet / block renderer
// ============================================================================

function renderTeacherSheet(
  workbook: ExcelJS.Workbook,
  calculator: SettlementCalculator,
  teacher: Teacher,
): ExcelJS.Worksheet {
  const sheetName = uniqueWorksheetName(workbook, teacher.name);
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });
  // 강사 1명의 rule만 사용하므로 그 강사의 base만 컬럼에 포함된다.
  const layout = buildRuleLayout(calculator.getRules(teacher.id));
  applyRuleColumnWidths(sheet, layout.widths);
  renderTeacherBlock(sheet, calculator, teacher.id, 1, layout);
  return sheet;
}

/**
 * 강사 1명 블록을 주어진 시트의 startRow부터 세로로 렌더.
 * @returns 마지막으로 기록된 다음 row index (호출자가 공백 행 계산에 사용)
 */
function renderTeacherBlock(
  sheet: ExcelJS.Worksheet,
  calculator: SettlementCalculator,
  teacherId: string,
  startRow: number,
  layout: RuleColumnLayout,
): number {
  const teacher = calculator.getTeacher(teacherId);
  if (!teacher) return startRow;

  const rules = calculator.getRules(teacherId);
  const summary = calculator.getTeacherSummary(teacherId);

  let row = startRow;
  const blockStartRow = row;
  const colEnd = layout.total;

  // 요약 SUM 수식이 참조할 rule 데이터 row 범위를 미리 계산.
  // 레이아웃: title(0) / 요약 헤더(1) / 요약 값(2) / 빈 행(3) / rule 헤더(4) / rule 데이터(5..)
  const summaryValueRow = startRow + 2;
  const ruleDataStartRow = startRow + 5;
  const ruleDataEndRow =
    rules.length > 0 ? ruleDataStartRow + rules.length - 1 : ruleDataStartRow;

  const settleColLetter = colLetter(layout.settle);
  const taxColLetter = colLetter(layout.tax);
  const settleRange = `${settleColLetter}${ruleDataStartRow}:${settleColLetter}${ruleDataEndRow}`;
  const taxRange = `${taxColLetter}${ruleDataStartRow}:${taxColLetter}${ruleDataEndRow}`;

  // 타이틀: 강사명 (과목 행은 제거됨 — 강사명만 표시)
  sheet.mergeCells(row, 1, row, colEnd);
  const titleCell = sheet.getCell(row, 1);
  titleCell.value = teacher.name;
  titleCell.font = {
    bold: true,
    size: 14,
    color: { argb: COLOR_ACCENT_TEXT },
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_HEADER_BG },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(row).height = 24;
  row += 1;

  // 요약 헤더
  TEACHER_SUMMARY_HEADERS.forEach((header, index) => {
    const cell = sheet.getCell(row, index + 1);
    cell.value = header;
    setHeaderStyle(cell);
  });
  // 요약 헤더 행의 빈 오른쪽 컬럼들도 테두리 유지를 위해 보더 채움
  for (let c = TEACHER_SUMMARY_HEADERS.length + 1; c <= colEnd; c += 1) {
    const cell = sheet.getCell(row, c);
    setValueStyle(cell);
  }
  row += 1;

  // 요약 값
  // 정산액(index 3) / 세액(4) / 과세기준액(5) / 실지급액(6)은 rule 행을 SUM/SUMIF로 참조하는 수식.
  // 항목수(0) / 지급액 합계(1) / 차감액 합계(2)는 calculator가 계산한 정적값.
  type SummarySpec =
    | { kind: "value"; value: string | number; numFmt?: string }
    | {
      kind: "formula";
      formula: string;
      resultFallback: number;
      numFmt?: string;
    };

  // 정산액 셀(컬럼 D = 4번째)과 세액 셀(컬럼 E = 5번째)을 실지급액 수식에서 참조.
  const summarySettleAddr = `${colLetter(4)}${summaryValueRow}`;
  const summaryTaxAddr = `${colLetter(5)}${summaryValueRow}`;

  const summarySpecs: SummarySpec[] = summary
    ? [
      { kind: "value", value: summary.itemCount },
      { kind: "value", value: summary.gross, numFmt: "#,##0" },
      { kind: "value", value: summary.deduct, numFmt: "#,##0" },
      {
        kind: "formula",
        formula: `SUM(${settleRange})`,
        resultFallback: summary.settle,
        numFmt: "#,##0",
      },
      {
        kind: "formula",
        formula: `SUM(${taxRange})`,
        // 기존 summary.withholding는 음수로 저장됨 → 양수 표시로 통일.
        resultFallback: -summary.withholding,
        numFmt: "#,##0",
      },
      {
        kind: "formula",
        formula: `MAX(0,SUMIF(${taxRange},">0",${settleRange}))`,
        resultFallback: Math.max(summary.taxable, 0),
        numFmt: "#,##0",
      },
      {
        kind: "formula",
        formula: `${summarySettleAddr}-${summaryTaxAddr}`,
        resultFallback: summary.net,
        numFmt: "#,##0",
      },
    ]
    : Array.from({ length: TEACHER_SUMMARY_HEADERS.length }, () => ({
      kind: "value" as const,
      value: "-",
    }));

  summarySpecs.forEach((spec, index) => {
    const cell = sheet.getCell(row, index + 1);
    if (spec.kind === "formula") {
      cell.value = { formula: spec.formula, result: spec.resultFallback };
    } else {
      cell.value = spec.value;
    }
    if (spec.numFmt) cell.numFmt = spec.numFmt;
    // 정산액(3) / 실지급액(6) → 연한 핑크 배경 + 딥 핑크 볼드
    if (index === 3 || index === 6) {
      setFinalValueStyle(cell);
    } else {
      setValueStyle(cell);
    }
  });
  // 요약 값 행의 나머지 오른쪽 컬럼도 테두리 유지
  for (let c = summarySpecs.length + 1; c <= colEnd; c += 1) {
    const cell = sheet.getCell(row, c);
    setValueStyle(cell);
  }
  row += 2; // 빈 행 1개

  // Rule 테이블 헤더
  layout.headers.forEach((header, index) => {
    const cell = sheet.getCell(row, index + 1);
    cell.value = header;
    setHeaderStyle(cell);
  });
  row += 1;

  // Rule 행
  if (rules.length === 0) {
    sheet.mergeCells(row, 1, row, layout.total);
    const emptyCell = sheet.getCell(row, 1);
    emptyCell.value = "정산 항목이 없습니다.";
    emptyCell.alignment = { vertical: "middle", horizontal: "center" };
    emptyCell.font = { color: { argb: "FF94A3B8" } };
    setValueStyle(emptyCell);
    row += 1;
  } else {
    const nameColorMap = buildNameColorMap(rules);
    rules.forEach((rule, index) => {
      const result = calculator.getRuleResult(teacherId, rule.id);
      const metrics = computeRuleClassMetrics(calculator, teacherId, rule);
      const nameColor = nameColorMap.get(rule.name) ?? null;
      renderRuleRow(
        sheet,
        row,
        rule,
        result,
        index + 1,
        metrics,
        nameColor,
        layout,
      );
      row += 1;
    });
  }

  // 블록 전체를 굵은 외곽선으로 감싸서 컨테이너처럼 표현
  const blockEndRow = row - 1;
  applyOuterBorder(sheet, blockStartRow, 1, blockEndRow, colEnd);

  return row;
}

/**
 * Rule 테이블의 동적 컬럼 레이아웃.
 * 사용된 base 종류에 따라 base value 컬럼들이 baseKind와 op 사이에 삽입된다.
 * 모든 컬럼 인덱스는 1-based (엑셀 컬럼 번호와 동일).
 */
interface RuleColumnLayout {
  headers: string[];
  widths: number[];
  /** baseId → 1-based 컬럼 인덱스. 해당 base를 쓰는 rule이 있을 때만 키가 존재. */
  baseColumns: Map<BaseId, number>;
  // 고정 컬럼
  ordinal: number;
  category: number;
  name: number;
  prevUnpaid: number;
  thisMonthUnpaid: number;
  prevRecovered: number;
  /** 학생이 실제로 납부한 금액(payTotal 합) — 정산 계산용 base와 별개의 정보 컬럼. */
  thisMonthPaid: number;
  baseKind: number;
  // base value 컬럼들 이후의 동적 위치
  op: number;
  aux: number;
  settle: number;
  tax: number;
  amount: number;
  total: number;
}

/** rule이 정산 계산에 실제로 사용하는 base. plus/minus는 항상 customBase 기반이므로 "direct" 취급. */
function effectiveBase(rule: RuleItem): BaseId {
  return rule.cat === "revenue" ? rule.base : "direct";
}

/** 신규 컬럼이 필요한(= 기존 컬럼으로 표현 불가능한) base들만 모아서 정렬된 배열로. */
function collectUsedBases(rules: RuleItem[]): BaseId[] {
  const used = new Set<BaseId>();
  for (const r of rules) {
    const base = effectiveBase(r);
    if (!BASE_REUSE_EXPR[base]) used.add(base);
  }
  return BASE_DISPLAY_ORDER.filter((b) => used.has(b));
}

function buildRuleLayout(rules: RuleItem[]): RuleColumnLayout {
  const usedBases = collectUsedBases(rules);
  const headers: string[] = [
    "#",
    "유형",
    "항목명",
    "전월 미납액",
    "이번달 미납액",
    "전월 회수액",
    "이번달 납부액",
    "정산 기준",
  ];
  const widths: number[] = [8, 10, 24, 13, 13, 13, 14, 28];

  const baseColumns = new Map<BaseId, number>();
  for (const base of usedBases) {
    const label = BASE_COLUMN_LABEL[base];
    const width = BASE_COLUMN_WIDTH[base];
    if (!label || !width) {
      throw new Error(`buildRuleLayout: ${base} 라벨/폭 정의 누락`);
    }
    baseColumns.set(base, headers.length + 1);
    headers.push(label);
    widths.push(width);
  }

  const op = headers.length + 1;
  headers.push("OPERATION");
  widths.push(12);
  const aux = headers.length + 1;
  headers.push("보조값");
  widths.push(12);
  const settle = headers.length + 1;
  headers.push("정산액");
  widths.push(13);
  const tax = headers.length + 1;
  headers.push("세액");
  widths.push(12);
  const amount = headers.length + 1;
  headers.push("최종 금액");
  widths.push(14);

  return {
    headers,
    widths,
    baseColumns,
    ordinal: 1,
    category: 2,
    name: 3,
    prevUnpaid: 4,
    thisMonthUnpaid: 5,
    prevRecovered: 6,
    thisMonthPaid: 7,
    baseKind: 8,
    op,
    aux,
    settle,
    tax,
    amount,
    total: headers.length,
  };
}

/** 엑셀 컬럼 번호(1-based) → 알파벳 문자열. A=1, B=2, ... Z=26, AA=27... */
function colLetter(col: number): string {
  let n = col;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function renderRuleRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  rule: RuleItem,
  result: RuleResult | null,
  ordinal: number,
  classMetrics: RuleClassMetrics,
  nameColor: string | null,
  layout: RuleColumnLayout,
): void {
  const baseVal = result?.baseVal ?? 0;
  const amount = result?.result ?? 0;

  const taxAmount = rule.taxable ? Math.round(amount * WITHHOLDING_RATE) : null;
  const auxValue = ruleShowsAux(rule.op) ? rule.value : null;

  // 이 rule이 사용하는 base. 기존 4개 정보 컬럼으로 표현 가능하면 그 셀(또는 조합)을
  // 참조 식으로 만들고, 그렇지 않으면 base 전용 신규 컬럼의 셀을 사용한다.
  const ruleBase = effectiveBase(rule);
  const reuseBuilder = BASE_REUSE_EXPR[ruleBase];
  const ownBaseCol = layout.baseColumns.get(ruleBase);

  let baseValueExpr: string;
  if (reuseBuilder) {
    baseValueExpr = reuseBuilder(layout, row);
  } else if (ownBaseCol) {
    baseValueExpr = `${colLetter(ownBaseCol)}${row}`;
  } else {
    throw new Error(
      `renderRuleRow: base "${ruleBase}" 의 셀 표현이 정의돼 있지 않습니다.`,
    );
  }

  const auxCellAddr = `${colLetter(layout.aux)}${row}`;
  const settleCellAddr = `${colLetter(layout.settle)}${row}`;
  const taxCellAddr = `${colLetter(layout.tax)}${row}`;

  type CellSpec = {
    col: number;
    value: string | number | null;
    numFmt?: string;
    formula?: string;
    resultFallback?: number;
  };

  // 정산액 (세액 차감 전) 수식. base 부분은 baseValueExpr (기존 컬럼 참조 또는 조합,
  // 또는 신규 base 컬럼 셀) 로 채워서 사용자가 셀 값만 봐도 의미를 파악할 수 있게 한다.
  // 마이너스 카테고리는 자연 결과값을 음수로 뒤집는 calculator.computeRule와 일치시키기 위해 -()로 감싼다.
  const settleFormula = ((): string => {
    let core: string;
    switch (rule.op) {
      case "rate":
      case "multiply":
        core = `${auxCellAddr}*${baseValueExpr}`;
        break;
      case "add":
        core = `${baseValueExpr}+${auxCellAddr}`;
        break;
      case "fixed":
        core = `${baseValueExpr}`;
        break;
      case "custom":
        return "";
    }
    return rule.cat === "minus" ? `-(${core})` : core;
  })();

  // 세액 수식: 과세 대상이면 ROUND(정산액 × 0.033, 0). 비과세면 빈 셀.
  const taxFormula =
    rule.taxable && settleFormula
      ? `ROUND(${settleCellAddr}*${WITHHOLDING_RATE},0)`
      : "";

  // 최종 금액 = 정산액 - 세액 (비과세 셀은 0으로 처리됨).
  const amountFormula = settleFormula
    ? `${settleCellAddr}-IFERROR(${taxCellAddr},0)`
    : "";

  const settleSpec: CellSpec = settleFormula
    ? {
      col: layout.settle,
      value: null,
      numFmt: "#,##0",
      formula: settleFormula,
      resultFallback: amount,
    }
    : { col: layout.settle, value: amount, numFmt: "#,##0" };

  const taxSpec: CellSpec = taxFormula
    ? {
      col: layout.tax,
      value: null,
      numFmt: "#,##0",
      formula: taxFormula,
      resultFallback: taxAmount ?? 0,
    }
    : { col: layout.tax, value: taxAmount, numFmt: "#,##0" };

  const finalAmount = amount - (taxAmount ?? 0);
  const amountSpec: CellSpec = amountFormula
    ? {
      col: layout.amount,
      value: null,
      numFmt: "#,##0",
      formula: amountFormula,
      resultFallback: finalAmount,
    }
    : { col: layout.amount, value: finalAmount, numFmt: "#,##0" };

  const specs: CellSpec[] = [
    { col: layout.ordinal, value: ordinal },
    { col: layout.category, value: CATEGORY_LABEL[rule.cat] },
    { col: layout.name, value: rule.name },
    { col: layout.prevUnpaid, value: classMetrics.prevUnpaid, numFmt: "#,##0" },
    { col: layout.thisMonthUnpaid, value: classMetrics.thisMonthUnpaid, numFmt: "#,##0" },
    { col: layout.prevRecovered, value: classMetrics.prevRecoveredPay, numFmt: "#,##0" },
    {
      col: layout.thisMonthPaid,
      // 정산기준에 관계없이 실제 납부액(payTotal 합). 정보 컬럼이며 수식 참조 대상은 아님.
      value: classMetrics.thisMonthPaid,
      numFmt: "#,##0",
    },
    { col: layout.baseKind, value: BASE_LABEL[rule.base] },
    // 신규 base 컬럼이 할당된 경우에만 그 셀에 baseVal을 적는다.
    // 기존 컬럼을 재사용하는 base(unpaidShare/revenueNet/revenueWithUnpaidNet)는
    // 이미 정보 컬럼에 값이 있으므로 별도 셀을 만들지 않는다.
    ...(ownBaseCol
      ? [
        {
          col: ownBaseCol,
          value: baseVal,
          numFmt: "#,##0",
        } satisfies CellSpec,
      ]
      : []),
    { col: layout.op, value: OP_LABEL[rule.op] },
    {
      col: layout.aux,
      value: auxValue,
      numFmt: rule.op === "rate" ? "0.###" : "#,##0",
    },
    settleSpec,
    taxSpec,
    amountSpec,
  ];

  for (const spec of specs) {
    const cell = sheet.getCell(row, spec.col);
    if (spec.formula !== undefined) {
      cell.value = {
        formula: spec.formula,
        result: spec.resultFallback,
      };
    } else if (spec.value === null || spec.value === "") {
      cell.value = null;
    } else {
      cell.value = spec.value;
    }
    if (spec.numFmt !== undefined) {
      cell.numFmt = spec.numFmt;
    }
    setValueStyle(cell);
  }

  // 이 rule이 쓰지 않는 다른 신규 base 컬럼들은 빈 셀이지만 테두리는 유지.
  // (기존 컬럼 재사용 base는 ownBaseCol이 없으므로 모든 신규 컬럼에 테두리만 적용된다)
  for (const [base, col] of layout.baseColumns) {
    if (base === ruleBase) continue;
    setValueStyle(sheet.getCell(row, col));
  }

  // 항목명 컬러 오버라이드 (같은 수업명은 동일 컬러 적용)
  if (nameColor) {
    const nameCell = sheet.getCell(row, layout.name);
    nameCell.font = { color: { argb: nameColor }, bold: true };
  }
}

interface RuleClassMetrics {
  prevUnpaid: number;
  thisMonthUnpaid: number;
  prevRecoveredPay: number;
  /** 실제 납부액 (payTotal 합계). 정산기준과 무관하게 학생이 실제로 낸 금액. */
  thisMonthPaid: number;
}

/**
 * 같은 `rule.name`이 여러 행에 등장할 때, 시각적 그루핑을 위해 이름별로
 * 동일한 텍스트 컬러를 부여한다. 2회 이상 등장하는 이름만 색상 매핑에 포함한다.
 * (1회뿐인 이름은 기본 색을 유지하여 시각적 노이즈를 줄임.)
 */
const NAME_GROUP_COLORS = [
  "FFB91C1C", // red-700
  "FF047857", // emerald-700
  "FF6D28D9", // violet-700
  "FFB45309", // amber-700
  "FF0369A1", // sky-700
  "FFBE185D", // pink-700
  "FF4D7C0F", // lime-700
  "FF1D4ED8", // blue-700
];

function buildNameColorMap(rules: RuleItem[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const rule of rules) {
    counts.set(rule.name, (counts.get(rule.name) ?? 0) + 1);
  }
  const map = new Map<string, string>();
  let paletteIndex = 0;
  for (const rule of rules) {
    if ((counts.get(rule.name) ?? 0) >= 2 && !map.has(rule.name)) {
      const color = NAME_GROUP_COLORS[paletteIndex % NAME_GROUP_COLORS.length];
      map.set(rule.name, color);
      paletteIndex += 1;
    }
  }
  return map;
}

function computeRuleClassMetrics(
  calculator: SettlementCalculator,
  teacherId: string,
  rule: RuleItem,
): RuleClassMetrics {
  if (rule.cat !== "revenue" || rule.classIds.length === 0) {
    return {
      prevUnpaid: 0,
      thisMonthUnpaid: 0,
      prevRecoveredPay: 0,
      thisMonthPaid: 0,
    };
  }
  const agg = calculator.getClassAggregate(teacherId, rule.classIds);
  return {
    prevUnpaid: agg.hoesu.hoesuTotal + agg.hoesu.minapTotal,
    thisMonthUnpaid: agg.unpaid,
    prevRecoveredPay: agg.hoesu.payTotal,
    thisMonthPaid: agg.classes.reduce((s, c) => s + c.pay, 0),
  };
}

function ruleShowsAux(op: OpId): boolean {
  return op === "rate" || op === "multiply" || op === "add";
}

// ============================================================================
// Monthly summary sheet renderer
// ============================================================================

function renderMonthlySummarySheet(
  workbook: ExcelJS.Workbook,
  calculator: SettlementCalculator,
): ExcelJS.Worksheet {
  const summary = calculator.getMonthlySummary();
  const teachers = calculator.getTeachers();

  const sheet = workbook.addWorksheet("월별 요약", {
    views: [{ showGridLines: true }],
  });

  const totalCols = MONTHLY_TEACHER_HEADERS.length;

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 16;
  sheet.getColumn(3).width = 14;
  sheet.getColumn(4).width = 10;
  for (let c = 5; c <= totalCols; c += 1) sheet.getColumn(c).width = 14;

  let row = 1;
  const blockStartRow = row;

  // 브랜드 배지 (우측 상단)
  sheet.mergeCells(row, 1, row, totalCols);
  const brandCell = sheet.getCell(row, 1);
  brandCell.value = `${BRAND_NAME} · 정산 빌더 리포트`;
  brandCell.font = {
    bold: true,
    size: 10,
    color: { argb: COLOR_ACCENT_TEXT },
  };
  brandCell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
  row += 1;

  // 타이틀
  sheet.mergeCells(row, 1, row, totalCols);
  const titleCell = sheet.getCell(row, 1);
  titleCell.value = `${summary.year}년 ${String(summary.month).padStart(2, "0")}월 월별 정산 요약`;
  titleCell.font = {
    bold: true,
    size: 16,
    color: { argb: COLOR_ACCENT_TEXT },
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_HEADER_BG },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(row).height = 32;
  const titleDividerRow = row;
  row += 1;

  // Section 1 — 전체 지표 (타이틀 바로 아래, 빈 행 없음)
  // 각 row의 3번째 튜플 요소: 대표 값이면 true (볼드+하이라이트)
  const totals: Array<[string, string | number, boolean]> = [
    ["강사 수", summary.teacherCount, false],
    ["총 매출액", summary.totalRevenue, false],
    ["총 지급액", summary.totalGross, false],
    ["총 차감액", summary.totalDeduct, false],
    ["총 정산액", summary.totalSettle, true],
    ["총 세액", summary.totalWithholding, false],
    ["총 실지급액", summary.totalPayout, true],
  ];

  for (const [label, value, highlight] of totals) {
    const labelCell = sheet.getCell(row, 1);
    sheet.mergeCells(row, 1, row, 3);
    labelCell.value = label;
    setHeaderStyle(labelCell);
    labelCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

    sheet.mergeCells(row, 4, row, totalCols);
    const valueCell = sheet.getCell(row, 4);
    valueCell.value = value;
    if (typeof value === "number") {
      valueCell.numFmt = "#,##0";
    }
    if (highlight) {
      setFinalValueStyle(valueCell);
    } else {
      setValueStyle(valueCell);
    }
    row += 1;
  }
  const statsLastRow = row - 1;

  // Section 2 — 강사별 표 (stats 바로 아래, 빈 행 없음)
  MONTHLY_TEACHER_HEADERS.forEach((header, index) => {
    const cell = sheet.getCell(row, index + 1);
    cell.value = header;
    setHeaderStyle(cell);
  });
  row += 1;

  teachers.forEach((teacher, index) => {
    const teacherSummary = calculator.getTeacherSummary(teacher.id);
    const values: Array<string | number> = [
      index + 1,
      teacher.name,
      teacher.subjectLabel || "-",
      teacherSummary?.itemCount ?? 0,
      teacherSummary?.gross ?? 0,
      teacherSummary?.deduct ?? 0,
      teacherSummary?.settle ?? 0,
      Math.max(teacherSummary?.taxable ?? 0, 0),
      teacherSummary?.withholding ?? 0,
      teacherSummary?.net ?? 0,
    ];
    values.forEach((value, colIdx) => {
      const cell = sheet.getCell(row, colIdx + 1);
      cell.value = value;
      if (typeof value === "number" && colIdx >= 3) {
        cell.numFmt = "#,##0";
      }
      // colIdx 6 = "정산액", 9 = "실지급액" → 핑크 강조 (강사 블록 summary와 통일)
      if (colIdx === 6 || colIdx === 9) {
        setFinalValueStyle(cell);
      } else {
        setValueStyle(cell);
      }
    });
    row += 1;
  });

  if (teachers.length === 0) {
    sheet.mergeCells(row, 1, row, totalCols);
    const emptyCell = sheet.getCell(row, 1);
    emptyCell.value = "등록된 강사가 없습니다.";
    emptyCell.alignment = { vertical: "middle", horizontal: "center" };
    emptyCell.font = { color: { argb: "FF94A3B8" } };
    setValueStyle(emptyCell);
    row += 1;
  }

  const blockEndRow = row - 1;

  // 섹션 경계 divider (타이틀 아래 / stats 아래) — 굵은 bottom border
  applyBottomDivider(sheet, titleDividerRow, 1, totalCols);
  applyBottomDivider(sheet, statsLastRow, 1, totalCols);

  // 전체 외곽선
  applyOuterBorder(sheet, blockStartRow, 1, blockEndRow, totalCols);

  return sheet;
}

// ============================================================================
// Helpers
// ============================================================================

function resolveSelectedTeachers(
  calculator: SettlementCalculator,
  teacherIds: string[] | undefined,
): Teacher[] {
  if (!teacherIds || teacherIds.length === 0) return [];
  const idSet = new Set(teacherIds);
  return calculator.getTeachers().filter((t) => idSet.has(t.id));
}

function applyRuleColumnWidths(
  sheet: ExcelJS.Worksheet,
  widths: number[],
): void {
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

async function workbookToBlob(workbook: ExcelJS.Workbook): Promise<Blob> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function formatPeriodLabel(year: number, month: number): string {
  const mm = String(month).padStart(2, "0");
  return `${year}년${mm}월`;
}

function setHeaderStyle(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, color: { argb: COLOR_ACCENT_TEXT } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_HEADER_BG },
  };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.border = {
    top: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
    bottom: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
    left: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
    right: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
  };
}

function setValueStyle(cell: ExcelJS.Cell): void {
  cell.border = {
    top: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
    bottom: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
    left: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
    right: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
  };
  cell.alignment = { vertical: "middle" };
}

/**
 * "정산액"/"실지급액" 같은 최종 대표 수치 셀 전용.
 * 연한 핑크 배경 + 딥 핑크 볼드 텍스트.
 */
function setFinalValueStyle(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, color: { argb: COLOR_FINAL_VALUE_TEXT } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_FINAL_VALUE_BG },
  };
  cell.alignment = { vertical: "middle" };
  cell.border = {
    top: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
    bottom: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
    left: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
    right: { style: "thin", color: { argb: COLOR_BORDER_LIGHT } },
  };
}

/**
 * 지정한 행의 bottom에 굵은 divider 라인 적용 (섹션 구분용).
 */
function applyBottomDivider(
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
  colStart: number,
  colEnd: number,
): void {
  const strong = {
    style: "medium" as const,
    color: { argb: COLOR_BORDER_STRONG },
  };
  for (let c = colStart; c <= colEnd; c += 1) {
    const cell = sheet.getCell(rowIndex, c);
    cell.border = { ...cell.border, bottom: strong };
  }
}

/**
 * 직사각형 영역 외곽 테두리를 굵게 적용 (강사 블록 컨테이너 표현).
 * 기존 내부 테두리/폰트/배경 등 다른 스타일은 유지.
 */
function applyOuterBorder(
  sheet: ExcelJS.Worksheet,
  rowStart: number,
  colStart: number,
  rowEnd: number,
  colEnd: number,
): void {
  const strong = {
    style: "medium" as const,
    color: { argb: COLOR_BORDER_STRONG },
  };

  // 모든 외곽 셀을 한 번에 순회하며 border를 병합 적용.
  // 병합된 셀(mergeCells로 묶인 구간)은 sheet.getCell이 master(앵커) 셀을
  // 반환하므로 같은 앵커에 top/left/right/bottom이 누적 적용된다.
  for (let r = rowStart; r <= rowEnd; r += 1) {
    for (let c = colStart; c <= colEnd; c += 1) {
      const isTop = r === rowStart;
      const isBottom = r === rowEnd;
      const isLeft = c === colStart;
      const isRight = c === colEnd;
      if (!isTop && !isBottom && !isLeft && !isRight) continue;

      const cell = sheet.getCell(r, c);
      const next = { ...cell.border };
      if (isTop) next.top = strong;
      if (isBottom) next.bottom = strong;
      if (isLeft) next.left = strong;
      if (isRight) next.right = strong;
      cell.border = next;
    }
  }
}

function sanitizeSheetName(name: string): string {
  const cleaned = name
    .replace(/[\\/*?:[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 31) || "Sheet";
}

function uniqueWorksheetName(
  workbook: ExcelJS.Workbook,
  desired: string,
): string {
  const base = sanitizeSheetName(desired);
  if (!workbook.getWorksheet(base)) return base;
  for (let index = 2; index < 200; index += 1) {
    const suffix = ` (${index})`;
    const candidate = sanitizeSheetName(
      base.slice(0, Math.max(1, 31 - suffix.length)) + suffix,
    );
    if (!workbook.getWorksheet(candidate)) return candidate;
  }
  return sanitizeSheetName(
    `${base.slice(0, 20)}_${Math.random().toString(36).slice(2, 7)}`,
  );
}

function sanitizeFileNamePart(value: string): string {
  // 윈도우/유닉스 모두에서 안전한 파일명 구성 요소로 정규화.
  return (
    value
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .trim() || "untitled"
  );
}

// Re-export types for callers
export type { MonthlySummary, TeacherSummary };
