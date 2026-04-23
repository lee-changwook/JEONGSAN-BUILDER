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
  { value: "revenueWithUnpaidVAT", label: "매출 + 미납회수 (수수료 미적용)" },
  { value: "revenueWithUnpaidNet", label: "매출 + 미납회수 (수수료 적용)" },
  { value: "hours", label: "시수" },
  { value: "students", label: "학생 수" },
  { value: "unpaidShare", label: "미납금" },
  { value: "currentUnpaidNeg", label: "현재 미납금액 (-)" },
  { value: "direct", label: "직접 입력" },
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

/**
 * 수업 기반(revenue) rule에 연결된 수업들의 분반을 강조된 뱃지로 렌더.
 * 중복된 분반은 한 번만 표시하고, 분반이 없는 경우 "(분반 없음)"으로 표기한다.
 * 같은 수업이 다른 rule에서도 쓰이고 있으면 rule 이름 옆에 "중복" 뱃지를 붙인다.
 */
function SectionBadges({
  teacherId,
  classIds,
  calculator,
  hasDuplicate,
}: {
  teacherId: string;
  classIds: string[];
  calculator: SettlementCalculator;
  hasDuplicate: boolean;
}) {
  const classes = calculator.getClasses(teacherId);
  const selected = classIds
    .map((cid) => classes.find((c) => c.id === cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (selected.length === 0) return null;

  const sections = Array.from(
    new Set(selected.map((c) => c.section || "(분반 없음)")),
  );

  return (
    <span className="ml-1.5 inline-flex flex-wrap items-center gap-1 align-middle">
      {sections.map((s) => {
        const isMissing = s === "(분반 없음)";
        return (
          <span
            key={s}
            className="inline-flex items-center rounded-[3px] px-1.5 py-[1px] text-[10.5px] font-semibold leading-[1.3]"
            style={{
              background: isMissing
                ? "var(--aca-gray-50)"
                : "var(--aca-blue-100)",
              color: isMissing
                ? "var(--aca-gray-500)"
                : "var(--aca-blue-primary)",
            }}
          >
            {s}
          </span>
        );
      })}
      {hasDuplicate && (
        <span
          className="inline-flex items-center rounded-[3px] px-1.5 py-[1px] text-[10.5px] font-semibold leading-[1.3]"
          style={{
            background: "var(--aca-yellow-10)",
            color: "var(--aca-yellow-primary)",
          }}
          title="이 rule의 수업이 다른 rule에서도 사용되고 있습니다"
        >
          중복
        </span>
      )}
    </span>
  );
}

/**
 * 수업 기반(revenue) rule 행에 표시되는 4가지 참고값.
 * 모든 값은 rule에 선택된 수업에 한정된다 (강사 단위 합이 아님).
 *   - 이번달 미납액            : 선택된 수업들의 당월 minapTotal 합
 *   - 전월 미납액              : 선택된 수업에 연결된 minap_hoesu의 hoesuTotal + minapTotal
 *                              (회수금 + 미회수금 합, 모두 수수료 미적용 원금)
 *   - 전월 미납액 회수 금액     : 선택된 수업에 연결된 minap_hoesu의 payTotal
 *                              (회수분 중 수수료 적용 후 실입금)
 *   - 이번달 납부액            : 선택된 수업들의 당월 payTotal 합 (수수료 적용 후 실입금)
 *
 * direct 베이스 rule은 수업 선택이 없으므로 모든 값이 0으로 표시된다.
 */
function RevenueMetrics({
  teacherId,
  rule,
  calculator,
}: {
  teacherId: string;
  rule: RuleItem;
  calculator: SettlementCalculator;
}) {
  const agg = calculator.getClassAggregate(teacherId, rule.classIds);
  const thisMonthUnpaid = agg.unpaid;
  const thisMonthPaid = agg.classes.reduce((s, c) => s + c.pay, 0);
  const prevUnpaid = agg.hoesu.hoesuTotal + agg.hoesu.minapTotal;
  const prevRecoveredPay = agg.hoesu.payTotal;

  // 2-column grid. 왼쪽→오른쪽, 위→아래 읽기 순서:
  //   [전월 미납액]        [전월 회수 (수수료)]
  //   [이번달 미납액]      [이번달 납부액(수수료 적용)]
  //
  // 색상 규칙:
  //   - 미납 관련 값 → red (--aca-red-primary)
  //   - 납입/회수 관련 값 → blue (--aca-blue-primary)
  type Tone = "unpaid" | "paid";
  const items: Array<{ label: string; value: number; tone: Tone }> = [
    { label: "전월 미납액", value: prevUnpaid, tone: "unpaid" },
    { label: "전월 회수 (수수료)", value: prevRecoveredPay, tone: "paid" },
    { label: "이번달 미납액", value: thisMonthUnpaid, tone: "unpaid" },
    { label: "이번달 납부액(수수료 적용)", value: thisMonthPaid, tone: "paid" },
  ];

  return (
    <div
      className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] leading-[1.4]"
      style={{ color: "var(--aca-gray-500)" }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-baseline justify-between gap-2"
        >
          <span className="truncate">{it.label}</span>
          <span
            className="jb2-tnum shrink-0"
            style={{
              color:
                it.value === 0
                  ? "var(--aca-black)"
                  : it.tone === "unpaid"
                    ? "var(--aca-red-primary)"
                    : "var(--aca-blue-primary)",
            }}
          >
            {formatKRW(it.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function baseValueOf(base: BaseId, agg: ClassAggregate): number {
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
      return -(agg.unpaid + agg.hoesu.minapTotal);
    case "direct":
      return 0;
  }
}

interface RowProps {
  teacherId: string;
  rule: RuleItem;
  ordinal: number;
  calculator: SettlementCalculator;
  selected: boolean;
  valueCellSelected: boolean;
  customBaseCellSelected: boolean;
  /** 다른 rule과 수업 중복이 있으면 true. */
  hasDuplicateClass: boolean;
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
  ordinal,
  calculator,
  selected,
  valueCellSelected,
  customBaseCellSelected,
  hasDuplicateClass,
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
    if (rule.base === "direct") {
      baseCell = (
        <>
          <MiniDropdown<BaseId>
            value={rule.base}
            options={BASE_OPTIONS}
            onChange={onBaseChange}
          />
          <div className="mt-1">
            <MiniInput
              value={String(rule.customBase ?? 0)}
              onChange={onCustomBaseChange}
              cellId={rule.id}
              cellCol="customBase"
              cellSelected={customBaseCellSelected}
            />
          </div>
        </>
      );
    } else {
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
    }
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
      }}
    >
      <td
        className="w-[34px] pt-3.5 pb-3 pr-2 pl-4 align-top"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <MiniCheckbox checked={selected} onChange={onToggle} color="#2BB673" />
      </td>
      <td className="w-[50px] px-1.5 py-3 align-top">
        <RoundTag label={String(ordinal)} />
      </td>
      <td className="w-[44px] px-1.5 py-3 align-top">
        <TypeBadge cat={rule.cat} />
      </td>
      <td className="min-w-[260px] px-2.5 py-3 align-top">
        <div
          className="text-[13.5px] font-semibold leading-[1.45]"
          style={{ color: "var(--aca-black)" }}
        >
          <span className="align-middle">{rule.name}</span>
          {rule.cat === "revenue" && rule.base !== "direct" && (
            <SectionBadges
              teacherId={teacherId}
              classIds={rule.classIds}
              calculator={calculator}
              hasDuplicate={hasDuplicateClass}
            />
          )}
        </div>
        {rule.description && (
          <div className="mt-[3px] text-[11.5px] leading-[1.5] text-[var(--aca-gray-500)]">
            {rule.description}
          </div>
        )}
        {rule.cat === "revenue" && (
          <RevenueMetrics
            teacherId={teacherId}
            rule={rule}
            calculator={calculator}
          />
        )}
      </td>
      <td
        className="w-[170px] px-1.5 py-3 align-top"
        onMouseDown={(e) => {
          // revenue 행은 dropdown(베이스값 선택) → wrapper에 mousedown 전파 시
          // selection이 비워질 수 있어 stopPropagation. 단 customBase MiniInput 셀이
          // 있는 direct 모드에서는 wrapper의 셀 selection 로직이 처리하도록 통과시킨다.
          if (rule.cat === "revenue" && rule.base !== "direct") {
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
          <div className="flex h-7 items-center justify-center text-xs text-[var(--aca-gray-300)]">
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
        <span className="jb2-mono text-[11.5px] text-[var(--aca-gray-600)]">
          {formula}
        </span>
      </td>
      <td
        className="min-w-[130px] py-3 pr-4 pl-2 text-right align-top"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={`jb2-tnum whitespace-nowrap text-[13.5px] font-bold ${
            rule.cat === "minus"
              ? "text-[var(--aca-red-primary)]"
              : "text-[var(--aca-black)]"
          }`}
        >
          {formatKRW(result)}
        </div>
        {canShowDetail ? (
          <CourseDetailPopover
            teacherId={teacherId}
            classIds={rule.classIds}
            calculator={calculator}
          >
            상세
            <ChevronRight className="size-2.5" />
          </CourseDetailPopover>
        ) : (
          <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-[var(--aca-gray-300)]">
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

  // ruleId → 드래그 가능한 컬럼 집합.
  //   - customBase는 plus/minus 또는 revenue+direct에서만 활성
  //   - value는 op이 aux를 필요로 할 때만 활성
  const draggable = useMemo<DraggableMap>(() => {
    const map = new Map<string, Set<CellCol>>();
    for (const r of rules) {
      const cols = new Set<CellCol>();
      if (r.cat !== "revenue" || r.base === "direct") cols.add("customBase");
      if (OPS_NEEDING_AUX.has(r.op)) cols.add("value");
      map.set(r.id, cols);
    }
    return { get: (id) => map.get(id) };
  }, [rules]);

  // classId가 2개 이상의 revenue rule에서 쓰이면 중복.
  const duplicateClassIds = useMemo<ReadonlySet<string>>(() => {
    const count = new Map<string, number>();
    for (const r of rules) {
      if (r.cat !== "revenue") continue;
      for (const cid of r.classIds) {
        count.set(cid, (count.get(cid) ?? 0) + 1);
      }
    }
    const dup = new Set<string>();
    for (const [cid, n] of count) if (n > 1) dup.add(cid);
    return dup;
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
      className="flex-1 select-none overflow-auto bg-[var(--aca-white)]"
      {...cellSel.wrapperProps}
    >
      <table className="jb2-tnum jb2-rule-table w-full border-separate border-spacing-0">
        <thead>
          <tr className="sticky top-0 z-[1] border-b border-[var(--aca-gray-100)] bg-[#F7F5EE]">
            {COLUMNS.map((h, i) => {
              const alignClass =
                i >= 9 ? "text-right" : i === 7 ? "text-center" : "text-left";
              const padLeftClass = i === 0 ? "pl-4" : "pl-2";
              const padRightClass = i === 9 ? "pr-4" : "pr-2";
              return (
                <th
                  key={h || `col-${i}`}
                  className={`border-b border-[var(--aca-gray-200)] py-2.5 text-[11px] font-semibold tracking-[0.2px] text-[var(--aca-gray-500)] ${alignClass} ${padLeftClass} ${padRightClass}`}
                >
                  {h}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 ? (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="px-6 py-12 text-center text-xs text-[var(--aca-gray-400)]"
              >
                정산 항목이 없습니다. &ldquo;항목 추가&rdquo;로 시작하세요.
              </td>
            </tr>
          ) : (
            rules.map((rule, idx) => (
              <ItemRow
                key={rule.id}
                teacherId={activeTeacherId}
                rule={rule}
                ordinal={idx + 1}
                calculator={calculator}
                selected={selectedRuleIds.has(rule.id)}
                valueCellSelected={cellSel.isSelected(rule.id, "value")}
                customBaseCellSelected={cellSel.isSelected(
                  rule.id,
                  "customBase",
                )}
                hasDuplicateClass={rule.classIds.some((cid) =>
                  duplicateClassIds.has(cid),
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
