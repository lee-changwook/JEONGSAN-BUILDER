// ---- Types ----

export type CategoryId = 'revenue' | 'plus' | 'minus';
export type BaseId =
  | 'revenueVAT'
  | 'revenueNet'
  | 'revenueWithUnpaid'
  | 'hours'
  | 'students'
  | 'unpaidShare';
export type OpId = 'rate' | 'fixed' | 'multiply' | 'add' | 'custom';

export interface Teacher {
  id: string;
  name: string;
  dept: string;
  classroom: string;
  net: number;
  status: 'done' | 'draft';
}

export interface ClassItem {
  id: string;
  name: string;
  section?: string;
  description?: string;
  students: number;
  hours: number;
  revenueVAT: number;
  revenueNet: number;
  unpaid: number;
  cost: number;
}

export interface Assistant {
  id: string;
  name: string;
  role: string;
  monthlySalary: number;
}

export interface BaseOption {
  id: BaseId;
  name: string;
  desc: string;
  unit: string;
}

export interface OpOption {
  id: OpId;
  name: string;
  desc: string;
  needsAux: boolean;
  auxLabel?: string;
  auxHint?: string;
}

export interface CategoryDef {
  id: CategoryId;
  name: string;
  badge: string;
  desc: string;
  badgeBg: string;
  needsClass: boolean;
  baseOptions: BaseOption[];
  opOptions: OpOption[];
  defaultTaxable: boolean;
}

export interface RuleItem {
  id: string;
  rule: string;
  cat: CategoryId;
  name: string;
  classIds: string[];
  base: BaseId;
  op: OpId;
  value: number;
  result: number;
  customBase: number;
  taxable: boolean;
  description?: string;
}

// ---- Constants ----

export const ALL_OPS: OpOption[] = [
  { id: 'rate', name: '비율', desc: '베이스 x 비율', needsAux: true, auxLabel: '비율', auxHint: '0~1 (0.6 = 60%)' },
  { id: 'fixed', name: '고정', desc: '베이스 값 그대로', needsAux: false },
  { id: 'multiply', name: '곱하기', desc: '베이스 x 숫자', needsAux: true, auxLabel: '배수', auxHint: '숫자 (예: 시급 45000)' },
  { id: 'add', name: '더하기', desc: '베이스 + 숫자', needsAux: true, auxLabel: '가감값', auxHint: '음수 가능' },
  { id: 'custom', name: '커스텀 (데모)', desc: 'MAX/IF + 복합 연산', needsAux: false },
];

export const REVENUE_BASES: BaseOption[] = [
  { id: 'revenueVAT', name: '매출 (VAT포함)', desc: '부가세 포함 총 매출', unit: '원' },
  { id: 'revenueNet', name: '순매출 (VAT제외)', desc: 'VAT 제외한 순매출', unit: '원' },
  { id: 'revenueWithUnpaid', name: '매출 + 미납회수', desc: '당월 매출 + 이전 미납 회수분', unit: '원' },
  { id: 'hours', name: '시수', desc: '수업 진행 총 시간', unit: '시간' },
  { id: 'students', name: '학생 수', desc: '수업 등록 학생 수', unit: '명' },
  { id: 'unpaidShare', name: '미납금', desc: '수업의 미납금 합계', unit: '원' },
];

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  revenue: {
    id: 'revenue',
    name: '수업 기반',
    badge: 'RV',
    desc: '수업 ERP 데이터(매출/시수/학생수) 기반 정산',
    badgeBg: '#ffe066',
    needsClass: true,
    defaultTaxable: true,
    baseOptions: REVENUE_BASES,
    opOptions: ALL_OPS,
  },
  plus: {
    id: 'plus',
    name: '지급 (+)',
    badge: '+',
    desc: '월급/수당/보너스 등 수기 입력 지급',
    badgeBg: '#7ec89a',
    needsClass: false,
    defaultTaxable: true,
    baseOptions: [],
    opOptions: ALL_OPS,
  },
  minus: {
    id: 'minus',
    name: '차감 (-)',
    badge: '-',
    desc: '미납금/조교비/비용 등 수기 입력 차감',
    badgeBg: '#f4a49a',
    needsClass: false,
    defaultTaxable: false,
    baseOptions: [],
    opOptions: ALL_OPS,
  },
};

// ---- Mock Data ----

export const teachers: Teacher[] = [
  { id: 'T001', name: '김명훈T', dept: '고등 물리', classroom: '과탐한성물리', net: 42691116, status: 'done' },
  { id: 'T002', name: '정수현T', dept: '고등 화학', classroom: '과탐한성화학', net: 36939400, status: 'done' },
  { id: 'T003', name: '박지훈T', dept: '고등 수학', classroom: '수학심화', net: 50380700, status: 'done' },
  { id: 'T004', name: '이민영T', dept: '고등 영어', classroom: '영어문법', net: 28564680, status: 'done' },
  { id: 'T005', name: '조현우T', dept: '중등 수학', classroom: '중1 수학', net: 18131250, status: 'draft' },
  { id: 'T006', name: '강민석T', dept: '특강', classroom: '수시특강', net: 6614280, status: 'draft' },
  { id: 'T007', name: '류지현T', dept: '조교', classroom: '물리/화학', net: 5028400, status: 'done' },
  { id: 'T008', name: '최서연T', dept: '강사', classroom: '한국사', net: 21370700, status: 'done' },
  { id: 'T009', name: '민지호T', dept: '강사', classroom: '과학', net: 30750600, status: 'done' },
  { id: 'T010', name: '송하늘T', dept: '강사', classroom: '국어', net: 26592500, status: 'done' },
  { id: 'T011', name: '황재현T', dept: '강사', classroom: '입시', net: 14137540, status: 'draft' },
  { id: 'T012', name: '임수빈T', dept: '강사', classroom: '영어회화', net: 18276300, status: 'done' },
];

export const classCatalog: Record<string, ClassItem[]> = {
  T001: [
    { id: 'C001', name: '과탐한성물리A', section: 'A', description: '고3 물리 정규반', students: 24, hours: 16, revenueVAT: 21983280, revenueNet: 19984800, unpaid: 1200000, cost: 0 },
    { id: 'C002', name: '과탐한성물리B', section: 'B', description: '고2 물리 정규반', students: 18, hours: 12, revenueVAT: 16500000, revenueNet: 15000000, unpaid: 500000, cost: 0 },
    { id: 'C003', name: '과탐한성물리특강', section: '특강', description: '심화 특강반', students: 15, hours: 12, revenueVAT: 8613880, revenueNet: 7830800, unpaid: 0, cost: 0 },
    { id: 'C004', name: '겨울특강 물리심화', section: '겨울', description: '겨울 집중 특강', students: 22, hours: 20, revenueVAT: 12100000, revenueNet: 11000000, unpaid: 300000, cost: 0 },
    { id: 'C005', name: '모의고사 대비반', section: '모의', description: '수능 모의고사 대비', students: 28, hours: 8, revenueVAT: 6160000, revenueNet: 5600000, unpaid: 0, cost: 0 },
  ],
  T002: [
    { id: 'C101', name: '과탐한성화학A', section: 'A', description: '고3 화학 정규반', students: 32, hours: 20, revenueVAT: 76400000, revenueNet: 69454545, unpaid: 0, cost: 0 },
    { id: 'C102', name: '과탐한성화학B', section: 'B', description: '고2 화학 정규반', students: 20, hours: 16, revenueVAT: 44000000, revenueNet: 40000000, unpaid: 800000, cost: 0 },
  ],
  T003: [
    { id: 'C201', name: '수학심화 상', section: '상', description: '고3 상위권 심화', students: 45, hours: 32, revenueVAT: 85969231, revenueNet: 78153846, unpaid: 0, cost: 0 },
    { id: 'C202', name: '수학심화 하', section: '하', description: '고3 중위권 심화', students: 38, hours: 28, revenueVAT: 65000000, revenueNet: 59090909, unpaid: 500000, cost: 0 },
    { id: 'C203', name: '수능대비 수학', section: '수능', description: '수능 직전 대비', students: 50, hours: 24, revenueVAT: 55000000, revenueNet: 50000000, unpaid: 0, cost: 0 },
  ],
  T004: [
    { id: 'C301', name: '영어문법 1타', section: 'A', description: '고3 영어 정규반', students: 28, hours: 18, revenueVAT: 52409677, revenueNet: 47645161, unpaid: 0, cost: 0 },
    { id: 'C302', name: '영어독해 심화', section: 'B', description: '고3 독해 심화', students: 24, hours: 16, revenueVAT: 40000000, revenueNet: 36363636, unpaid: 400000, cost: 0 },
  ],
  T005: [
    { id: 'C401', name: '중1 수학심화 A', section: 'A', description: '중1 심화반', students: 15, hours: 12, revenueVAT: 34375000, revenueNet: 31250000, unpaid: 0, cost: 0 },
    { id: 'C402', name: '중1 수학기본', section: 'B', description: '중1 기본반', students: 20, hours: 10, revenueVAT: 22000000, revenueNet: 20000000, unpaid: 0, cost: 0 },
  ],
  T006: [
    { id: 'C501', name: '수시특강 패키지', section: '특강', description: '수시 대비 집중 특강', students: 25, hours: 24, revenueVAT: 15000000, revenueNet: 13636363, unpaid: 0, cost: 0 },
  ],
  T007: [
    { id: 'C601', name: '조교 물리 1반', section: '물리', description: '물리 담당 조교', students: 0, hours: 74, revenueVAT: 0, revenueNet: 0, unpaid: 0, cost: 0 },
    { id: 'C602', name: '조교 화학 1반', section: '화학', description: '화학 담당 조교', students: 0, hours: 74, revenueVAT: 0, revenueNet: 0, unpaid: 0, cost: 0 },
  ],
  T008: [
    { id: 'C701', name: '한국사 기본', section: 'A', description: '고등 한국사', students: 22, hours: 14, revenueVAT: 41913793, revenueNet: 38103448, unpaid: 0, cost: 0 },
  ],
  T009: [
    { id: 'C801', name: '과학 통합', section: 'A', description: '고1 통합과학', students: 38, hours: 24, revenueVAT: 54656250, revenueNet: 49687500, unpaid: 0, cost: 0 },
  ],
  T010: [
    { id: 'C901', name: '국어/논술 A', section: 'A', description: '고3 국어 + 논술', students: 26, hours: 16, revenueVAT: 49590164, revenueNet: 45081967, unpaid: 0, cost: 0 },
  ],
  T011: [
    { id: 'C1001', name: '입시컨설팅', section: 'A', description: '1:1 입시 컨설팅', students: 8, hours: 8, revenueVAT: 27257627, revenueNet: 24779661, unpaid: 0, cost: 0 },
  ],
  T012: [
    { id: 'C1101', name: '영어회화 기본', section: 'A', description: '성인 영어회화', students: 20, hours: 14, revenueVAT: 34650000, revenueNet: 31500000, unpaid: 0, cost: 0 },
  ],
};

export const assistants: Assistant[] = [
  { id: 'A001', name: '류지현T', role: '물리/화학 조교', monthlySalary: 988260 },
  { id: 'A002', name: '안도현', role: '수학 조교', monthlySalary: 850000 },
  { id: 'A003', name: '박선우', role: '영어 조교', monthlySalary: 720000 },
];

export const initialRuleData: Record<string, RuleItem[]> = {
  T001: [
    { id: 'r1', rule: 'R1', cat: 'revenue', name: '과탐한성물리A 수업료', classIds: ['C001'], base: 'revenueNet', op: 'rate', value: 0.6, customBase: 0, taxable: true, result: 0 },
    { id: 'r2', rule: 'R2', cat: 'revenue', name: '과탐한성물리B 수업료', classIds: ['C002'], base: 'revenueNet', op: 'rate', value: 0.6, customBase: 0, taxable: true, result: 0 },
    { id: 'r3', rule: 'R3', cat: 'revenue', name: '물리특강 시급제', classIds: ['C003'], base: 'hours', op: 'multiply', value: 45000, customBase: 0, taxable: true, result: 0 },
    { id: 'r4', rule: 'R4', cat: 'revenue', name: '겨울 특강반', classIds: ['C004'], base: 'revenueNet', op: 'rate', value: 0.58, customBase: 0, taxable: true, result: 0 },
    { id: 'r5', rule: 'R5', cat: 'revenue', name: '모의고사 대비반', classIds: ['C005'], base: 'revenueNet', op: 'rate', value: 0.55, customBase: 0, taxable: true, result: 0 },
    { id: 'r6', rule: 'R6', cat: 'plus', name: '물리과 부장 수당', classIds: [], base: 'revenueNet', op: 'fixed', value: 0, customBase: 500000, taxable: true, result: 0, description: '부장 월 고정 수당' },
    { id: 'r7', rule: 'R7', cat: 'plus', name: '진단고사 운영', classIds: [], base: 'revenueNet', op: 'fixed', value: 0, customBase: 1000000, taxable: true, result: 0 },
    { id: 'r8', rule: 'R8', cat: 'plus', name: '우수 강사 격려금', classIds: [], base: 'revenueNet', op: 'fixed', value: 0, customBase: 12500000, taxable: true, result: 0 },
    { id: 'r9', rule: 'R9', cat: 'minus', name: '조교B 급여 분배', classIds: [], base: 'revenueNet', op: 'rate', value: 0.7, customBase: 988260, taxable: false, result: 0, description: '류지현 조교 급여 70% 분담' },
    { id: 'r10', rule: 'R10', cat: 'minus', name: '미납금 분배', classIds: [], base: 'revenueNet', op: 'rate', value: 0.6, customBase: 1700000, taxable: false, result: 0, description: 'C001+C002 미납 회수분의 60%' },
    { id: 'r11', rule: 'R11', cat: 'minus', name: '교재 복사비', classIds: [], base: 'revenueNet', op: 'fixed', value: 0, customBase: 150000, taxable: false, result: 0 },
  ],
  T002: [
    { id: 'r1', rule: 'R1', cat: 'revenue', name: '과탐한성화학A 수업료', classIds: ['C101'], base: 'revenueNet', op: 'rate', value: 0.55, customBase: 0, taxable: true, result: 0 },
    { id: 'r2', rule: 'R2', cat: 'revenue', name: '과탐한성화학B 수업료', classIds: ['C102'], base: 'revenueNet', op: 'rate', value: 0.55, customBase: 0, taxable: true, result: 0 },
    { id: 'r3', rule: 'R3', cat: 'plus', name: '화학과 수석 수당', classIds: [], base: 'revenueNet', op: 'fixed', value: 0, customBase: 800000, taxable: true, result: 0 },
    { id: 'r4', rule: 'R4', cat: 'minus', name: '미납금 분배', classIds: [], base: 'revenueNet', op: 'rate', value: 0.55, customBase: 800000, taxable: false, result: 0, description: 'C102 미납 800,000의 55%' },
  ],
  T003: [
    { id: 'r1', rule: 'R1', cat: 'revenue', name: '수학심화 상', classIds: ['C201'], base: 'revenueNet', op: 'rate', value: 0.65, customBase: 0, taxable: true, result: 0 },
    { id: 'r2', rule: 'R2', cat: 'revenue', name: '수학심화 하', classIds: ['C202'], base: 'revenueNet', op: 'rate', value: 0.62, customBase: 0, taxable: true, result: 0 },
    { id: 'r3', rule: 'R3', cat: 'revenue', name: '수능대비', classIds: ['C203'], base: 'revenueNet', op: 'rate', value: 0.6, customBase: 0, taxable: true, result: 0 },
    { id: 'r4', rule: 'R4', cat: 'plus', name: '최소보장 (MIN)', classIds: [], base: 'revenueNet', op: 'fixed', value: 0, customBase: 1300000, taxable: true, result: 0 },
  ],
  T004: [
    { id: 'r1', rule: 'R1', cat: 'revenue', name: '영어문법 1타', classIds: ['C301'], base: 'revenueNet', op: 'rate', value: 0.62, customBase: 0, taxable: true, result: 0 },
    { id: 'r2', rule: 'R2', cat: 'revenue', name: '영어독해 심화', classIds: ['C302'], base: 'revenueNet', op: 'rate', value: 0.6, customBase: 0, taxable: true, result: 0 },
  ],
  T005: [
    { id: 'r1', rule: 'R1', cat: 'revenue', name: '중1 수학심화 A', classIds: ['C401'], base: 'revenueNet', op: 'rate', value: 0.6, customBase: 0, taxable: true, result: 0 },
    { id: 'r2', rule: 'R2', cat: 'revenue', name: '중1 수학기본', classIds: ['C402'], base: 'revenueNet', op: 'rate', value: 0.55, customBase: 0, taxable: true, result: 0 },
  ],
  T006: [
    { id: 'r1', rule: 'R1', cat: 'revenue', name: '특강 시급제', classIds: ['C501'], base: 'hours', op: 'multiply', value: 45000, customBase: 0, taxable: true, result: 0 },
    { id: 'r2', rule: 'R2', cat: 'revenue', name: '특강 수업료 비율', classIds: ['C501'], base: 'revenueNet', op: 'rate', value: 0.4, customBase: 0, taxable: true, result: 0 },
  ],
  T007: [
    { id: 'r1', rule: 'R1', cat: 'plus', name: '조교 월급', classIds: [], base: 'revenueNet', op: 'fixed', value: 0, customBase: 5200000, taxable: true, result: 0 },
  ],
  T008: [
    { id: 'r1', rule: 'R1', cat: 'revenue', name: '한국사 기본', classIds: ['C701'], base: 'revenueNet', op: 'rate', value: 0.58, customBase: 0, taxable: true, result: 0 },
  ],
  T009: [
    { id: 'r1', rule: 'R1', cat: 'revenue', name: '과학 통합', classIds: ['C801'], base: 'revenueNet', op: 'rate', value: 0.64, customBase: 0, taxable: true, result: 0 },
  ],
  T010: [
    { id: 'r1', rule: 'R1', cat: 'revenue', name: '국어/논술 A', classIds: ['C901'], base: 'revenueNet', op: 'rate', value: 0.61, customBase: 0, taxable: true, result: 0 },
  ],
  T011: [
    { id: 'r1', rule: 'R1', cat: 'revenue', name: '입시컨설팅', classIds: ['C1001'], base: 'revenueNet', op: 'rate', value: 0.59, customBase: 0, taxable: true, result: 0 },
  ],
  T012: [
    { id: 'r1', rule: 'R1', cat: 'revenue', name: '영어회화 기본', classIds: ['C1101'], base: 'revenueNet', op: 'rate', value: 0.6, customBase: 0, taxable: true, result: 0 },
  ],
};

// ---- Utilities ----

export function findClass(tid: string, cid: string): ClassItem | undefined {
  return (classCatalog[tid] ?? []).find(c => c.id === cid);
}

export function computeRule(
  tid: string,
  rule: Pick<RuleItem, 'classIds' | 'base' | 'op' | 'value' | 'cat' | 'customBase'>,
): { baseVal: number; result: number } {
  let baseVal = 0;

  if (rule.cat === 'revenue') {
    const classes = (rule.classIds ?? [])
      .map(cid => findClass(tid, cid))
      .filter(Boolean) as ClassItem[];
    switch (rule.base) {
      case 'revenueVAT':
        baseVal = classes.reduce((s, c) => s + c.revenueVAT, 0);
        break;
      case 'revenueNet':
        baseVal = classes.reduce((s, c) => s + c.revenueNet, 0);
        break;
      case 'revenueWithUnpaid':
        baseVal = classes.reduce((s, c) => s + c.revenueNet + c.unpaid, 0);
        break;
      case 'hours':
        baseVal = classes.reduce((s, c) => s + c.hours, 0);
        break;
      case 'students':
        baseVal = classes.reduce((s, c) => s + c.students, 0);
        break;
      case 'unpaidShare':
        baseVal = classes.reduce((s, c) => s + c.unpaid, 0);
        break;
    }
  } else {
    baseVal = rule.customBase ?? 0;
  }

  let result = 0;
  switch (rule.op) {
    case 'rate':
      result = baseVal * rule.value;
      break;
    case 'fixed':
      result = baseVal;
      break;
    case 'multiply':
      result = baseVal * rule.value;
      break;
    case 'add':
      result = baseVal + rule.value;
      break;
    case 'custom':
      result = computeCustom(tid, rule).result;
      break;
  }

  if (rule.cat === 'minus' && result > 0) result = -result;
  return { baseVal, result };
}

// ---- Custom op (demo: MAX/IF + 복합 연산) ----

export interface CustomStep {
  label: string;
  formula: string;
  value: number;
}

export function computeCustom(
  tid: string,
  rule: Pick<RuleItem, 'classIds' | 'base' | 'cat' | 'customBase'>,
): { baseVal: number; result: number; steps: CustomStep[] } {
  const agg = computeClassAggregate(tid, rule.classIds ?? []);
  const baseVal =
    rule.cat === 'revenue' ? baseValueFromAgg(rule.base, agg) : (rule.customBase ?? 0);

  const steps: CustomStep[] = [];

  const s1 = baseVal * 0.6;
  steps.push({
    label: '(1) 베이스 × 60%',
    formula: `${baseVal.toLocaleString()} × 0.6`,
    value: s1,
  });

  const s2 = 1_300_000;
  steps.push({
    label: '(2) 최소보장',
    formula: '고정 1,300,000',
    value: s2,
  });

  const s3 = Math.max(s1, s2);
  steps.push({
    label: '(3) MAX(1, 2)',
    formula: `max(${s1.toLocaleString()}, ${s2.toLocaleString()})`,
    value: s3,
  });

  const students = agg.students;
  const s4 = students >= 20 ? 500_000 : 0;
  steps.push({
    label: `(4) IF 학생수 ≥ 20`,
    formula: `IF(${students}명 ≥ 20, 500,000, 0)`,
    value: s4,
  });

  const s5 = agg.unpaid * 0.1;
  steps.push({
    label: '(5) 미납 × 10%',
    formula: `${agg.unpaid.toLocaleString()} × 0.1`,
    value: s5,
  });

  const result = s3 + s4 - s5;
  return { baseVal, result, steps };
}

export function formulaStr(
  tid: string,
  rule: Pick<RuleItem, 'classIds' | 'base' | 'op' | 'value' | 'cat' | 'customBase'>,
): string {
  const { baseVal } = computeRule(tid, rule);
  const b = baseVal.toLocaleString();
  switch (rule.op) {
    case 'rate':
      return `${b} x ${rule.value}`;
    case 'fixed':
      return `${b}`;
    case 'multiply':
      return `${b} x ${rule.value.toLocaleString()}`;
    case 'add':
      return `${b} + ${rule.value.toLocaleString()}`;
    case 'custom':
      return 'MAX(b × 0.6, 1.3M) + IF(stu ≥ 20, 500K) − 미납 × 10%';
  }
}

export function formatCurrency(n: number): string {
  return (n < 0 ? '-' : '') + '\u20A9 ' + Math.abs(Math.round(n)).toLocaleString();
}

export function opDef(id: OpId): OpOption | undefined {
  return ALL_OPS.find(o => o.id === id);
}

export function baseDef(id: BaseId): BaseOption | undefined {
  return REVENUE_BASES.find(b => b.id === id);
}

export function computeClassAggregate(tid: string, classIds: string[]) {
  const classes = classIds.map(id => findClass(tid, id)).filter(Boolean) as ClassItem[];
  return {
    classes,
    revenueVAT: classes.reduce((s, c) => s + c.revenueVAT, 0),
    revenueNet: classes.reduce((s, c) => s + c.revenueNet, 0),
    revenueWithUnpaid: classes.reduce((s, c) => s + c.revenueNet + c.unpaid, 0),
    hours: classes.reduce((s, c) => s + c.hours, 0),
    students: classes.reduce((s, c) => s + c.students, 0),
    unpaid: classes.reduce((s, c) => s + c.unpaid, 0),
  };
}

export function baseValueFromAgg(
  base: BaseId,
  agg: ReturnType<typeof computeClassAggregate>,
): number {
  switch (base) {
    case 'revenueVAT': return agg.revenueVAT;
    case 'revenueNet': return agg.revenueNet;
    case 'revenueWithUnpaid': return agg.revenueWithUnpaid;
    case 'hours': return agg.hours;
    case 'students': return agg.students;
    case 'unpaidShare': return agg.unpaid;
  }
}
