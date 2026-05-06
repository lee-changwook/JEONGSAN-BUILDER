"use client";

import { useState } from "react";
import { Minus, Plus, Search as SearchIcon, Sparkles, Upload } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MiniCheckbox } from "@/features/jeongsan-builder/components/MiniControls";
import {
  formatKRW,
  isSyntheticClassId,
  type BaseId,
  type CategoryId,
  type ClassItem,
  type OpId,
  type RuleItem,
  type SettlementCalculator,
} from "@/features/jeongsan-builder/calculator";
import { OP_OPTIONS } from "@/features/jeongsan-builder/components/AddItemModal/formOptions";
import {
  BulkFormInput,
  BulkModeToggle,
  BulkOpPicker,
  BulkPasteInput,
  collectFormRows,
  createInitialBulk,
  parseBulkText,
  type BulkState,
  type ModalMode,
} from "@/features/jeongsan-builder/components/AddItemModal/bulk";
import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";

// revenueWithUnpaidNet(매출 + 미납회수 · 수수료 적용)을 최상단 + 기본값으로 (가장 많이 사용).
const REVENUE_BASE_OPTIONS: Array<{ id: BaseId; label: string; hint: string }> = [
  {
    id: "revenueWithUnpaidNet",
    label: "매출 + 미납회수 (수수료 적용)",
    hint: "PAY + 전월 미납 회수 PAY · 가장 많이 사용",
  },
  {
    id: "revenueWithUnpaidVAT",
    label: "매출 + 미납회수 (수수료 미적용)",
    hint: "납부액 + 전월 미납 회수금(원금)",
  },
  { id: "revenueVAT", label: "매출 (수수료 포함)", hint: "학생이 낸 총액 (납부액)" },
  { id: "revenueNet", label: "순매출 (수수료 제외)", hint: "카드 수수료 차감 후 실입금 (PAY)" },
  { id: "hours", label: "시수", hint: "수업 시간" },
  { id: "students", label: "학생 수", hint: "등록 학생 수" },
  { id: "unpaidShare", label: "미납금", hint: "미납액 합" },
  {
    id: "currentUnpaidNeg",
    label: "현재 미납금액 (-)",
    hint: "당월 미납 + 전월 미회수를 음수로",
  },
  { id: "direct", label: "직접 입력", hint: "금액을 직접 입력" },
];

interface FormState {
  classIds: Set<string>;
  courseSearch: string;
  base: BaseId;
  op: OpId;
  value: string;
  customBase: string;
  name: string;
  taxable: boolean;
}


function createInitialForm(cat: CategoryId): FormState {
  return {
    classIds: new Set<string>(),
    courseSearch: "",
    // revenue는 "매출 + 미납회수 (수수료 적용)"이 가장 자주 쓰이므로 기본값.
    base: "revenueWithUnpaidNet",
    op: cat === "revenue" ? "rate" : "fixed",
    value: cat === "revenue" ? "0.6" : "0",
    customBase: "",
    name: "",
    taxable: cat !== "minus",
  };
}

function CategoryPicker({ onPick }: { onPick: (mode: CategoryId) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onPick("revenue")}
        className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--aca-gray-200)] p-4 text-left transition-colors hover:bg-[var(--aca-gray-10)]"
      >
        <span className="inline-flex h-[22px] min-w-8 shrink-0 items-center justify-center rounded bg-[var(--aca-revenue-bg)] px-1.5 text-[11px] font-bold tracking-[0.4px] text-[var(--aca-revenue-fg)]">
          R
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[var(--aca-black)]">
            수업 기반
          </div>
          <div className="mt-0.5 text-xs text-[var(--aca-gray-500)]">
            수업 ERP 데이터(매출·시수·학생수)에서 자동 계산
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onPick("plus")}
        className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--aca-gray-200)] p-4 text-left transition-colors hover:bg-[var(--aca-gray-10)]"
      >
        <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded bg-[var(--aca-blue-100)] text-sm font-bold text-[var(--aca-blue-primary)]">
          +
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[var(--aca-black)]">
            지급 (+)
          </div>
          <div className="mt-0.5 text-xs text-[var(--aca-gray-500)]">
            월급·수당·보너스 등 수기 입력 지급
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onPick("minus")}
        className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--aca-gray-200)] p-4 text-left transition-colors hover:bg-[var(--aca-gray-10)]"
      >
        <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded bg-[var(--aca-red-10)] text-sm font-bold text-[var(--aca-red-primary)]">
          −
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[var(--aca-black)]">
            차감 (−)
          </div>
          <div className="mt-0.5 text-xs text-[var(--aca-gray-500)]">
            조교비·미납 분담·기타 비용 차감
          </div>
        </div>
      </button>
    </div>
  );
}

function CourseSelector({
  teacherId,
  calculator,
  state,
  onChange,
}: {
  teacherId: string;
  calculator: SettlementCalculator;
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
}) {
  const classes = calculator.getClasses(teacherId);
  const existingRules = calculator.getRules(teacherId);
  // 이 수업이 이미 다른 revenue rule에 포함돼 있는지 체크 (중복 표시용).
  const usedClassIds = new Set<string>();
  for (const r of existingRules) {
    if (r.cat === "revenue") {
      for (const cid of r.classIds) usedClassIds.add(cid);
    }
  }
  const query = state.courseSearch.trim().toLowerCase();
  const filtered =
    query === ""
      ? classes
      : classes.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.section?.toLowerCase().includes(query) ?? false),
      );

  function toggle(id: string) {
    const next = new Set(state.classIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ classIds: next });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] font-semibold text-[var(--aca-gray-600)]">
        수업 선택
      </div>
      <div className="flex h-8 items-stretch overflow-hidden rounded-[4px] border border-[var(--aca-gray-200)] bg-[var(--aca-white)]">
        <input
          value={state.courseSearch}
          onChange={(e) => onChange({ courseSearch: e.target.value })}
          placeholder="수업 검색"
          className="min-w-0 flex-1 border-none bg-transparent px-2.5 font-[inherit] text-[13px] outline-none"
        />
        <div className="flex items-center px-2.5 text-[var(--aca-gray-400)]">
          <SearchIcon className="size-3.5" />
        </div>
      </div>
      <div className="max-h-[220px] overflow-y-auto rounded-[4px] border border-[var(--aca-gray-100)]">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--aca-gray-400)]">
            표시할 수업이 없습니다
          </div>
        ) : (
          filtered.map((c) => {
            const checked = state.classIds.has(c.id);
            const alreadyUsed = usedClassIds.has(c.id);
            const isSynthetic = isSyntheticClassId(c.id);
            const isBochungbi = c.kind === "bochungbi";
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => toggle(c.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(c.id); }}
                className={`flex w-full cursor-pointer items-center gap-2.5 border-b border-[var(--aca-gray-100)] px-3 py-2 text-left ${checked ? "bg-[var(--aca-blue-10)]" : "bg-[var(--aca-white)]"
                  }`}
              >
                <MiniCheckbox
                  checked={checked}
                  onChange={() => toggle(c.id)}
                  color="var(--aca-blue-primary)"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="flex items-center gap-1.5 text-[13px] font-medium"
                    style={{ color: "var(--aca-black)" }}
                  >
                    <span className="truncate">
                      {c.name}
                      {c.section && (
                        <span
                          className="ml-1 text-[11px]"
                          style={{ color: "var(--aca-gray-500)" }}
                        >
                          · {c.section}
                        </span>
                      )}
                    </span>
                    {isBochungbi && (
                      <span
                        className="inline-flex shrink-0 items-center rounded-[3px] px-1.5 py-[1px] text-[10px] font-semibold leading-[1.3]"
                        style={{
                          background: "var(--aca-green-light)",
                          color: "var(--aca-green)",
                        }}
                        title="보충비 시트에서 파싱된 수업"
                      >
                        보충비
                      </span>
                    )}
                    {isSynthetic && (
                      <span
                        className="inline-flex shrink-0 items-center rounded-[3px] px-1.5 py-[1px] text-[10px] font-semibold leading-[1.3]"
                        style={{
                          background: "var(--aca-yellow-10)",
                          color: "var(--aca-yellow-primary)",
                        }}
                        title="수업 블록이 없고 미납회수 데이터에서 참조된 수업"
                      >
                        미납회수 전용
                      </span>
                    )}
                    {alreadyUsed && (
                      <span
                        className="inline-flex shrink-0 items-center rounded-[3px] px-1.5 py-[1px] text-[10px] font-semibold leading-[1.3]"
                        style={{
                          background: "var(--aca-yellow-10)",
                          color: "var(--aca-yellow-primary)",
                        }}
                        title="이 수업은 이미 다른 항목에 포함되어 있습니다"
                      >
                        이미 추가됨
                      </span>
                    )}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--aca-gray-500)" }}>
                    {isSynthetic
                      ? `전월 미회수 ${formatKRW(c.hoesu.minapTotal)}`
                      : `${c.students}명 · 순매출 ${formatKRW(c.revenueNet)}`}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const COUNT_BASES: ReadonlySet<BaseId> = new Set(["hours", "students"]);

function formatBaseDisplay(base: BaseId, value: number): string {
  if (base === "hours") return `${value.toLocaleString()}시간`;
  if (base === "students") return `${value.toLocaleString()}명`;
  return formatKRW(value);
}

function BaseValuePicker({
  state,
  onChange,
  teacherId,
  calculator,
}: {
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
  teacherId: string;
  calculator: SettlementCalculator;
}) {
  const classIds = Array.from(state.classIds);
  const agg = calculator.getClassAggregate(teacherId, classIds);
  const directBaseVal = Number(state.customBase) || 0;
  const valueByBase: Record<BaseId, number> = {
    revenueVAT: agg.revenueVAT,
    revenueNet: agg.revenueNet,
    revenueWithUnpaidVAT: agg.revenueWithUnpaidVAT,
    revenueWithUnpaidNet: agg.revenueWithUnpaidNet,
    hours: agg.hours,
    students: agg.students,
    unpaidShare: agg.unpaid,
    currentUnpaidNeg: -(agg.unpaid + agg.hoesu.minapTotal),
    direct: directBaseVal,
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] font-semibold text-[var(--aca-gray-600)]">
        정산 기준
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {REVENUE_BASE_OPTIONS.map((opt) => {
          const selected = state.base === opt.id;
          const baseVal = valueByBase[opt.id];
          const isCount = COUNT_BASES.has(opt.id);
          const containerClass = selected
            ? "border-[var(--aca-blue-primary)] bg-[var(--aca-blue-100)] text-[var(--aca-blue-primary)]"
            : "border-[var(--aca-gray-200)] bg-[var(--aca-white)] text-[var(--aca-black)]";
          const hintClass = selected
            ? "text-[var(--aca-blue-primary)]"
            : "text-[var(--aca-gray-500)]";
          const valueClass = selected
            ? "text-[var(--aca-blue-primary)]"
            : isCount
              ? "text-[var(--aca-black)]"
              : "text-[var(--aca-gray-700)]";
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ base: opt.id })}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-[4px] border px-3 py-2 text-left ${containerClass}`}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="text-[13px] font-semibold">{opt.label}</div>
                <div className={`text-[11px] ${hintClass}`}>
                  {opt.hint}
                </div>
              </div>
              <div
                className="jb2-tnum shrink-0 text-[13px] font-bold"
                style={{
                  color: selected
                    ? "var(--aca-blue-primary)"
                    : isCount
                      ? "var(--aca-black)"
                      : "var(--aca-gray-700)",
                }}
              >
                {opt.id === "direct"
                  ? formatKRW(baseVal)
                  : classIds.length === 0
                    ? isCount
                      ? "0"
                      : formatKRW(0)
                    : formatBaseDisplay(opt.id, baseVal)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CustomBaseInput({
  state,
  onChange,
}: {
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] font-semibold text-[var(--aca-gray-600)]">
        금액
      </div>
      <div className="flex h-9 items-center rounded-[4px] border border-[var(--aca-gray-200)] bg-[var(--aca-white)] px-3">
        <input
          value={state.customBase}
          onChange={(e) => onChange({ customBase: e.target.value })}
          placeholder="금액을 입력하세요"
          inputMode="numeric"
          className="w-full border-none bg-transparent font-[inherit] text-[14px] text-[var(--aca-black)] outline-none"
        />
        <span className="text-xs text-[var(--aca-gray-400)]">
          원
        </span>
      </div>
    </div>
  );
}

function FormulaPicker({
  state,
  onChange,
}: {
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
}) {
  const current = OP_OPTIONS.find((o) => o.id === state.op);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] font-semibold text-[var(--aca-gray-600)]">
        수식
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OP_OPTIONS.map((opt) => {
          const selected = state.op === opt.id;
          const buttonClass = selected
            ? "border-[var(--aca-black)] bg-[var(--aca-black)] text-[var(--aca-white)]"
            : "border-[var(--aca-gray-200)] bg-[var(--aca-white)] text-[var(--aca-gray-700)]";
          const Icon = opt.Icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ op: opt.id })}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-[12px] font-semibold ${buttonClass}`}
              title={opt.hint}
            >
              <Icon className="size-3.5" aria-hidden />
              {opt.label}
            </button>
          );
        })}
      </div>
      {current?.needsAux && (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--aca-gray-500)]">
            {current.auxLabel}
          </label>
          <div className="flex h-8 items-center rounded-[4px] border border-[var(--aca-gray-200)] bg-[var(--aca-white)] px-2.5">
            <input
              value={state.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder={current.auxPlaceholder}
              inputMode="decimal"
              className="w-full border-none bg-transparent font-[inherit] text-[13px] text-[var(--aca-black)] outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NamingStep({
  state,
  onChange,
}: {
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] font-semibold text-[var(--aca-gray-600)]">
        항목 이름
      </div>
      <div className="flex h-9 items-center rounded-[4px] border border-[var(--aca-gray-200)] bg-[var(--aca-white)] px-3">
        <input
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="예: 수업료 60%, 부장 수당"
          className="w-full border-none bg-transparent font-[inherit] text-[14px] text-[var(--aca-black)] outline-none"
        />
      </div>
      <label className="mt-1 flex cursor-pointer items-center gap-2">
        <MiniCheckbox
          checked={state.taxable}
          onChange={(next) => onChange({ taxable: next })}
          color="#2BB673"
          ariaLabel="세금 공제 대상"
        />
        <span className="text-[12px] text-[var(--aca-gray-700)]">
          세금 공제 대상에 포함
        </span>
      </label>
    </div>
  );
}

function computeBaseVal(
  cat: CategoryId,
  state: FormState,
  teacherId: string,
  calculator: SettlementCalculator,
): number {
  if (cat === "revenue") {
    if (state.base === "direct") {
      return Number(state.customBase) || 0;
    }
    const classIds = Array.from(state.classIds);
    const agg = calculator.getClassAggregate(teacherId, classIds);
    switch (state.base) {
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
        return -(agg.unpaid + agg.hoesu.minapTotal);
    }
  }
  return Number(state.customBase) || 0;
}

function computeResult(cat: CategoryId, state: FormState, baseVal: number): number {
  const aux = Number(state.value) || 0;
  let result = 0;
  switch (state.op) {
    case "rate":
      result = baseVal * aux;
      break;
    case "fixed":
      result = baseVal;
      break;
    case "multiply":
      result = baseVal * aux;
      break;
    case "add":
      result = baseVal + aux;
      break;
    case "custom":
      result = baseVal;
      break;
  }
  if (cat === "minus" && result > 0) result = -result;
  return Math.round(result);
}

function FormulaPreview({
  cat,
  state,
  teacherId,
  calculator,
}: {
  cat: CategoryId;
  state: FormState;
  teacherId: string;
  calculator: SettlementCalculator;
}) {
  const baseVal = computeBaseVal(cat, state, teacherId, calculator);
  const result = computeResult(cat, state, baseVal);
  const aux = Number(state.value) || 0;

  const isCount =
    cat === "revenue" && (state.base === "hours" || state.base === "students");
  const baseStr = isCount ? baseVal.toLocaleString() : formatKRW(baseVal);

  let formulaExpr: string;
  switch (state.op) {
    case "rate":
      formulaExpr = `${baseVal.toLocaleString()} × ${aux}`;
      break;
    case "fixed":
      formulaExpr = `${baseVal.toLocaleString()}`;
      break;
    case "multiply":
      formulaExpr = `${baseVal.toLocaleString()} × ${aux.toLocaleString()}`;
      break;
    case "add":
      formulaExpr = `${baseVal.toLocaleString()} + ${aux.toLocaleString()}`;
      break;
    case "custom":
      formulaExpr = "커스텀";
      break;
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-[var(--aca-gray-100)] bg-[var(--aca-gray-10)] p-3">
      <div className="text-[11px] font-semibold text-[var(--aca-gray-500)]">
        미리보기
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-[var(--aca-gray-500)]">
            베이스 = {baseStr}
          </div>
          <div className="jb2-mono mt-1 text-[12px] text-[var(--aca-gray-700)]">
            {formulaExpr}
          </div>
        </div>
        <div
          className={`jb2-tnum shrink-0 text-[18px] font-bold ${cat === "minus"
            ? "text-[var(--aca-red-primary)]"
            : "text-[var(--aca-black)]"
            }`}
        >
          {formatKRW(result)}
        </div>
      </div>
    </div>
  );
}

function generateRuleId(): string {
  return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextRuleLabel(existingRules: RuleItem[], cat: CategoryId): string {
  if (cat !== "revenue") return "";
  const maxNum = existingRules.reduce((max, r) => {
    const match = r.rule.match(/^R(\d+)$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);
  return `R${maxNum + 1}`;
}

function defaultItemName(
  cat: CategoryId,
  state: FormState,
  teacherClasses: ClassItem[],
): string {
  if (cat === "revenue") {
    const selected = teacherClasses.filter((c) => state.classIds.has(c.id));
    if (selected.length === 1) return selected[0].name;
    if (selected.length > 1) return `선택한 ${selected.length}개 수업`;
    return "수업 기반 항목";
  }
  if (cat === "plus") return "지급 항목";
  return "차감 항목";
}

interface InnerProps {
  entryMode: "unspecified" | CategoryId;
}

function AddItemModalInner({ entryMode }: InnerProps) {
  const closeModal = useBuilderStore((s) => s.closeAddItemModal);
  const calculator = useBuilderStore((s) => s.calculator);
  const activeTeacherId = useBuilderStore((s) => s.activeTeacherId);
  const addRule = useBuilderStore((s) => s.addRule);

  // 범용 진입일 때 1단계에서 선택된 카테고리. direct 진입이면 항상 null.
  const [pickedCategory, setPickedCategory] = useState<CategoryId | null>(null);

  const resolvedCategory: CategoryId | null =
    entryMode === "unspecified" ? pickedCategory : entryMode;

  const [form, setForm] = useState<FormState>(() =>
    createInitialForm(resolvedCategory ?? "revenue"),
  );
  // plus/minus에서만 사용. revenue는 단일 모드 전용.
  const [modalMode, setModalMode] = useState<ModalMode>("single");
  const [bulk, setBulk] = useState<BulkState>(() =>
    createInitialBulk(resolvedCategory ?? "plus"),
  );
  const isBulkMode = modalMode !== "single";

  function handlePickCategory(cat: CategoryId) {
    setPickedCategory(cat);
    setForm(createInitialForm(cat));
    setBulk(createInitialBulk(cat));
    setModalMode("single");
  }

  function handleResetCategory() {
    setPickedCategory(null);
    setModalMode("single");
    // form/bulk은 카테고리 재선택 시 다시 초기화됨
  }

  function patchForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function patchBulk(patch: Partial<BulkState>) {
    setBulk((prev) => ({ ...prev, ...patch }));
  }

  function handleSubmit() {
    if (!calculator || !activeTeacherId || !resolvedCategory) return;
    const teacherId = activeTeacherId;
    const teacherClasses = calculator.getClasses(teacherId);
    const existingRules = calculator.getRules(teacherId);

    // 일괄 추가 모드(plus/minus): 각 행을 별개의 rule로 생성한다.
    //   - paste: parseBulkText로 TSV/CSV 텍스트에서 파싱
    //   - form: 편집 가능한 입력 행에서 직접 수집
    // op, auxValue, 과세 여부는 모든 행에 bulk.* 공통값 적용.
    if (resolvedCategory !== "revenue" && isBulkMode) {
      type BulkItem = { name: string; amount: number };
      let items: BulkItem[] = [];
      if (modalMode === "paste") {
        items = parseBulkText(bulk.raw)
          .filter((r) => r.valid)
          .map((r) => ({ name: r.name, amount: r.amount }));
      } else if (modalMode === "form") {
        items = collectFormRows(bulk.formRows);
      }
      if (items.length === 0) return;
      const parsedAux = Number(bulk.auxValue);
      const auxValue = Number.isFinite(parsedAux) ? parsedAux : 0;
      for (const row of items) {
        const rule: RuleItem = {
          id: generateRuleId(),
          rule: "",
          cat: resolvedCategory,
          name: row.name,
          classIds: [],
          base: "revenueNet",
          op: bulk.op,
          value: auxValue,
          customBase: row.amount,
          taxable: bulk.defaultTaxable,
        };
        addRule(teacherId, rule);
      }
      closeModal();
      return;
    }

    const parsedValue = Number(form.value);
    const parsedCustomBase = Number(form.customBase);
    const customName = form.name.trim();

    const isDirect = resolvedCategory === "revenue" && form.base === "direct";
    const value = Number.isFinite(parsedValue) ? parsedValue : 0;
    const customBase = Number.isFinite(parsedCustomBase) ? parsedCustomBase : 0;

    // 수업 기반(revenue, 비 direct)에서 여러 수업이 선택된 경우 각 수업을 별개의 rule로 추가한다.
    // 그 외(direct / plus / minus)는 단일 rule.
    if (resolvedCategory === "revenue" && !isDirect) {
      const selectedClassIds = Array.from(form.classIds);

      // R 라벨을 연속 증가시키기 위해 기존 규칙 리스트를 누적 복제하며 계산.
      const accumulated: RuleItem[] = [...existingRules];
      const toAdd: RuleItem[] = [];
      for (const classId of selectedClassIds) {
        const classItem = teacherClasses.find((c) => c.id === classId);
        const name =
          customName ||
          (classItem ? classItem.name : "수업 기반 항목");
        const rule: RuleItem = {
          id: generateRuleId(),
          rule: nextRuleLabel(accumulated, "revenue"),
          cat: "revenue",
          name,
          classIds: [classId],
          base: form.base,
          op: form.op,
          value,
          customBase: 0,
          taxable: form.taxable,
        };
        toAdd.push(rule);
        accumulated.push(rule);
      }
      for (const r of toAdd) addRule(teacherId, r);
      closeModal();
      return;
    }

    const name =
      customName || defaultItemName(resolvedCategory, form, teacherClasses);

    const rule: RuleItem = {
      id: generateRuleId(),
      rule: nextRuleLabel(existingRules, resolvedCategory),
      cat: resolvedCategory,
      name,
      classIds: [],
      base: form.base,
      op: form.op,
      value,
      customBase,
      taxable: form.taxable,
    };

    addRule(teacherId, rule);
    closeModal();
  }

  const canSubmit = (() => {
    if (!resolvedCategory) return false;
    if (resolvedCategory !== "revenue" && isBulkMode) {
      // aux 값 요구 검증
      const opDef = OP_OPTIONS.find((o) => o.id === bulk.op);
      if (opDef?.needsAux) {
        const v = Number(bulk.auxValue);
        if (!Number.isFinite(v)) return false;
      }
      if (modalMode === "paste") {
        return parseBulkText(bulk.raw).some((r) => r.valid);
      }
      return collectFormRows(bulk.formRows).length > 0;
    }
    const isRevenueDirect =
      resolvedCategory === "revenue" && form.base === "direct";
    if (
      resolvedCategory === "revenue" &&
      !isRevenueDirect &&
      form.classIds.size === 0
    ) {
      return false;
    }
    if (resolvedCategory !== "revenue" || isRevenueDirect) {
      const parsed = Number(form.customBase);
      if (!Number.isFinite(parsed) || parsed <= 0) return false;
    }
    const opDef = OP_OPTIONS.find((o) => o.id === form.op);
    if (opDef?.needsAux) {
      const v = Number(form.value);
      if (!Number.isFinite(v)) return false;
    }
    return true;
  })();

  const showCategoryPicker = entryMode === "unspecified" && !pickedCategory;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {showCategoryPicker ? (
            <>
              <Sparkles className="size-4" />
              정산 항목 추가
            </>
          ) : resolvedCategory === "revenue" ? (
            <>
              <Upload className="size-4" />
              수업 기반 항목 추가
            </>
          ) : resolvedCategory === "plus" ? (
            <>
              <Plus className="size-4" />
              지급 항목 추가
            </>
          ) : (
            <>
              <Minus className="size-4" />
              차감 항목 추가
            </>
          )}
        </DialogTitle>
      </DialogHeader>

      {showCategoryPicker ? (
        <CategoryPicker onPick={handlePickCategory} />
      ) : resolvedCategory && calculator && activeTeacherId ? (
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          {resolvedCategory !== "revenue" && (
            <BulkModeToggle mode={modalMode} onChange={setModalMode} />
          )}

          {resolvedCategory === "revenue" ? (
            <>
              {form.base === "direct" ? (
                <CustomBaseInput state={form} onChange={patchForm} />
              ) : (
                <CourseSelector
                  teacherId={activeTeacherId}
                  calculator={calculator}
                  state={form}
                  onChange={patchForm}
                />
              )}
              <BaseValuePicker
                state={form}
                onChange={patchForm}
                teacherId={activeTeacherId}
                calculator={calculator}
              />
              <FormulaPicker state={form} onChange={patchForm} />
              <NamingStep state={form} onChange={patchForm} />
              <FormulaPreview
                cat={resolvedCategory}
                state={form}
                teacherId={activeTeacherId}
                calculator={calculator}
              />
            </>
          ) : modalMode === "paste" ? (
            <>
              <BulkPasteInput
                cat={resolvedCategory}
                state={bulk}
                onChange={patchBulk}
              />
              <BulkOpPicker
                op={bulk.op}
                auxValue={bulk.auxValue}
                onChange={(p) => patchBulk(p)}
              />
            </>
          ) : modalMode === "form" ? (
            <>
              <BulkFormInput
                cat={resolvedCategory}
                state={bulk}
                onChange={patchBulk}
              />
              <BulkOpPicker
                op={bulk.op}
                auxValue={bulk.auxValue}
                onChange={(p) => patchBulk(p)}
              />
            </>
          ) : (
            <>
              <CustomBaseInput state={form} onChange={patchForm} />
              <FormulaPicker state={form} onChange={patchForm} />
              <NamingStep state={form} onChange={patchForm} />
              <FormulaPreview
                cat={resolvedCategory}
                state={form}
                teacherId={activeTeacherId}
                calculator={calculator}
              />
            </>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-[var(--aca-gray-500)]">
          강사가 선택되지 않았습니다.
        </div>
      )}

      <DialogFooter>
        {!showCategoryPicker && entryMode === "unspecified" && (
          <button
            type="button"
            onClick={handleResetCategory}
            className="cursor-pointer rounded-md border border-[var(--aca-gray-200)] bg-[var(--aca-white)] px-4 py-2 text-[13px] font-semibold text-[var(--aca-gray-600)]"
          >
            카테고리 변경
          </button>
        )}
        <button
          type="button"
          onClick={closeModal}
          className="cursor-pointer rounded-md border border-[var(--aca-gray-200)] bg-[var(--aca-white)] px-4 py-2 text-[13px] font-semibold text-[var(--aca-gray-600)]"
        >
          취소
        </button>
        {!showCategoryPicker && (() => {
          const isBulk = resolvedCategory !== "revenue" && isBulkMode;
          let bulkValidCount = 0;
          if (isBulk) {
            if (modalMode === "paste") {
              bulkValidCount = parseBulkText(bulk.raw).filter(
                (r) => r.valid,
              ).length;
            } else {
              bulkValidCount = collectFormRows(bulk.formRows).length;
            }
          }
          const label = isBulk
            ? bulkValidCount > 0
              ? `${bulkValidCount}개 추가`
              : "추가하기"
            : "추가하기";
          return (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="cursor-pointer rounded-md px-4 py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "var(--aca-black)",
                color: "var(--aca-white)",
                border: "none",
              }}
            >
              {label}
            </button>
          );
        })()}
      </DialogFooter>
    </>
  );
}

export function AddItemModal() {
  const open = useBuilderStore((s) => s.addItemModal.open);
  const entryMode = useBuilderStore((s) => s.addItemModal.entryMode);
  const closeModal = useBuilderStore((s) => s.closeAddItemModal);

  function handleOpenChange(next: boolean) {
    if (!next) closeModal();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="jb2-scope bg-[var(--aca-white)] sm:max-w-[560px]">
        {/*
          key로 entryMode를 지정해 "열릴 때마다 새 세션으로 초기화"를 보장한다.
          open이 false가 되면 Dialog 내부가 unmount되므로 내부 state도 자연스럽게 소멸.
        */}
        {open && entryMode ? (
          <AddItemModalInner key={entryMode} entryMode={entryMode} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
