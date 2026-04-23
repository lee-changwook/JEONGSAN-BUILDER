/**
 * 정산 빌더 Calculator.
 *
 * 설계:
 *   - 클로저 기반 팩토리 함수(`createCalculator`)가 반환하는 퍼사드 객체.
 *   - 내부 순수 함수들(adapter / aggregate / rule / summary / seeder)을 조합해
 *     UI가 쓰기 편한 단일 API로 노출한다.
 *   - 모든 mutation은 **불변** — 새 Calculator 인스턴스를 반환한다.
 *
 * 계산 로직 레퍼런스: `src/app/jeongsan-builder-co-fi/data.ts`의 `computeRule`,
 * `computeClassAggregate`, `baseValueFromAgg`를 이식하되 이 파일에서 독립 관리한다.
 *
 * 매출 축 처리:
 *   - xlsx의 납부액(`nabipTotal`) = "매출 (수수료 포함)" (학생이 학원에 낸 총액)
 *   - xlsx의 PAY(`payTotal`)       = "순매출 (수수료 제외)" (카드사가 수수료 떼고 학원에 실입금한 금액)
 *   - 두 값은 xlsx가 이미 제공하므로 파생 계산(×/÷) 없이 1:1 매핑한다.
 *   - 내부 필드명 `revenueVAT`/`revenueNet`는 레거시 식별자이며, UI 라벨은 "수수료 포함/제외"로 표시.
 */

import type {
  PayDocumentBlock,
  PayDocumentParseResult,
  PayDocumentRow,
} from "@/features/jeongsan-builder/parser";

// ============================================================================
// Constants
// ============================================================================

export const WITHHOLDING_RATE = 0.033;

// ============================================================================
// Domain types
// ============================================================================

export interface Teacher {
  id: string;
  name: string;
  subjectLabel: string;
  classIds: string[];
}

export interface ClassItem {
  id: string;
  teacherId: string;
  name: string;
  section: string | null;
  description: string | null;
  statusText: string | null;
  students: number;
  hours: number;
  /** 당월 매출(수수료 미적용) = nabipTotal */
  revenueVAT: number;
  /** 당월 매출(수수료 적용) = payTotal */
  revenueNet: number;
  /** 당월 미납액 = minapTotal */
  unpaid: number;
  /** 당월 납부액(수수료 적용) = payTotal */
  pay: number;
  /**
   * 이 강좌에 매핑된 전월 미납회수 통계. minap_hoesu 시트의 각 row에 있는
   * linkedSueopName("연결 수업")로 매칭해서 누적한다. 매칭되지 않은 row는
   * 반영되지 않는다.
   */
  hoesu: HoesuStats;
}

/**
 * 강사의 미납회수(minap_hoesu) 시트에서 집계된 통계.
 *   - hoesuTotal: 전월 미납 중 이번 달에 회수된 금액(수수료 미적용, 원금)
 *   - minapTotal: 전월 미납 중 아직 회수되지 않은 금액(수수료 미적용)
 *   - payTotal:   hoesuTotal 중 수수료 적용(차감) 후 학원에 실입금된 금액
 *
 * "전월 미납액" = hoesuTotal + minapTotal (이전 달 미납 총액)
 */
export interface HoesuStats {
  hoesuTotal: number;
  minapTotal: number;
  payTotal: number;
}

export const EMPTY_HOESU_STATS: HoesuStats = {
  hoesuTotal: 0,
  minapTotal: 0,
  payTotal: 0,
};

export interface ClassAggregate {
  classes: ClassItem[];
  revenueVAT: number;
  revenueNet: number;
  /** 선택된 강좌들의 minap_hoesu 통계 합. 각 강좌에 linkedSueopName으로 매핑된 값만 포함. */
  hoesu: HoesuStats;
  /** revenueVAT(당월 매출, 수수료 미적용) + hoesu.hoesuTotal(전월 미납 회수분 원금). */
  revenueWithUnpaidVAT: number;
  /** revenueNet(당월 매출, 수수료 적용) + hoesu.payTotal(전월 미납 회수분 실입금). */
  revenueWithUnpaidNet: number;
  hours: number;
  students: number;
  unpaid: number;
}

export type CategoryId = "revenue" | "plus" | "minus";

export type BaseId =
  | "revenueVAT"
  | "revenueNet"
  | "revenueWithUnpaidVAT"
  | "revenueWithUnpaidNet"
  | "hours"
  | "students"
  | "unpaidShare"
  | "currentUnpaidNeg"
  | "direct";

/**
 * 미납회수 student row와 그것이 속한 block 참조. `getLinkedMinapHoesuRows`가 반환.
 * popover에서 "이 수업에 연결된 전월 미납회수 내역" 표시에 사용.
 */
export interface LinkedMinapHoesuRow {
  row: Extract<PayDocumentRow, { rowKind: "minap_hoesu_student" }>;
  sourceBlock: PayDocumentBlock;
}

export type OpId = "rate" | "fixed" | "multiply" | "add" | "custom";

export interface RuleItem {
  id: string;
  rule: string;
  cat: CategoryId;
  name: string;
  classIds: string[];
  base: BaseId;
  op: OpId;
  value: number;
  customBase: number;
  taxable: boolean;
  description?: string;
}

export interface RuleResult {
  baseVal: number;
  result: number;
  formula: string;
}

export interface TeacherSummary {
  itemCount: number;
  revenueCount: number;
  plusCount: number;
  minusCount: number;
  gross: number;
  deduct: number;
  settle: number;
  taxable: number;
  withholding: number;
  net: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  teacherCount: number;
  /** 학원이 받은 원천 매출 합. 모든 블록의 nabipTotal + minap_hoesu의 hoesuTotal. */
  totalRevenue: number;
  totalGross: number;
  totalDeduct: number;
  totalSettle: number;
  totalWithholding: number;
  totalPayout: number;
  confirmedCount: number;
  unconfirmedCount: number;
}

export interface CreateCalculatorOptions {
  initialRules?: Record<string, RuleItem[]>;
}

// ============================================================================
// Adapter — parseResult → domain objects
// ============================================================================

function teacherIdOf(teacherName: string): string {
  return `t-${teacherName.trim()}`;
}

function blockToClassItem(
  block: PayDocumentBlock,
  teacherId: string,
): ClassItem {
  const students = block.rows.filter(
    (row) => row.sugangsaengName.value.trim().length > 0,
  ).length;
  const descParts: string[] = [];
  if (block.scheduleText) descParts.push(block.scheduleText);
  const description = descParts.length > 0 ? descParts.join(" · ") : null;

  return {
    id: block.id,
    teacherId,
    name: block.sueopName,
    section: block.boonbanName,
    description,
    statusText: block.statusText,
    students,
    // 엑셀 헤더의 `시수: {숫자}`에서 파싱된 값. 헤더에 없으면 0으로 기본.
    hours: block.hours ?? 0,
    // 매출 (수수료 포함) = 납부액 원본
    // 순매출 (수수료 제외) = PAY (카드 수수료 차감 후 학원 실입금)
    revenueVAT: block.totals.nabipTotal,
    revenueNet: block.totals.payTotal,
    unpaid: block.totals.minapTotal,
    pay: block.totals.payTotal,
    // minap_hoesu는 별도 패스에서 linkedSueopName으로 매핑한다. 초기값은 빈 통계.
    hoesu: { hoesuTotal: 0, minapTotal: 0, payTotal: 0 },
  };
}

/** 강좌명 매칭 시 공백/특수문자를 제거한 정규화. */
function normalizeCourseName(name: string): string {
  return name.replace(/\s+/g, "").replace(/[·()|\-_]/g, "").toLowerCase();
}

/**
 * minap_hoesu row의 linkedSueopName("연결 수업")으로 강사의 강좌 중 매칭되는 것을 찾는다.
 *   1) 정규화 후 정확히 일치
 *   2) 부분 문자열 (class.name ⊇ linkedName 또는 그 반대)
 * 두 단계 중 먼저 매치되는 것을 반환. 못 찾으면 null.
 */
function findClassByLinkedName(
  classes: ClassItem[],
  linkedName: string,
): ClassItem | null {
  const q = normalizeCourseName(linkedName);
  if (!q) return null;
  const exact = classes.find((c) => normalizeCourseName(c.name) === q);
  if (exact) return exact;
  const contains = classes.find((c) => {
    const n = normalizeCourseName(c.name);
    return n.includes(q) || q.includes(n);
  });
  return contains ?? null;
}

/**
 * 첫 번째 블록에서 과목 라벨을 추정. 여러 블록이 있으면 최빈 과목.
 * 단순화를 위해 강좌명의 첫 2글자 또는 "물리/화학" 같은 토큰을 그대로 쓴다.
 */
function inferSubjectLabel(blocks: PayDocumentBlock[]): string {
  const first = blocks[0];
  if (!first) return "";
  // 강좌명에 과목 키워드가 앞에 오는 패턴(예: "과학한성물리A") 대비 단순 slice.
  const name = first.sueopName;
  // 영문/숫자/공백 제거된 앞부분을 우선 반환
  const head = name.replace(/[A-Za-z0-9\s·/|()]/g, "").slice(0, 6);
  return head || name.slice(0, 6);
}

/**
 * 매칭되지 않은 linkedSueopName에 대해 생성되는 synthetic ClassItem의 ID prefix.
 * 실제 블록 기반 id (`${sheetName}-${row}-${col}`)와 구분된다.
 */
const SYNTHETIC_CLASS_PREFIX = "syn:";

function syntheticClassId(teacherId: string, normalized: string): string {
  return `${SYNTHETIC_CLASS_PREFIX}${teacherId}:${normalized}`;
}

export function isSyntheticClassId(classId: string): boolean {
  return classId.startsWith(SYNTHETIC_CLASS_PREFIX);
}

function buildTeachersAndClasses(
  parseResult: PayDocumentParseResult,
): {
  teachers: Teacher[];
  classesByTeacher: Map<string, ClassItem[]>;
  /** classId → 해당 수업에 연결된 minap_hoesu student row 목록 (real + synthetic 모두 포함). */
  linkedRowsByClass: Map<string, LinkedMinapHoesuRow[]>;
} {
  // Pass 1: 일반(수업/보충) 블록을 강사별로 묶는다.
  const blocksByTeacher = new Map<string, PayDocumentBlock[]>();
  // Pass 2에서 사용할 미납회수 블록을 강사별로 분리 수집.
  const minapHoesuBlocksByTeacher = new Map<string, PayDocumentBlock[]>();

  for (const sheet of parseResult.sheets) {
    for (const block of sheet.blocks) {
      const teacherName = block.teacherName.value.trim();
      if (!teacherName) continue;

      if (block.kind === "minap_hoesu") {
        const list = minapHoesuBlocksByTeacher.get(teacherName);
        if (list) list.push(block);
        else minapHoesuBlocksByTeacher.set(teacherName, [block]);
        continue;
      }

      const existing = blocksByTeacher.get(teacherName);
      if (existing) {
        existing.push(block);
      } else {
        blocksByTeacher.set(teacherName, [block]);
      }
    }
  }

  const teachers: Teacher[] = [];
  const classesByTeacher = new Map<string, ClassItem[]>();
  const linkedRowsByClass = new Map<string, LinkedMinapHoesuRow[]>();

  for (const [teacherName, blocks] of blocksByTeacher) {
    const teacherId = teacherIdOf(teacherName);
    const classItems = blocks.map((block) =>
      blockToClassItem(block, teacherId),
    );
    teachers.push({
      id: teacherId,
      name: teacherName,
      subjectLabel: inferSubjectLabel(blocks),
      classIds: classItems.map((c) => c.id),
    });
    classesByTeacher.set(teacherId, classItems);
  }

  function pushLinkedRow(
    classId: string,
    row: Extract<PayDocumentRow, { rowKind: "minap_hoesu_student" }>,
    sourceBlock: PayDocumentBlock,
  ) {
    const existing = linkedRowsByClass.get(classId);
    if (existing) existing.push({ row, sourceBlock });
    else linkedRowsByClass.set(classId, [{ row, sourceBlock }]);
  }

  // Pass 2: 미납회수 시트의 각 student row를 linkedSueopName으로 강좌에 매핑해
  //        해당 강좌의 hoesu 통계에 누적한다. 매칭 실패한 경우에는
  //        synthetic 수업(미납만 있는 가상 수업)을 강사 아래에 생성해 귀속시킨다.
  for (const [teacherName, mhBlocks] of minapHoesuBlocksByTeacher) {
    const teacherId = teacherIdOf(teacherName);

    // 강사 리스트에 아직 없으면 신규로 추가 (수업 블록이 없는 강사에 미납회수만 있는 경우).
    let classes = classesByTeacher.get(teacherId);
    if (!classes) {
      teachers.push({
        id: teacherId,
        name: teacherName,
        subjectLabel: "",
        classIds: [],
      });
      classes = [];
      classesByTeacher.set(teacherId, classes);
    }
    let teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) {
      teacher = {
        id: teacherId,
        name: teacherName,
        subjectLabel: "",
        classIds: [],
      };
      teachers.push(teacher);
    }

    const syntheticByKey = new Map<string, ClassItem>();

    for (const block of mhBlocks) {
      for (const row of block.rows) {
        if (row.rowKind !== "minap_hoesu_student") continue;
        const linkedName = row.linkedSueopName.value.trim();
        const matched = findClassByLinkedName(classes, linkedName);

        const target: ClassItem | null = (() => {
          if (matched) return matched;
          if (!linkedName) return null;
          const key = normalizeCourseName(linkedName);
          if (!key) return null;
          const existing = syntheticByKey.get(key);
          if (existing) return existing;
          const synth: ClassItem = {
            id: syntheticClassId(teacherId, key),
            teacherId,
            name: linkedName,
            section: null,
            description: "미납회수 전용 (수업 데이터 없음)",
            statusText: null,
            students: 0,
            hours: 0,
            revenueVAT: 0,
            revenueNet: 0,
            unpaid: 0,
            pay: 0,
            hoesu: { hoesuTotal: 0, minapTotal: 0, payTotal: 0 },
          };
          syntheticByKey.set(key, synth);
          classes.push(synth);
          teacher.classIds.push(synth.id);
          return synth;
        })();

        if (!target) {
          if (typeof console !== "undefined") {
            console.warn(
              `[정산빌더] 미납회수 row에 연결 수업명이 없어 누락: teacher="${teacherName}"`,
            );
          }
          continue;
        }

        target.hoesu = {
          hoesuTotal: target.hoesu.hoesuTotal + row.hoesuAmount.value,
          minapTotal: target.hoesu.minapTotal + row.minapAmount.value,
          payTotal: target.hoesu.payTotal + row.payAmount.value,
        };
        pushLinkedRow(target.id, row, block);
      }
    }
  }

  return { teachers, classesByTeacher, linkedRowsByClass };
}

// ============================================================================
// Aggregate
// ============================================================================

function aggregateClasses(classes: ClassItem[]): ClassAggregate {
  const revenueVAT = classes.reduce((s, c) => s + c.revenueVAT, 0);
  const revenueNet = classes.reduce((s, c) => s + c.revenueNet, 0);
  const hoesu: HoesuStats = classes.reduce<HoesuStats>(
    (s, c) => ({
      hoesuTotal: s.hoesuTotal + c.hoesu.hoesuTotal,
      minapTotal: s.minapTotal + c.hoesu.minapTotal,
      payTotal: s.payTotal + c.hoesu.payTotal,
    }),
    { hoesuTotal: 0, minapTotal: 0, payTotal: 0 },
  );
  return {
    classes,
    revenueVAT,
    revenueNet,
    hoesu,
    // 매출 + 미납회수 (수수료 미적용) = 당월 매출(원금) + 이번 달 회수된 이전 미납분(원금)
    revenueWithUnpaidVAT: revenueVAT + hoesu.hoesuTotal,
    // 매출 + 미납회수 (수수료 적용) = 당월 매출(실입금) + 이번 달 회수된 이전 미납분(실입금)
    revenueWithUnpaidNet: revenueNet + hoesu.payTotal,
    hours: classes.reduce((s, c) => s + c.hours, 0),
    students: classes.reduce((s, c) => s + c.students, 0),
    unpaid: classes.reduce((s, c) => s + c.unpaid, 0),
  };
}

function baseValueFromAgg(base: BaseId, agg: ClassAggregate): number {
  switch (base) {
    case "revenueVAT":
      return agg.revenueVAT;
    case "revenueNet":
      return agg.revenueNet;
    case "revenueWithUnpaidVAT":
      return agg.revenueWithUnpaidVAT;
    case "revenueWithUnpaidNet":
      return agg.revenueWithUnpaidNet;
    case "hours":
      return agg.hours;
    case "students":
      return agg.students;
    case "unpaidShare":
      return agg.unpaid;
    case "currentUnpaidNeg":
      // 현재 미납금액(-): 당월 미납(agg.unpaid) + 전월 미납 중 아직 회수되지 않은 잔액
      // (agg.hoesu.minapTotal)의 합에 음수 부호를 붙여 반환. 주로 synthetic 수업에서
      // "미회수 금액을 월급에서 차감"하는 용도로 쓴다.
      return -(agg.unpaid + agg.hoesu.minapTotal);
    case "direct":
      // 직접 입력 베이스는 rule.customBase를 사용한다. computeRule에서 별도 처리.
      return 0;
  }
}

// ============================================================================
// Rule computation
// ============================================================================

function computeRule(
  rule: RuleItem,
  teacherClasses: ClassItem[],
): RuleResult {
  let baseVal = 0;

  if (rule.cat === "revenue") {
    if (rule.base === "direct") {
      baseVal = rule.customBase;
    } else {
      const selectedClasses = rule.classIds
        .map((cid) => teacherClasses.find((c) => c.id === cid))
        .filter((c): c is ClassItem => Boolean(c));
      const agg = aggregateClasses(selectedClasses);
      baseVal = baseValueFromAgg(rule.base, agg);
    }
  } else {
    baseVal = rule.customBase;
  }

  let result = 0;
  switch (rule.op) {
    case "rate":
      result = baseVal * rule.value;
      break;
    case "fixed":
      result = baseVal;
      break;
    case "multiply":
      result = baseVal * rule.value;
      break;
    case "add":
      result = baseVal + rule.value;
      break;
    case "custom":
      // 1차 범위에선 custom 미지원 (co-fi 데모에 있던 MAX/IF 조합은 다음 턴).
      result = baseVal;
      break;
  }

  if (rule.cat === "minus" && result > 0) {
    result = -result;
  }

  return {
    baseVal,
    result: Math.round(result),
    formula: formulaStr(rule, baseVal),
  };
}

function formulaStr(rule: RuleItem, baseVal: number): string {
  const b = baseVal.toLocaleString();
  switch (rule.op) {
    case "rate":
      return `${b} × ${rule.value}`;
    case "fixed":
      return `${b}`;
    case "multiply":
      return `${b} × ${rule.value.toLocaleString()}`;
    case "add":
      return `${b} + ${rule.value.toLocaleString()}`;
    case "custom":
      return "커스텀";
  }
}

// ============================================================================
// Rule seeder — 초기 자동 생성 규칙 (하이브리드 전략)
// ============================================================================

/**
 * 강사 처음 진입 시 자동으로 만들어주는 규칙들.
 * - 수업 기반(revenue): 각 강좌마다 revenueNet × 0.6 기본 rule 하나씩.
 * - 지급(plus), 차감(minus): 빈 상태 — 사용자가 직접 "항목 추가"로 추가.
 */
function seedRulesForTeacher(classes: ClassItem[]): RuleItem[] {
  return classes.map((cls, index) => ({
    id: `r-${cls.id}`,
    rule: `R${index + 1}`,
    cat: "revenue",
    name: `${cls.name} 수업료`,
    classIds: [cls.id],
    base: "revenueNet",
    op: "rate",
    value: 0.6,
    customBase: 0,
    taxable: true,
  }));
}

// ============================================================================
// Summary
// ============================================================================

function computeTeacherSummary(
  rules: RuleItem[],
  teacherClasses: ClassItem[],
): TeacherSummary {
  let gross = 0;
  let deduct = 0;
  let taxable = 0;
  let revenueCount = 0;
  let plusCount = 0;
  let minusCount = 0;

  for (const rule of rules) {
    const { result } = computeRule(rule, teacherClasses);
    if (rule.cat === "revenue") {
      revenueCount += 1;
      gross += result;
    } else if (rule.cat === "plus") {
      plusCount += 1;
      gross += result;
    } else {
      minusCount += 1;
      deduct += result;
    }
    if (rule.taxable) {
      taxable += result;
    }
  }

  const settle = gross + deduct;
  const withholding = -Math.round(Math.max(taxable, 0) * WITHHOLDING_RATE);
  const net = settle + withholding;

  return {
    itemCount: rules.length,
    revenueCount,
    plusCount,
    minusCount,
    gross,
    deduct,
    settle,
    taxable,
    withholding,
    net,
  };
}

function computeMonthlySummary(
  parseResult: PayDocumentParseResult,
  teachers: Teacher[],
  rulesByTeacher: Record<string, RuleItem[]>,
  classesByTeacher: Map<string, ClassItem[]>,
): MonthlySummary {
  let totalGross = 0;
  let totalDeduct = 0;
  let totalWithholding = 0;

  for (const teacher of teachers) {
    const rules = rulesByTeacher[teacher.id] ?? [];
    const classes = classesByTeacher.get(teacher.id) ?? [];
    const summary = computeTeacherSummary(rules, classes);
    totalGross += summary.gross;
    totalDeduct += summary.deduct;
    totalWithholding += summary.withholding;
  }

  // 전체 매출: 학원이 받은 원천 매출 합 (모든 블록의 nabipTotal + 미납회수 시트의 hoesuTotal)
  let totalRevenue = 0;
  for (const sheet of parseResult.sheets) {
    for (const block of sheet.blocks) {
      if (block.kind === "minap_hoesu") {
        totalRevenue += block.totals.hoesuTotal;
      } else {
        totalRevenue += block.totals.nabipTotal;
      }
    }
  }

  const totalSettle = totalGross + totalDeduct;
  const totalPayout = totalSettle + totalWithholding;

  return {
    year: parseResult.year,
    month: parseResult.month,
    teacherCount: teachers.length,
    totalRevenue,
    totalGross,
    totalDeduct,
    totalSettle,
    totalWithholding,
    totalPayout,
    confirmedCount: 0,
    unconfirmedCount: teachers.length,
  };
}

// ============================================================================
// Facade
// ============================================================================

export interface SettlementCalculator {
  // 메타
  getYear(): number;
  getMonth(): number;
  getSourceFileName(): string;
  getMonthlySummary(): MonthlySummary;

  // 강사 & 강좌
  getTeachers(): Teacher[];
  getTeacher(teacherId: string): Teacher | null;
  getClasses(teacherId: string): ClassItem[];
  getClass(teacherId: string, classId: string): ClassItem | null;
  getClassAggregate(teacherId: string, classIds: string[]): ClassAggregate;

  // 원본 블록 조회 (수업 상세 툴팁 등에서 학생 행까지 필요할 때)
  getBlock(blockId: string): PayDocumentBlock | null;
  getBlocksByClassIds(classIds: string[]): PayDocumentBlock[];
  /** 해당 수업(실/합성)에 연결된 전월 미납회수 student row 목록. */
  getLinkedMinapHoesuRows(classId: string): LinkedMinapHoesuRow[];

  // 규칙
  getRules(teacherId: string): RuleItem[];
  getRuleResult(teacherId: string, ruleId: string): RuleResult | null;
  getTeacherSummary(teacherId: string): TeacherSummary | null;

  // 불변 mutation
  addTeacher(input: {
    name: string;
    subjectLabel?: string;
  }): { calculator: SettlementCalculator; teacherId: string };
  removeTeacher(teacherId: string): SettlementCalculator;
  addRule(teacherId: string, rule: RuleItem): SettlementCalculator;
  updateRule(
    teacherId: string,
    ruleId: string,
    patch: Partial<RuleItem>,
  ): SettlementCalculator;
  removeRule(teacherId: string, ruleId: string): SettlementCalculator;
  bulkSetAux(
    teacherId: string,
    ruleIds: string[],
    value: number,
  ): SettlementCalculator;
  bulkSetCustomBase(
    teacherId: string,
    ruleIds: string[],
    customBase: number,
  ): SettlementCalculator;
  setTaxable(
    teacherId: string,
    ruleId: string,
    taxable: boolean,
  ): SettlementCalculator;

  // 내부 상태 스냅샷 (export 등에서 사용 예정)
  snapshot(): CalculatorSnapshot;
}

export interface CalculatorSnapshot {
  parseResult: PayDocumentParseResult;
  rulesByTeacher: Record<string, RuleItem[]>;
}

export function createCalculator(
  parseResult: PayDocumentParseResult,
  options?: CreateCalculatorOptions,
): SettlementCalculator {
  const { teachers, classesByTeacher, linkedRowsByClass } =
    buildTeachersAndClasses(parseResult);

  const rulesByTeacher: Record<string, RuleItem[]> =
    options?.initialRules ??
    teachers.reduce<Record<string, RuleItem[]>>((acc, teacher) => {
      // synthetic 수업은 매출 0이라 seed rule(revenueNet × 0.6)을 만들어도 의미가 없어 제외.
      const seedable = (classesByTeacher.get(teacher.id) ?? []).filter(
        (c) => !isSyntheticClassId(c.id),
      );
      acc[teacher.id] = seedRulesForTeacher(seedable);
      return acc;
    }, {});

  return buildFacade({
    parseResult,
    teachers,
    classesByTeacher,
    linkedRowsByClass,
    rulesByTeacher,
  });
}

interface FacadeInternals {
  parseResult: PayDocumentParseResult;
  teachers: Teacher[];
  classesByTeacher: Map<string, ClassItem[]>;
  linkedRowsByClass: Map<string, LinkedMinapHoesuRow[]>;
  rulesByTeacher: Record<string, RuleItem[]>;
}

function buildFacade(state: FacadeInternals): SettlementCalculator {
  const {
    parseResult,
    teachers,
    classesByTeacher,
    linkedRowsByClass,
    rulesByTeacher,
  } = state;

  function withRules(
    teacherId: string,
    nextRules: RuleItem[],
  ): SettlementCalculator {
    return buildFacade({
      ...state,
      rulesByTeacher: { ...rulesByTeacher, [teacherId]: nextRules },
    });
  }

  return {
    getYear: () => parseResult.year,
    getMonth: () => parseResult.month,
    getSourceFileName: () => parseResult.sourceFileName,

    getMonthlySummary: () =>
      computeMonthlySummary(
        parseResult,
        teachers,
        rulesByTeacher,
        classesByTeacher,
      ),

    getTeachers: () => teachers,

    getTeacher: (teacherId) => teachers.find((t) => t.id === teacherId) ?? null,

    getClasses: (teacherId) => classesByTeacher.get(teacherId) ?? [],

    getClass: (teacherId, classId) => {
      const classes = classesByTeacher.get(teacherId) ?? [];
      return classes.find((c) => c.id === classId) ?? null;
    },

    getClassAggregate: (teacherId, classIds) => {
      const teacherClasses = classesByTeacher.get(teacherId) ?? [];
      const selected = classIds
        .map((cid) => teacherClasses.find((c) => c.id === cid))
        .filter((c): c is ClassItem => Boolean(c));
      return aggregateClasses(selected);
    },

    getBlock: (blockId) => {
      for (const sheet of parseResult.sheets) {
        const found = sheet.blocks.find((b) => b.id === blockId);
        if (found) return found;
      }
      return null;
    },

    getBlocksByClassIds: (classIds) => {
      const idSet = new Set(classIds);
      const result: PayDocumentBlock[] = [];
      for (const sheet of parseResult.sheets) {
        for (const block of sheet.blocks) {
          if (idSet.has(block.id)) result.push(block);
        }
      }
      return result;
    },

    getLinkedMinapHoesuRows: (classId) =>
      linkedRowsByClass.get(classId) ?? [],

    getRules: (teacherId) => rulesByTeacher[teacherId] ?? [],

    getRuleResult: (teacherId, ruleId) => {
      const rules = rulesByTeacher[teacherId] ?? [];
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return null;
      const teacherClasses = classesByTeacher.get(teacherId) ?? [];
      return computeRule(rule, teacherClasses);
    },

    getTeacherSummary: (teacherId) => {
      const rules = rulesByTeacher[teacherId];
      if (!rules) return null;
      const teacherClasses = classesByTeacher.get(teacherId) ?? [];
      return computeTeacherSummary(
        rules,
        teacherClasses,
      );
    },

    addTeacher: ({ name, subjectLabel }) => {
      const trimmed = name.trim();
      const baseId = teacherIdOf(trimmed || "신규");
      let teacherId = baseId;
      let suffix = 2;
      while (teachers.some((t) => t.id === teacherId)) {
        teacherId = `${baseId}-${suffix++}`;
      }

      const nextTeacher: Teacher = {
        id: teacherId,
        name: trimmed || "신규 강사",
        subjectLabel: subjectLabel?.trim() ?? "",
        classIds: [],
      };

      const nextClassesByTeacher = new Map(classesByTeacher);
      nextClassesByTeacher.set(teacherId, []);
      // 신규 강사는 회수금 매핑 대상이 없으므로 추가 상태 없음.

      const calculator = buildFacade({
        ...state,
        teachers: [...teachers, nextTeacher],
        classesByTeacher: nextClassesByTeacher,
        rulesByTeacher: { ...rulesByTeacher, [teacherId]: [] },
      });

      return { calculator, teacherId };
    },

    removeTeacher: (teacherId) => {
      if (!teachers.some((t) => t.id === teacherId)) {
        return buildFacade(state);
      }
      const nextClassesByTeacher = new Map(classesByTeacher);
      nextClassesByTeacher.delete(teacherId);
      const { [teacherId]: _removed, ...nextRulesByTeacher } = rulesByTeacher;
      void _removed;
      return buildFacade({
        ...state,
        teachers: teachers.filter((t) => t.id !== teacherId),
        classesByTeacher: nextClassesByTeacher,
        rulesByTeacher: nextRulesByTeacher,
      });
    },

    addRule: (teacherId, rule) => {
      const current = rulesByTeacher[teacherId] ?? [];
      return withRules(teacherId, [...current, rule]);
    },

    updateRule: (teacherId, ruleId, patch) => {
      const current = rulesByTeacher[teacherId] ?? [];
      const next = current.map((r) => (r.id === ruleId ? { ...r, ...patch } : r));
      return withRules(teacherId, next);
    },

    removeRule: (teacherId, ruleId) => {
      const current = rulesByTeacher[teacherId] ?? [];
      return withRules(
        teacherId,
        current.filter((r) => r.id !== ruleId),
      );
    },

    bulkSetAux: (teacherId, ruleIds, value) => {
      const idSet = new Set(ruleIds);
      const current = rulesByTeacher[teacherId] ?? [];
      const next = current.map((r) => (idSet.has(r.id) ? { ...r, value } : r));
      return withRules(teacherId, next);
    },

    bulkSetCustomBase: (teacherId, ruleIds, customBase) => {
      const idSet = new Set(ruleIds);
      const current = rulesByTeacher[teacherId] ?? [];
      const next = current.map((r) =>
        idSet.has(r.id) ? { ...r, customBase } : r,
      );
      return withRules(teacherId, next);
    },

    setTaxable: (teacherId, ruleId, taxable) => {
      const current = rulesByTeacher[teacherId] ?? [];
      const next = current.map((r) => (r.id === ruleId ? { ...r, taxable } : r));
      return withRules(teacherId, next);
    },

    snapshot: () => ({
      parseResult,
      rulesByTeacher,
    }),
  };
}

// ============================================================================
// Format helpers (calculator와 함께 쓰이는 통화 포맷터)
// ============================================================================

export function formatKRW(value: number): string {
  if (value === 0) return "₩ 0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value).toLocaleString("ko-KR");
  return `${sign}₩ ${abs}`;
}

/**
 * 요약 표시용 축약 포맷. 예: 42,742,000 → "₩42.7M"
 */
export function formatCompactKRW(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 100_000_000) {
    return `${sign}₩${(abs / 100_000_000).toFixed(1)}억`;
  }
  if (abs >= 10_000_000) {
    return `${sign}₩${Math.round(abs / 1_000_000)}M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}₩${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}₩${Math.round(abs / 1_000)}K`;
  }
  return `${sign}₩${abs}`;
}
