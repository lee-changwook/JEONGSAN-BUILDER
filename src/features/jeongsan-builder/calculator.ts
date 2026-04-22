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
  revenueVAT: number;
  revenueNet: number;
  unpaid: number;
  hoesu: number;
  pay: number;
}

export interface ClassAggregate {
  classes: ClassItem[];
  revenueVAT: number;
  revenueNet: number;
  /** 강사 단위로 집계된 미납회수금. aggregateClasses는 알 수 없으므로 facade에서 주입. */
  hoesuRevenue: number;
  /** revenueVAT(당월 매출) + 해당 강사의 hoesuRevenue(이번 달 회수된 이전 미납분). */
  revenueWithUnpaid: number;
  hours: number;
  students: number;
  unpaid: number;
}

export type CategoryId = "revenue" | "plus" | "minus";

export type BaseId =
  | "revenueVAT"
  | "revenueNet"
  | "revenueWithUnpaid"
  | "hours"
  | "students"
  | "unpaidShare";

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
    hours: 0,
    // 매출 (수수료 포함) = 납부액 원본
    // 순매출 (수수료 제외) = PAY (카드 수수료 차감 후 학원 실입금)
    revenueVAT: block.totals.nabipTotal,
    revenueNet: block.totals.payTotal,
    unpaid: block.totals.minapTotal,
    hoesu: block.totals.hoesuTotal,
    pay: block.totals.payTotal,
  };
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

function buildTeachersAndClasses(
  parseResult: PayDocumentParseResult,
): {
  teachers: Teacher[];
  classesByTeacher: Map<string, ClassItem[]>;
  hoesuByTeacher: Map<string, number>;
} {
  // blockId 단위로 묶되 teacherName.value가 빈 값이면 제외.
  const blocksByTeacher = new Map<string, PayDocumentBlock[]>();
  const hoesuByTeacher = new Map<string, number>();

  for (const sheet of parseResult.sheets) {
    for (const block of sheet.blocks) {
      const teacherName = block.teacherName.value.trim();
      if (!teacherName) continue;

      if (block.kind === "minap_hoesu") {
        // 미납회수 시트는 강좌 리스트가 아닌 강사 단위 회수 합으로 집계.
        const teacherId = teacherIdOf(teacherName);
        hoesuByTeacher.set(
          teacherId,
          (hoesuByTeacher.get(teacherId) ?? 0) + block.totals.hoesuTotal,
        );
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

  return { teachers, classesByTeacher, hoesuByTeacher };
}

// ============================================================================
// Aggregate
// ============================================================================

function aggregateClasses(
  classes: ClassItem[],
  hoesuRevenue: number,
): ClassAggregate {
  const revenueVAT = classes.reduce((s, c) => s + c.revenueVAT, 0);
  return {
    classes,
    revenueVAT,
    revenueNet: classes.reduce((s, c) => s + c.revenueNet, 0),
    hoesuRevenue,
    // 매출 + 미납회수 = 당월 매출(VAT 포함, 학원 입금 기준) + 이번 달 회수된 이전 미납분
    revenueWithUnpaid: revenueVAT + hoesuRevenue,
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
    case "revenueWithUnpaid":
      return agg.revenueWithUnpaid;
    case "hours":
      return agg.hours;
    case "students":
      return agg.students;
    case "unpaidShare":
      return agg.unpaid;
  }
}

// ============================================================================
// Rule computation
// ============================================================================

function computeRule(
  rule: RuleItem,
  teacherClasses: ClassItem[],
  hoesuRevenue: number,
): RuleResult {
  let baseVal = 0;

  if (rule.cat === "revenue") {
    const selectedClasses = rule.classIds
      .map((cid) => teacherClasses.find((c) => c.id === cid))
      .filter((c): c is ClassItem => Boolean(c));
    const agg = aggregateClasses(selectedClasses, hoesuRevenue);
    baseVal = baseValueFromAgg(rule.base, agg);
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
  hoesuRevenue: number,
): TeacherSummary {
  let gross = 0;
  let deduct = 0;
  let taxable = 0;
  let revenueCount = 0;
  let plusCount = 0;
  let minusCount = 0;

  for (const rule of rules) {
    const { result } = computeRule(rule, teacherClasses, hoesuRevenue);
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
  hoesuByTeacher: Map<string, number>,
): MonthlySummary {
  let totalGross = 0;
  let totalDeduct = 0;
  let totalWithholding = 0;

  for (const teacher of teachers) {
    const rules = rulesByTeacher[teacher.id] ?? [];
    const classes = classesByTeacher.get(teacher.id) ?? [];
    const hoesu = hoesuByTeacher.get(teacher.id) ?? 0;
    const summary = computeTeacherSummary(rules, classes, hoesu);
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
  const { teachers, classesByTeacher, hoesuByTeacher } =
    buildTeachersAndClasses(parseResult);

  const rulesByTeacher: Record<string, RuleItem[]> =
    options?.initialRules ??
    teachers.reduce<Record<string, RuleItem[]>>((acc, teacher) => {
      acc[teacher.id] = seedRulesForTeacher(classesByTeacher.get(teacher.id) ?? []);
      return acc;
    }, {});

  return buildFacade({
    parseResult,
    teachers,
    classesByTeacher,
    hoesuByTeacher,
    rulesByTeacher,
  });
}

interface FacadeInternals {
  parseResult: PayDocumentParseResult;
  teachers: Teacher[];
  classesByTeacher: Map<string, ClassItem[]>;
  hoesuByTeacher: Map<string, number>;
  rulesByTeacher: Record<string, RuleItem[]>;
}

function buildFacade(state: FacadeInternals): SettlementCalculator {
  const {
    parseResult,
    teachers,
    classesByTeacher,
    hoesuByTeacher,
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
        hoesuByTeacher,
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
      return aggregateClasses(selected, hoesuByTeacher.get(teacherId) ?? 0);
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

    getRules: (teacherId) => rulesByTeacher[teacherId] ?? [],

    getRuleResult: (teacherId, ruleId) => {
      const rules = rulesByTeacher[teacherId] ?? [];
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return null;
      const teacherClasses = classesByTeacher.get(teacherId) ?? [];
      return computeRule(
        rule,
        teacherClasses,
        hoesuByTeacher.get(teacherId) ?? 0,
      );
    },

    getTeacherSummary: (teacherId) => {
      const rules = rulesByTeacher[teacherId];
      if (!rules) return null;
      const teacherClasses = classesByTeacher.get(teacherId) ?? [];
      return computeTeacherSummary(
        rules,
        teacherClasses,
        hoesuByTeacher.get(teacherId) ?? 0,
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
      // 신규 강사는 회수금이 없으므로 hoesuByTeacher는 그대로 사용 (get → 0 fallback).

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
      const nextHoesuByTeacher = new Map(hoesuByTeacher);
      nextHoesuByTeacher.delete(teacherId);
      const { [teacherId]: _removed, ...nextRulesByTeacher } = rulesByTeacher;
      void _removed;
      return buildFacade({
        ...state,
        teachers: teachers.filter((t) => t.id !== teacherId),
        classesByTeacher: nextClassesByTeacher,
        hoesuByTeacher: nextHoesuByTeacher,
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
