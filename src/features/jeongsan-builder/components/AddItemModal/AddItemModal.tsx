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
  type BaseId,
  type CategoryId,
  type ClassItem,
  type OpId,
  type RuleItem,
  type SettlementCalculator,
} from "@/features/jeongsan-builder/calculator";
import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";

const REVENUE_BASE_OPTIONS: Array<{ id: BaseId; label: string; hint: string }> = [
  { id: "revenueVAT", label: "매출 (수수료 포함)", hint: "학생이 낸 총액 (납부액)" },
  { id: "revenueNet", label: "순매출 (수수료 제외)", hint: "카드 수수료 차감 후 실입금 (PAY)" },
  { id: "revenueWithUnpaid", label: "매출 + 미납회수", hint: "순매출 + 미납금" },
  { id: "hours", label: "시수", hint: "수업 시간" },
  { id: "students", label: "학생 수", hint: "등록 학생 수" },
  { id: "unpaidShare", label: "미납금", hint: "미납액 합" },
];

const OP_OPTIONS: Array<{
  id: OpId;
  label: string;
  hint: string;
  needsAux: boolean;
  auxLabel?: string;
  auxPlaceholder?: string;
}> = [
  {
    id: "rate",
    label: "비율",
    hint: "베이스 × 비율",
    needsAux: true,
    auxLabel: "비율",
    auxPlaceholder: "0 ~ 1 (예: 0.6)",
  },
  { id: "fixed", label: "고정", hint: "베이스 값 그대로", needsAux: false },
  {
    id: "multiply",
    label: "곱하기",
    hint: "베이스 × 숫자",
    needsAux: true,
    auxLabel: "배수",
    auxPlaceholder: "숫자 (예: 45000)",
  },
  {
    id: "add",
    label: "더하기",
    hint: "베이스 + 숫자",
    needsAux: true,
    auxLabel: "가감값",
    auxPlaceholder: "음수 가능",
  },
  { id: "custom", label: "커스텀", hint: "복합 수식 (데모)", needsAux: false },
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
    base: "revenueNet",
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
        className="flex cursor-pointer items-start gap-3 rounded-md p-4 text-left transition-colors hover:bg-[var(--aca-gray-10)]"
        style={{ border: "1px solid var(--aca-gray-200)" }}
      >
        <span
          className="inline-flex h-[22px] min-w-8 shrink-0 items-center justify-center rounded px-1.5 text-[11px] font-bold tracking-[0.4px]"
          style={{
            background: "var(--aca-revenue-bg)",
            color: "var(--aca-revenue-fg)",
          }}
        >
          R
        </span>
        <div className="min-w-0">
          <div
            className="text-[14px] font-semibold"
            style={{ color: "var(--aca-black)" }}
          >
            수업 기반
          </div>
          <div className="mt-0.5 text-xs" style={{ color: "var(--aca-gray-500)" }}>
            수업 ERP 데이터(매출·시수·학생수)에서 자동 계산
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onPick("plus")}
        className="flex cursor-pointer items-start gap-3 rounded-md p-4 text-left transition-colors hover:bg-[var(--aca-gray-10)]"
        style={{ border: "1px solid var(--aca-gray-200)" }}
      >
        <span
          className="inline-flex size-[22px] shrink-0 items-center justify-center rounded text-sm font-bold"
          style={{
            background: "var(--aca-blue-100)",
            color: "var(--aca-blue-primary)",
          }}
        >
          +
        </span>
        <div className="min-w-0">
          <div
            className="text-[14px] font-semibold"
            style={{ color: "var(--aca-black)" }}
          >
            지급 (+)
          </div>
          <div className="mt-0.5 text-xs" style={{ color: "var(--aca-gray-500)" }}>
            월급·수당·보너스 등 수기 입력 지급
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onPick("minus")}
        className="flex cursor-pointer items-start gap-3 rounded-md p-4 text-left transition-colors hover:bg-[var(--aca-gray-10)]"
        style={{ border: "1px solid var(--aca-gray-200)" }}
      >
        <span
          className="inline-flex size-[22px] shrink-0 items-center justify-center rounded text-sm font-bold"
          style={{
            background: "var(--aca-red-10)",
            color: "var(--aca-red-primary)",
          }}
        >
          −
        </span>
        <div className="min-w-0">
          <div
            className="text-[14px] font-semibold"
            style={{ color: "var(--aca-black)" }}
          >
            차감 (−)
          </div>
          <div className="mt-0.5 text-xs" style={{ color: "var(--aca-gray-500)" }}>
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
      <div
        className="text-[12px] font-semibold"
        style={{ color: "var(--aca-gray-600)" }}
      >
        수업 선택
      </div>
      <div
        className="flex h-8 items-stretch overflow-hidden rounded-[4px]"
        style={{
          background: "var(--aca-white)",
          border: "1px solid var(--aca-gray-200)",
        }}
      >
        <input
          value={state.courseSearch}
          onChange={(e) => onChange({ courseSearch: e.target.value })}
          placeholder="수업 검색"
          className="min-w-0 flex-1 border-none bg-transparent px-2.5 text-[13px] outline-none"
          style={{ fontFamily: "inherit" }}
        />
        <div
          className="flex items-center px-2.5"
          style={{ color: "var(--aca-gray-400)" }}
        >
          <SearchIcon className="size-3.5" />
        </div>
      </div>
      <div
        className="max-h-[220px] overflow-y-auto rounded-[4px]"
        style={{ border: "1px solid var(--aca-gray-100)" }}
      >
        {filtered.length === 0 ? (
          <div
            className="p-4 text-center text-xs"
            style={{ color: "var(--aca-gray-400)" }}
          >
            표시할 수업이 없습니다
          </div>
        ) : (
          filtered.map((c) => {
            const checked = state.classIds.has(c.id);
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => toggle(c.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(c.id); }}
                className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left"
                style={{
                  background: checked ? "var(--aca-blue-10)" : "var(--aca-white)",
                  borderBottom: "1px solid var(--aca-gray-100)",
                }}
              >
                <MiniCheckbox
                  checked={checked}
                  onChange={() => toggle(c.id)}
                  color="var(--aca-blue-primary)"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[13px] font-medium"
                    style={{ color: "var(--aca-black)" }}
                  >
                    {c.name}
                    {c.section && (
                      <span
                        className="ml-1 text-[11px]"
                        style={{ color: "var(--aca-gray-500)" }}
                      >
                        · {c.section}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--aca-gray-500)" }}>
                    {c.students}명 · 순매출 {formatKRW(c.revenueNet)}
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
  const valueByBase: Record<BaseId, number> = {
    revenueVAT: agg.revenueVAT,
    revenueNet: agg.revenueNet,
    revenueWithUnpaid: agg.revenueWithUnpaid,
    hours: agg.hours,
    students: agg.students,
    unpaidShare: agg.unpaid,
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className="text-[12px] font-semibold"
        style={{ color: "var(--aca-gray-600)" }}
      >
        베이스값
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {REVENUE_BASE_OPTIONS.map((opt) => {
          const selected = state.base === opt.id;
          const baseVal = valueByBase[opt.id];
          const isCount = COUNT_BASES.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ base: opt.id })}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-[4px] px-3 py-2 text-left"
              style={{
                background: selected ? "var(--aca-blue-100)" : "var(--aca-white)",
                border: `1px solid ${selected ? "var(--aca-blue-primary)" : "var(--aca-gray-200)"}`,
                color: selected ? "var(--aca-blue-primary)" : "var(--aca-black)",
              }}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="text-[13px] font-semibold">{opt.label}</div>
                <div
                  className="text-[11px]"
                  style={{
                    color: selected
                      ? "var(--aca-blue-primary)"
                      : "var(--aca-gray-500)",
                  }}
                >
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
                {classIds.length === 0
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
      <div
        className="text-[12px] font-semibold"
        style={{ color: "var(--aca-gray-600)" }}
      >
        금액
      </div>
      <div
        className="flex h-9 items-center rounded-[4px] px-3"
        style={{
          background: "var(--aca-white)",
          border: "1px solid var(--aca-gray-200)",
        }}
      >
        <input
          value={state.customBase}
          onChange={(e) => onChange({ customBase: e.target.value })}
          placeholder="금액을 입력하세요"
          inputMode="numeric"
          className="w-full border-none bg-transparent text-[14px] outline-none"
          style={{ fontFamily: "inherit", color: "var(--aca-black)" }}
        />
        <span className="text-xs" style={{ color: "var(--aca-gray-400)" }}>
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
      <div
        className="text-[12px] font-semibold"
        style={{ color: "var(--aca-gray-600)" }}
      >
        수식
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OP_OPTIONS.map((opt) => {
          const selected = state.op === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ op: opt.id })}
              className="cursor-pointer rounded-[4px] px-3 py-1.5 text-[12px] font-semibold"
              style={{
                background: selected ? "var(--aca-black)" : "var(--aca-white)",
                color: selected ? "var(--aca-white)" : "var(--aca-gray-700)",
                border: `1px solid ${selected ? "var(--aca-black)" : "var(--aca-gray-200)"}`,
              }}
              title={opt.hint}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {current?.needsAux && (
        <div className="flex flex-col gap-1">
          <label
            className="text-[11px] font-medium"
            style={{ color: "var(--aca-gray-500)" }}
          >
            {current.auxLabel}
          </label>
          <div
            className="flex h-8 items-center rounded-[4px] px-2.5"
            style={{
              background: "var(--aca-white)",
              border: "1px solid var(--aca-gray-200)",
            }}
          >
            <input
              value={state.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder={current.auxPlaceholder}
              inputMode="decimal"
              className="w-full border-none bg-transparent text-[13px] outline-none"
              style={{ fontFamily: "inherit", color: "var(--aca-black)" }}
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
      <div
        className="text-[12px] font-semibold"
        style={{ color: "var(--aca-gray-600)" }}
      >
        항목 이름
      </div>
      <div
        className="flex h-9 items-center rounded-[4px] px-3"
        style={{
          background: "var(--aca-white)",
          border: "1px solid var(--aca-gray-200)",
        }}
      >
        <input
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="예: 수업료 60%, 부장 수당"
          className="w-full border-none bg-transparent text-[14px] outline-none"
          style={{ fontFamily: "inherit", color: "var(--aca-black)" }}
        />
      </div>
      <label className="mt-1 flex cursor-pointer items-center gap-2">
        <MiniCheckbox
          checked={state.taxable}
          onChange={(next) => onChange({ taxable: next })}
          color="#2BB673"
          ariaLabel="세금 공제 대상"
        />
        <span className="text-[12px]" style={{ color: "var(--aca-gray-700)" }}>
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
    const classIds = Array.from(state.classIds);
    const agg = calculator.getClassAggregate(teacherId, classIds);
    switch (state.base) {
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
    <div
      className="flex flex-col gap-1.5 rounded-md p-3"
      style={{
        background: "var(--aca-gray-10)",
        border: "1px solid var(--aca-gray-100)",
      }}
    >
      <div
        className="text-[11px] font-semibold"
        style={{ color: "var(--aca-gray-500)" }}
      >
        미리보기
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px]" style={{ color: "var(--aca-gray-500)" }}>
            베이스 = {baseStr}
          </div>
          <div
            className="jb2-mono mt-1 text-[12px]"
            style={{ color: "var(--aca-gray-700)" }}
          >
            {formulaExpr}
          </div>
        </div>
        <div
          className="jb2-tnum shrink-0 text-[18px] font-bold"
          style={{
            color: cat === "minus" ? "var(--aca-red-primary)" : "var(--aca-black)",
          }}
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
    if (selected.length === 1) return `${selected[0].name} 수업료`;
    if (selected.length > 1) return `선택한 ${selected.length}개 수업료`;
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

  function handlePickCategory(cat: CategoryId) {
    setPickedCategory(cat);
    setForm(createInitialForm(cat));
  }

  function handleResetCategory() {
    setPickedCategory(null);
    // form은 카테고리 재선택 시 다시 초기화됨
  }

  function patchForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleSubmit() {
    if (!calculator || !activeTeacherId || !resolvedCategory) return;
    const teacherClasses = calculator.getClasses(activeTeacherId);
    const existingRules = calculator.getRules(activeTeacherId);

    const parsedValue = Number(form.value);
    const parsedCustomBase = Number(form.customBase);
    const name =
      form.name.trim() || defaultItemName(resolvedCategory, form, teacherClasses);

    const rule: RuleItem = {
      id: generateRuleId(),
      rule: nextRuleLabel(existingRules, resolvedCategory),
      cat: resolvedCategory,
      name,
      classIds: resolvedCategory === "revenue" ? Array.from(form.classIds) : [],
      base: form.base,
      op: form.op,
      value: Number.isFinite(parsedValue) ? parsedValue : 0,
      customBase:
        resolvedCategory === "revenue"
          ? 0
          : Number.isFinite(parsedCustomBase)
            ? parsedCustomBase
            : 0,
      taxable: form.taxable,
    };

    addRule(activeTeacherId, rule);
    closeModal();
  }

  const canSubmit = (() => {
    if (!resolvedCategory) return false;
    if (resolvedCategory === "revenue" && form.classIds.size === 0) return false;
    if (resolvedCategory !== "revenue") {
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
          {resolvedCategory === "revenue" ? (
            <>
              <CourseSelector
                teacherId={activeTeacherId}
                calculator={calculator}
                state={form}
                onChange={patchForm}
              />
              <BaseValuePicker
                state={form}
                onChange={patchForm}
                teacherId={activeTeacherId}
                calculator={calculator}
              />
            </>
          ) : (
            <CustomBaseInput state={form} onChange={patchForm} />
          )}

          <FormulaPicker state={form} onChange={patchForm} />
          <NamingStep state={form} onChange={patchForm} />
          <FormulaPreview
            cat={resolvedCategory}
            state={form}
            teacherId={activeTeacherId}
            calculator={calculator}
          />
        </div>
      ) : (
        <div
          className="py-8 text-center text-sm"
          style={{ color: "var(--aca-gray-500)" }}
        >
          강사가 선택되지 않았습니다.
        </div>
      )}

      <DialogFooter>
        {!showCategoryPicker && entryMode === "unspecified" && (
          <button
            type="button"
            onClick={handleResetCategory}
            className="cursor-pointer rounded-md px-4 py-2 text-[13px] font-semibold"
            style={{
              background: "var(--aca-white)",
              color: "var(--aca-gray-600)",
              border: "1px solid var(--aca-gray-200)",
            }}
          >
            카테고리 변경
          </button>
        )}
        <button
          type="button"
          onClick={closeModal}
          className="cursor-pointer rounded-md px-4 py-2 text-[13px] font-semibold"
          style={{
            background: "var(--aca-white)",
            color: "var(--aca-gray-600)",
            border: "1px solid var(--aca-gray-200)",
          }}
        >
          취소
        </button>
        {!showCategoryPicker && (
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
            추가하기
          </button>
        )}
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
      <DialogContent
        className="jb2-scope sm:max-w-[560px]"
        style={{ background: "var(--aca-white)" }}
      >
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
