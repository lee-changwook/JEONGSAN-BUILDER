"use client";

import { useEffect, useMemo } from "react";
import { ChevronRight } from "lucide-react";

import { CourseDetailPopover } from "@/features/jeongsan-builder/components/CenterPanel/CourseDetailPopover";
import {
  MiniCheckbox,
  MiniDropdown,
  MiniInput,
} from "@/features/jeongsan-builder/components/MiniControls";
import {
  RoundTag,
  TypeBadge,
} from "@/features/jeongsan-builder/components/CenterPanel/TypeBadge";
import {
  useCellSelection,
  type CellCol,
  type DraggableMap,
} from "@/features/jeongsan-builder/hooks/useCellSelection";
import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";
import {
  formatKRW,
  type BaseId,
  type ClassAggregate,
  type RuleItem,
  type SettlementCalculator,
} from "@/features/jeongsan-builder/calculator";

const BASE_OPTIONS: ReadonlyArray<{ value: BaseId; label: string }> = [
  { value: "revenueVAT", label: "매출 (수수료 포함)" },
  { value: "revenueNet", label: "순매출 (수수료 제외)" },
  { value: "revenueWithUnpaid", label: "매출 + 미납회수" },
  { value: "hours", label: "시수" },
  { value: "students", label: "학생 수" },
  { value: "unpaidShare", label: "미납금" },
];

const OP_OPTIONS: ReadonlyArray<{ value: RuleItem["op"]; label: string }> = [
  { value: "rate", label: "비율" },
  { value: "fixed", label: "고정" },
  { value: "multiply", label: "곱하기" },
  { value: "add", label: "더하기" },
  { value: "custom", label: "커스텀" },
];

const COUNT_BASES: ReadonlySet<BaseId> = new Set(["hours", "students"]);
const OPS_NEEDING_AUX: ReadonlySet<RuleItem["op"]> = new Set([
  "rate",
  "multiply",
  "add",
]);

function baseValueOf(base: BaseId, agg: ClassAggregate): number {
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

interface RowProps {
  teacherId: string;
  rule: RuleItem;
  calculator: SettlementCalculator;
  selected: boolean;
  valueCellSelected: boolean;
  customBaseCellSelected: boolean;
  onToggle: () => void;
  onAuxChange: (value: string) => void;
  onCustomBaseChange: (value: string) => void;
  onTaxChange: (next: boolean) => void;
  onBaseChange: (next: BaseId) => void;
  onOpChange: (next: RuleItem["op"]) => void;
}

function ItemRow({
  teacherId,
  rule,
  calculator,
  selected,
  valueCellSelected,
  customBaseCellSelected,
  onToggle,
  onAuxChange,
  onCustomBaseChange,
  onTaxChange,
  onBaseChange,
  onOpChange,
}: RowProps) {
  const ruleResult = calculator.getRuleResult(teacherId, rule.id);
  const result = ruleResult?.result ?? 0;
  const formula = ruleResult?.formula ?? "";
  const canShowDetail = rule.cat === "revenue" && rule.classIds.length > 0;
  const auxNeeded = OPS_NEEDING_AUX.has(rule.op);

  let baseCell: React.ReactNode;
  if (rule.cat === "revenue") {
    const agg = calculator.getClassAggregate(teacherId, rule.classIds);
    const baseVal = baseValueOf(rule.base, agg);
    const isCount = COUNT_BASES.has(rule.base);
    baseCell = (
      <>
        <MiniDropdown<BaseId>
          value={rule.base}
          options={BASE_OPTIONS}
          onChange={onBaseChange}
        />
        <div
          className="jb2-tnum mt-1 text-[11px]"
          style={{ color: "var(--aca-gray-400)" }}
        >
          = {isCount ? baseVal.toLocaleString() : formatKRW(baseVal)}
        </div>
      </>
    );
  } else {
    baseCell = (
      <MiniInput
        value={String(rule.customBase ?? 0)}
        onChange={onCustomBaseChange}
        cellId={rule.id}
        cellCol="customBase"
        cellSelected={customBaseCellSelected}
      />
    );
  }

  return (
    <tr
      style={{
        background: selected ? "#FBFAF4" : "var(--aca-white)",
        borderBottom: "1px solid var(--aca-gray-100)",
      }}
    >
      <td
        className="w-[34px] pt-3.5 pb-3 pr-2 pl-4 align-top"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <MiniCheckbox checked={selected} onChange={onToggle} color="#2BB673" />
      </td>
      <td className="w-[50px] px-1.5 py-3 align-top">
        {rule.rule ? <RoundTag label={rule.rule} /> : null}
      </td>
      <td className="w-[44px] px-1.5 py-3 align-top">
        <TypeBadge cat={rule.cat} />
      </td>
      <td className="min-w-[260px] px-2.5 py-3 align-top">
        <div
          className="text-[13.5px] font-semibold leading-[1.45]"
          style={{ color: "var(--aca-black)" }}
        >
          {rule.name}
        </div>
        {rule.description && (
          <div
            className="mt-[3px] text-[11.5px] leading-[1.5]"
            style={{ color: "var(--aca-gray-500)" }}
          >
            {rule.description}
          </div>
        )}
      </td>
      <td
        className="w-[170px] px-1.5 py-3 align-top"
        onMouseDown={(e) => {
          // revenue 행은 dropdown(베이스값 선택) → wrapper에 mousedown 전파 시
          // selection이 비워질 수 있어 stopPropagation. 단 customBase MiniInput 셀은
          // wrapper의 셀 selection 로직이 처리하도록 그대로 둬야 한다.
          if (rule.cat === "revenue") {
            e.stopPropagation();
          }
        }}
      >
        {baseCell}
      </td>
      <td
        className="w-[110px] px-1.5 py-3 align-top"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <MiniDropdown<RuleItem["op"]>
          value={rule.op}
          options={OP_OPTIONS}
          onChange={onOpChange}
        />
      </td>
      <td className="w-[90px] px-1.5 py-3 align-top">
        {auxNeeded ? (
          <MiniInput
            value={String(rule.value)}
            onChange={onAuxChange}
            cellId={rule.id}
            cellCol="value"
            cellSelected={valueCellSelected}
          />
        ) : (
          <div
            className="flex h-7 items-center justify-center text-xs"
            style={{ color: "var(--aca-gray-300)" }}
          >
            —
          </div>
        )}
      </td>
      <td
        className="w-[50px] align-middle"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center">
          <MiniCheckbox checked={rule.taxable} onChange={onTaxChange} color="#2BB673" />
        </div>
      </td>
      <td className="min-w-[150px] px-2.5 py-3 align-top">
        <span
          className="jb2-mono text-[11.5px]"
          style={{ color: "var(--aca-gray-600)" }}
        >
          {formula}
        </span>
      </td>
      <td
        className="min-w-[130px] py-3 pr-4 pl-2 text-right align-top"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="jb2-tnum whitespace-nowrap text-[13.5px] font-bold"
          style={{
            color:
              rule.cat === "minus" ? "var(--aca-red-primary)" : "var(--aca-black)",
          }}
        >
          {formatKRW(result)}
        </div>
        {canShowDetail ? (
          <CourseDetailPopover
            classIds={rule.classIds}
            calculator={calculator}
          >
            상세
            <ChevronRight className="size-2.5" />
          </CourseDetailPopover>
        ) : (
          <span
            className="mt-1 inline-flex items-center gap-0.5 text-[11px]"
            style={{ color: "var(--aca-gray-300)" }}
          >
            상세
            <ChevronRight className="size-2.5" />
          </span>
        )}
      </td>
    </tr>
  );
}

const COLUMNS = [
  "",
  "#",
  "유형",
  "항목명 · 상세",
  "베이스값",
  "OPERATION",
  "보조값",
  "세금",
  "수식",
  "금액",
];

export function SettlementItemTable() {
  const calculator = useBuilderStore((s) => s.calculator);
  const activeTeacherId = useBuilderStore((s) => s.activeTeacherId);
  const selectedRuleIdsMap = useBuilderStore((s) => s.selectedRuleIds);
  const toggleRuleSelection = useBuilderStore((s) => s.toggleRuleSelection);
  const updateRule = useBuilderStore((s) => s.updateRule);
  const setRuleTaxable = useBuilderStore((s) => s.setRuleTaxable);
  const bulkSetAux = useBuilderStore((s) => s.bulkSetAux);
  const bulkSetCustomBase = useBuilderStore((s) => s.bulkSetCustomBase);

  const rules = useMemo(
    () =>
      calculator && activeTeacherId
        ? calculator.getRules(activeTeacherId)
        : [],
    [calculator, activeTeacherId],
  );
  const orderedRuleIds = useMemo(() => rules.map((r) => r.id), [rules]);

  // ruleId → 드래그 가능한 컬럼 집합. (revenue는 customBase 비활성, op이 needsAux 아니면 value 비활성)
  const draggable = useMemo<DraggableMap>(() => {
    const map = new Map<string, Set<CellCol>>();
    for (const r of rules) {
      const cols = new Set<CellCol>();
      if (r.cat !== "revenue") cols.add("customBase");
      if (OPS_NEEDING_AUX.has(r.op)) cols.add("value");
      map.set(r.id, cols);
    }
    return { get: (id) => map.get(id) };
  }, [rules]);

  const cellSel = useCellSelection(orderedRuleIds, draggable);

  // 강사 변경 시 셀 선택 비움
  useEffect(() => {
    cellSel.clear();
    // cellSel.clear는 stable. activeTeacherId만 의존성으로.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeacherId]);

  if (!calculator || !activeTeacherId) return null;

  const selectedRuleIds =
    selectedRuleIdsMap[activeTeacherId] ?? new Set<string>();

  /**
   * 셀 input 변경 시 호출. 현재 cell이 다중 선택의 일부면 column별로 모아 bulk 적용.
   * 아니면 단일 rule만 update.
   */
  function commitCellValue(ruleId: string, col: CellCol, newVal: number) {
    if (!activeTeacherId) return;
    const key = `${ruleId}|${col}`;
    if (cellSel.selectedKeys.has(key) && cellSel.selectedKeys.size > 1) {
      // 같은 column끼리 묶어서 bulk 호출 (calculator의 bulk 액션은 column별로 분리되어 있음)
      const valueIds: string[] = [];
      const customBaseIds: string[] = [];
      for (const k of cellSel.selectedKeys) {
        const [rId, c] = k.split("|") as [string, CellCol];
        if (c === "value") valueIds.push(rId);
        else if (c === "customBase") customBaseIds.push(rId);
      }
      if (valueIds.length > 0) {
        bulkSetAux(activeTeacherId, valueIds, newVal);
      }
      if (customBaseIds.length > 0) {
        bulkSetCustomBase(activeTeacherId, customBaseIds, newVal);
      }
    } else {
      const patch: Partial<RuleItem> =
        col === "customBase" ? { customBase: newVal } : { value: newVal };
      updateRule(activeTeacherId, ruleId, patch);
    }
  }

  return (
    <div
      className="flex-1 select-none overflow-auto"
      style={{ background: "var(--aca-white)" }}
      {...cellSel.wrapperProps}
    >
      <table className="jb2-tnum w-full border-separate border-spacing-0">
        <thead>
          <tr
            className="sticky top-0 z-[1]"
            style={{
              background: "#F7F5EE",
              borderBottom: "1px solid var(--aca-gray-100)",
            }}
          >
            {COLUMNS.map((h, i) => (
              <th
                key={h || `col-${i}`}
                className="px-2 py-2.5 text-[11px] font-semibold tracking-[0.2px]"
                style={{
                  color: "var(--aca-gray-500)",
                  textAlign: i >= 9 ? "right" : i === 7 ? "center" : "left",
                  paddingLeft: i === 0 ? 16 : 8,
                  paddingRight: i === 9 ? 16 : 8,
                  borderBottom: "1px solid var(--aca-gray-200)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 ? (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="px-6 py-12 text-center text-xs"
                style={{ color: "var(--aca-gray-400)" }}
              >
                정산 항목이 없습니다. &ldquo;항목 추가&rdquo;로 시작하세요.
              </td>
            </tr>
          ) : (
            rules.map((rule) => (
              <ItemRow
                key={rule.id}
                teacherId={activeTeacherId}
                rule={rule}
                calculator={calculator}
                selected={selectedRuleIds.has(rule.id)}
                valueCellSelected={cellSel.isSelected(rule.id, "value")}
                customBaseCellSelected={cellSel.isSelected(
                  rule.id,
                  "customBase",
                )}
                onToggle={() => toggleRuleSelection(activeTeacherId, rule.id)}
                onAuxChange={(raw) => {
                  const trimmed = raw.trim();
                  if (trimmed === "") return;
                  const parsed = parseFloat(trimmed);
                  if (Number.isFinite(parsed)) {
                    commitCellValue(rule.id, "value", parsed);
                  }
                }}
                onCustomBaseChange={(raw) => {
                  const trimmed = raw.trim();
                  if (trimmed === "") return;
                  const parsed = parseFloat(trimmed);
                  if (Number.isFinite(parsed)) {
                    commitCellValue(rule.id, "customBase", parsed);
                  }
                }}
                onTaxChange={(next) =>
                  setRuleTaxable(activeTeacherId, rule.id, next)
                }
                onBaseChange={(next) =>
                  updateRule(activeTeacherId, rule.id, { base: next })
                }
                onOpChange={(next) =>
                  updateRule(activeTeacherId, rule.id, { op: next })
                }
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
