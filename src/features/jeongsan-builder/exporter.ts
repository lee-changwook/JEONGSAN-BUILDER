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
  revenueVAT: "매출 (수수료 포함)",
  revenueNet: "순매출 (수수료 제외)",
  revenueWithUnpaidVAT: "매출 + 미납회수 (수수료 미적용)",
  revenueWithUnpaidNet: "매출 + 미납회수 (수수료 적용)",
  hours: "시수",
  students: "학생 수",
  unpaidShare: "미납금",
  currentUnpaidNeg: "현재 미납금액 (-)",
  direct: "직접 입력",
};

const OP_LABEL: Record<OpId, string> = {
  rate: "비율",
  fixed: "고정",
  multiply: "곱하기",
  add: "더하기",
  custom: "커스텀",
};

const RULE_HEADERS = [
  "#",
  "유형",
  "항목명",
  "전월 미납액",
  "이번달 미납액",
  "전월 회수액",
  "이번달 납부액",
  "베이스값 종류",
  "베이스값",
  "OPERATION",
  "보조값",
  "세액",
  "금액",
] as const;

const RULE_COL_WIDTHS = [8, 10, 24, 13, 13, 13, 13, 18, 14, 12, 12, 12, 14];

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
  applyRuleColumnWidths(sheet);

  let row = 1;
  if (teachers.length === 0) {
    sheet.getCell(row, 1).value = "정산할 강사가 없습니다.";
  } else {
    for (const teacher of teachers) {
      row = renderTeacherBlock(sheet, calculator, teacher.id, row);
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
  applyRuleColumnWidths(sheet);
  renderTeacherBlock(sheet, calculator, teacher.id, 1);
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
): number {
  const teacher = calculator.getTeacher(teacherId);
  if (!teacher) return startRow;

  const rules = calculator.getRules(teacherId);
  const summary = calculator.getTeacherSummary(teacherId);

  let row = startRow;
  const blockStartRow = row;
  const colEnd = RULE_HEADERS.length;

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

  // 요약 값: 정산액(index 3), 실지급액(index 6) 강조
  const summaryValues: Array<string | number> = summary
    ? [
      summary.itemCount,
      summary.gross,
      summary.deduct,
      summary.settle,
      summary.withholding,
      Math.max(summary.taxable, 0),
      summary.net,
    ]
    : ["-", "-", "-", "-", "-", "-", "-"];

  summaryValues.forEach((value, index) => {
    const cell = sheet.getCell(row, index + 1);
    cell.value = value;
    if (typeof value === "number" && index > 0) {
      cell.numFmt = "#,##0";
    }
    // 정산액(3) / 실지급액(6) → 연한 핑크 배경 + 딥 핑크 볼드
    if (index === 3 || index === 6) {
      setFinalValueStyle(cell);
    } else {
      setValueStyle(cell);
    }
  });
  // 요약 값 행의 나머지 오른쪽 컬럼도 테두리 유지
  for (let c = summaryValues.length + 1; c <= colEnd; c += 1) {
    const cell = sheet.getCell(row, c);
    setValueStyle(cell);
  }
  row += 2; // 빈 행 1개

  // Rule 테이블 헤더
  RULE_HEADERS.forEach((header, index) => {
    const cell = sheet.getCell(row, index + 1);
    cell.value = header;
    setHeaderStyle(cell);
  });
  row += 1;

  // Rule 행
  if (rules.length === 0) {
    sheet.mergeCells(row, 1, row, RULE_HEADERS.length);
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
 * Rule 테이블 컬럼 인덱스(1-based, 엑셀 컬럼 = index).
 * 수식 셀 참조에 사용되므로 RULE_HEADERS와 반드시 동기화.
 */
const RULE_COL = {
  ordinal: 1,
  category: 2,
  name: 3,
  prevUnpaid: 4,
  thisMonthUnpaid: 5,
  prevRecovered: 6,
  thisMonthPaid: 7,
  baseKind: 8,
  baseVal: 9,
  op: 10,
  aux: 11,
  tax: 12,
  amount: 13,
} as const;

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
): void {
  const baseVal = result?.baseVal ?? 0;
  const amount = result?.result ?? 0;

  const taxAmount = rule.taxable ? Math.round(amount * WITHHOLDING_RATE) : null;
  const auxValue = ruleShowsAux(rule.op) ? rule.value : null;

  const auxCellAddr = `${colLetter(RULE_COL.aux)}${row}`;
  const baseCellAddr = `${colLetter(RULE_COL.baseVal)}${row}`;
  const taxCellAddr = `${colLetter(RULE_COL.tax)}${row}`;

  type CellSpec = {
    col: number;
    value: string | number | null;
    numFmt?: string;
    formula?: string;
    resultFallback?: number;
  };

  const amountSpec: CellSpec =
    rule.op === "rate"
      ? {
        col: RULE_COL.amount,
        value: null,
        numFmt: "#,##0",
        // 비율일 때: 보조값 × 베이스값 − 세금(세금은 음수 처리 위해 빈 셀일 땐 0 취급)
        formula: `${auxCellAddr}*${baseCellAddr}-IFERROR(${taxCellAddr},0)`,
        resultFallback: amount,
      }
      : { col: RULE_COL.amount, value: amount, numFmt: "#,##0" };

  const specs: CellSpec[] = [
    { col: RULE_COL.ordinal, value: ordinal },
    { col: RULE_COL.category, value: CATEGORY_LABEL[rule.cat] },
    { col: RULE_COL.name, value: rule.name },
    { col: RULE_COL.prevUnpaid, value: classMetrics.prevUnpaid, numFmt: "#,##0" },
    { col: RULE_COL.thisMonthUnpaid, value: classMetrics.thisMonthUnpaid, numFmt: "#,##0" },
    { col: RULE_COL.prevRecovered, value: classMetrics.prevRecoveredPay, numFmt: "#,##0" },
    { col: RULE_COL.thisMonthPaid, value: classMetrics.thisMonthPaid, numFmt: "#,##0" },
    { col: RULE_COL.baseKind, value: BASE_LABEL[rule.base] },
    {
      col: RULE_COL.baseVal,
      value: baseVal,
      // 베이스 종류별 포맷: hours는 소수 허용(예: 8.5시간), students는 정수 카운트,
      // 그 외(금액류)는 천단위 구분.
      numFmt:
        rule.base === "hours"
          ? "0.###"
          : rule.base === "students"
            ? "0"
            : "#,##0",
    },
    { col: RULE_COL.op, value: OP_LABEL[rule.op] },
    {
      col: RULE_COL.aux,
      value: auxValue,
      numFmt: rule.op === "rate" ? "0.###" : "#,##0",
    },
    { col: RULE_COL.tax, value: taxAmount, numFmt: "#,##0" },
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

  // 항목명 컬러 오버라이드 (같은 수업명은 동일 컬러 적용)
  if (nameColor) {
    const nameCell = sheet.getCell(row, RULE_COL.name);
    nameCell.font = { color: { argb: nameColor }, bold: true };
  }
}

interface RuleClassMetrics {
  prevUnpaid: number;
  thisMonthUnpaid: number;
  prevRecoveredPay: number;
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
  const thisMonthPaid = agg.classes.reduce((s, c) => s + c.pay, 0);
  return {
    prevUnpaid: agg.hoesu.hoesuTotal + agg.hoesu.minapTotal,
    thisMonthUnpaid: agg.unpaid,
    prevRecoveredPay: agg.hoesu.payTotal,
    thisMonthPaid,
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

function applyRuleColumnWidths(sheet: ExcelJS.Worksheet): void {
  RULE_COL_WIDTHS.forEach((width, index) => {
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
