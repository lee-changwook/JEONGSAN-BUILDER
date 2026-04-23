"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, GripVertical } from "lucide-react";

import { BaseValuePopover } from "@/features/jeongsan-builder/components/CenterPanel/BaseValuePopover";
import { CourseDetailPopover } from "@/features/jeongsan-builder/components/CenterPanel/CourseDetailPopover";
import { OpDropdown } from "@/features/jeongsan-builder/components/CenterPanel/OpDropdown";
import {
  MiniCheckbox,
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
  type ClassKind,
  type RuleItem,
  type SettlementCalculator,
} from "@/features/jeongsan-builder/calculator";

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

  // {kind|section} 튜플로 dedupe — 같은 section 라벨이라도 kind가 다르면 별도 뱃지.
  type Badge = { key: string; label: string; kind: ClassKind | "missing" };
  const seen = new Set<string>();
  const badges: Badge[] = [];
  for (const c of selected) {
    const isMissing = !c.section;
    const label = c.section || "(분반 없음)";
    const kind: ClassKind | "missing" = isMissing ? "missing" : c.kind;
    const key = `${kind}|${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    badges.push({ key, label, kind });
  }

  // kind 별 색상 (보충비=초록, 일반 수업=파랑, synthetic=노랑, 분반 없음=회색)
  function colorsFor(kind: Badge["kind"]): { bg: string; fg: string } {
    switch (kind) {
      case "bochungbi":
        return { bg: "var(--aca-green-light)", fg: "var(--aca-green)" };
      case "synthetic":
        return { bg: "var(--aca-yellow-10)", fg: "var(--aca-yellow-primary)" };
      case "missing":
        return { bg: "var(--aca-gray-50)", fg: "var(--aca-gray-500)" };
      case "sueop":
      default:
        return { bg: "var(--aca-blue-100)", fg: "var(--aca-blue-primary)" };
    }
  }

  return (
    <span className="ml-1.5 inline-flex flex-wrap items-center gap-1 align-middle">
      {badges.map((b) => {
        const { bg, fg } = colorsFor(b.kind);
        return (
          <span
            key={b.key}
            className="inline-flex items-center rounded-[3px] px-1.5 py-[1px] text-[10.5px] font-semibold leading-[1.3]"
            style={{ background: bg, color: fg }}
            title={b.kind === "bochungbi" ? "보충비" : undefined}
          >
            {b.label}
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
  taxableCellSelected: boolean;
  baseCellSelected: boolean;
  opCellSelected: boolean;
  /** 다른 rule과 수업 중복이 있으면 true. */
  hasDuplicateClass: boolean;
  /** 행 재정렬 DnD. */
  onRowDragStart: () => void;
  onRowDragOver: () => void;
  onRowDrop: () => void;
  onRowDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  /** 세금 셀의 drag-paint 토글: mousedown/enter에서 호출. */
  onTaxPaintStart: () => void;
  onTaxPaintEnter: () => void;
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
  taxableCellSelected,
  baseCellSelected,
  opCellSelected,
  hasDuplicateClass,
  onRowDragStart,
  onRowDragOver,
  onRowDrop,
  onRowDragEnd,
  isDragging,
  isDragOver,
  onTaxPaintStart,
  onTaxPaintEnter,
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
    if (rule.base === "direct") {
      baseCell = (
        <>
          <BaseValuePopover
            value={rule.base}
            agg={agg}
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
      const baseVal = baseValueOf(rule.base, agg);
      const isCount = COUNT_BASES.has(rule.base);
      baseCell = (
        <>
          <BaseValuePopover
            value={rule.base}
            agg={agg}
            onChange={onBaseChange}
          />
          <div
            className="jb2-tnum mt-0.5 truncate text-[10px] whitespace-nowrap"
            style={{ color: "var(--aca-gray-400)" }}
            title={isCount ? baseVal.toLocaleString() : formatKRW(baseVal)}
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
      // <tr> 자체는 draggable=false. 재정렬은 grip 핸들(span)이 소스가 되고
      // <tr>은 drop 타겟 역할(onDragOver/onDrop)만 담당 — 셀 드래그 선택과 충돌 방지.
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onRowDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onRowDrop();
      }}
      className={`${
        selected ? "bg-[#FBFAF4]" : "bg-[var(--aca-white)]"
      } ${isDragging ? "opacity-40" : ""}`}
      style={
        isDragOver
          ? { boxShadow: "inset 0 2px 0 var(--aca-blue-primary)" }
          : undefined
      }
    >
      <td
        className="w-[34px] pt-3.5 pb-3 pr-2 pl-4 align-top"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <span
            aria-label="행 끌어서 순서 변경"
            title="행 끌어서 순서 변경"
            className="inline-flex cursor-grab items-center text-[var(--aca-gray-400)]"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              try {
                e.dataTransfer.setData("text/plain", rule.id);
              } catch {
                /* noop */
              }
              onRowDragStart();
            }}
            onDragEnd={onRowDragEnd}
          >
            <GripVertical className="size-3.5" />
          </span>
          <MiniCheckbox checked={selected} onChange={onToggle} color="#2BB673" />
        </div>
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
        className="w-[80px] px-1.5 py-3 align-top"
        data-cell-id={rule.cat === "revenue" ? rule.id : undefined}
        data-cell-col={rule.cat === "revenue" ? "base" : undefined}
        style={
          baseCellSelected
            ? {
                outline: "2px solid var(--aca-blue-primary)",
                outlineOffset: "-2px",
              }
            : undefined
        }
      >
        {baseCell}
      </td>
      <td
        className="w-[110px] px-1.5 py-3 align-top"
        data-cell-id={rule.id}
        data-cell-col="op"
        style={
          opCellSelected
            ? {
                outline: "2px solid var(--aca-blue-primary)",
                outlineOffset: "-2px",
              }
            : undefined
        }
      >
        <OpDropdown value={rule.op} onChange={onOpChange} />
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
        data-cell-id={rule.id}
        data-cell-col="taxable"
        style={
          taxableCellSelected
            ? {
                outline: "2px solid var(--aca-blue-primary)",
                outlineOffset: "-2px",
              }
            : undefined
        }
        onMouseDown={(e) => {
          // 셀 사각 선택은 wrapper에서 이미 처리됨. 여기서 추가로 "drag-paint 토글"
          // 를 시작한다 (단순 클릭이면 mouseup에서 종료).
          if (e.button !== 0) return;
          onTaxPaintStart();
        }}
        onMouseEnter={(e) => {
          // 왼쪽 버튼을 누른 채로 다른 tax 셀로 들어오면 같은 값으로 칠한다.
          if ((e.buttons & 1) === 1) {
            onTaxPaintEnter();
          }
        }}
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
  const selectAllRules = useBuilderStore((s) => s.selectAllRules);
  const clearRuleSelection = useBuilderStore((s) => s.clearRuleSelection);
  const updateRule = useBuilderStore((s) => s.updateRule);
  const setRuleTaxable = useBuilderStore((s) => s.setRuleTaxable);
  const bulkSetRuleTaxable = useBuilderStore((s) => s.bulkSetRuleTaxable);
  const bulkSetRuleBase = useBuilderStore((s) => s.bulkSetRuleBase);
  const bulkSetRuleOp = useBuilderStore((s) => s.bulkSetRuleOp);
  const bulkSetAux = useBuilderStore((s) => s.bulkSetAux);
  const bulkSetCustomBase = useBuilderStore((s) => s.bulkSetCustomBase);
  const moveRule = useBuilderStore((s) => s.moveRule);

  // 행 DnD 로컬 상태
  const [draggingRuleId, setDraggingRuleId] = useState<string | null>(null);
  const [dragOverRuleId, setDragOverRuleId] = useState<string | null>(null);

  // 세금 drag-paint 로컬 상태: 드래그 동안 적용할 newValue + 이미 토글한 ruleId 집합.
  const taxPaintRef = useRef<{
    newValue: boolean;
    applied: Set<string>;
  } | null>(null);

  const rules = useMemo(
    () =>
      calculator && activeTeacherId
        ? calculator.getRules(activeTeacherId)
        : [],
    [calculator, activeTeacherId],
  );
  const orderedRuleIds = useMemo(() => rules.map((r) => r.id), [rules]);

  // ruleId → 드래그 가능한 컬럼 집합.
  //   - customBase: plus/minus 또는 revenue+direct
  //   - value: op이 aux를 필요로 할 때
  //   - taxable: 모든 rule에서 활성 (drag-select 시각 표시용)
  const draggable = useMemo<DraggableMap>(() => {
    const map = new Map<string, Set<CellCol>>();
    for (const r of rules) {
      const cols = new Set<CellCol>();
      if (r.cat === "revenue") cols.add("base");
      cols.add("op");
      if (r.cat !== "revenue" || r.base === "direct") cols.add("customBase");
      if (OPS_NEEDING_AUX.has(r.op)) cols.add("value");
      cols.add("taxable");
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

  const allSelected =
    rules.length > 0 && selectedRuleIds.size === rules.length;
  const someSelected =
    selectedRuleIds.size > 0 && selectedRuleIds.size < rules.length;

  function handleToggleSelectAll() {
    if (!activeTeacherId) return;
    if (allSelected) clearRuleSelection(activeTeacherId);
    else selectAllRules(activeTeacherId);
  }

  /** 행 재정렬 DnD 핸들러 */
  function handleRowDragStart(ruleId: string) {
    setDraggingRuleId(ruleId);
  }
  function handleRowDragOver(ruleId: string) {
    if (draggingRuleId && draggingRuleId !== ruleId) {
      setDragOverRuleId(ruleId);
    }
  }
  function handleRowDrop(targetRuleId: string) {
    if (!activeTeacherId) {
      setDraggingRuleId(null);
      setDragOverRuleId(null);
      return;
    }
    if (draggingRuleId && draggingRuleId !== targetRuleId) {
      const toIndex = rules.findIndex((r) => r.id === targetRuleId);
      if (toIndex >= 0) {
        moveRule(activeTeacherId, draggingRuleId, toIndex);
      }
    }
    setDraggingRuleId(null);
    setDragOverRuleId(null);
  }
  function handleRowDragEnd() {
    setDraggingRuleId(null);
    setDragOverRuleId(null);
  }

  /**
   * 세금 셀 drag-paint. mousedown 시작 → 해당 rule을 반전값으로 토글하고
   * "이 drag 동안 칠할 값(newValue)"를 기록. 이후 다른 tax 셀로 enter할 때마다
   * 같은 newValue로 set. 이미 칠한 rule은 재방문해도 건드리지 않는다.
   */
  function handleTaxPaintStart(ruleId: string) {
    if (!activeTeacherId) return;
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newValue = !rule.taxable;
    taxPaintRef.current = { newValue, applied: new Set([ruleId]) };

    // drag-select로 여러 tax 셀이 선택된 상태라면 그 전체에 일괄 적용.
    const key = `${ruleId}|taxable`;
    if (
      cellSel.selectedKeys.has(key) &&
      Array.from(cellSel.selectedKeys).some((k) => k.endsWith("|taxable") && k !== key)
    ) {
      const taxIds: string[] = [];
      for (const k of cellSel.selectedKeys) {
        if (k.endsWith("|taxable")) {
          const [rId] = k.split("|");
          taxIds.push(rId);
          taxPaintRef.current.applied.add(rId);
        }
      }
      bulkSetRuleTaxable(activeTeacherId, taxIds, newValue);
      return;
    }
    setRuleTaxable(activeTeacherId, ruleId, newValue);
  }

  function handleTaxPaintEnter(ruleId: string) {
    if (!activeTeacherId || !taxPaintRef.current) return;
    if (taxPaintRef.current.applied.has(ruleId)) return;
    taxPaintRef.current.applied.add(ruleId);
    setRuleTaxable(activeTeacherId, ruleId, taxPaintRef.current.newValue);
  }

  /**
   * 베이스값 변경. 이 rule의 base 셀이 다중 선택의 일부이면 bulk 적용.
   * (revenue rule에 한정 — calculator.bulkSetBase가 내부 필터링)
   */
  function handleBaseChange(ruleId: string, next: BaseId) {
    if (!activeTeacherId) return;
    const key = `${ruleId}|base`;
    if (cellSel.selectedKeys.has(key) && cellSel.selectedKeys.size > 1) {
      const ids: string[] = [];
      for (const k of cellSel.selectedKeys) {
        if (k.endsWith("|base")) ids.push(k.split("|")[0]);
      }
      if (ids.length > 1) {
        bulkSetRuleBase(activeTeacherId, ids, next);
        return;
      }
    }
    updateRule(activeTeacherId, ruleId, { base: next });
  }

  function handleOpChange(ruleId: string, next: RuleItem["op"]) {
    if (!activeTeacherId) return;
    const key = `${ruleId}|op`;
    if (cellSel.selectedKeys.has(key) && cellSel.selectedKeys.size > 1) {
      const ids: string[] = [];
      for (const k of cellSel.selectedKeys) {
        if (k.endsWith("|op")) ids.push(k.split("|")[0]);
      }
      if (ids.length > 1) {
        bulkSetRuleOp(activeTeacherId, ids, next);
        return;
      }
    }
    updateRule(activeTeacherId, ruleId, { op: next });
  }

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

  // cellSel.wrapperProps의 onMouseUp을 가로채 tax paint 종료까지 처리.
  const wrapperProps = {
    ...cellSel.wrapperProps,
    onMouseUp: () => {
      cellSel.wrapperProps.onMouseUp();
      taxPaintRef.current = null;
    },
    onMouseLeave: () => {
      cellSel.wrapperProps.onMouseLeave();
      taxPaintRef.current = null;
    },
  };

  return (
    <div
      className="flex-1 select-none overflow-auto bg-[var(--aca-white)]"
      {...wrapperProps}
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
                  onMouseDown={
                    i === 0 ? (e) => e.stopPropagation() : undefined
                  }
                >
                  {i === 0 && rules.length > 0 ? (
                    <MiniCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={handleToggleSelectAll}
                      color="#2BB673"
                      ariaLabel="전체 선택"
                    />
                  ) : (
                    h
                  )}
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
                taxableCellSelected={cellSel.isSelected(rule.id, "taxable")}
                baseCellSelected={cellSel.isSelected(rule.id, "base")}
                opCellSelected={cellSel.isSelected(rule.id, "op")}
                hasDuplicateClass={rule.classIds.some((cid) =>
                  duplicateClassIds.has(cid),
                )}
                isDragging={draggingRuleId === rule.id}
                isDragOver={
                  dragOverRuleId === rule.id && draggingRuleId !== rule.id
                }
                onRowDragStart={() => handleRowDragStart(rule.id)}
                onRowDragOver={() => handleRowDragOver(rule.id)}
                onRowDrop={() => handleRowDrop(rule.id)}
                onRowDragEnd={handleRowDragEnd}
                onTaxPaintStart={() => handleTaxPaintStart(rule.id)}
                onTaxPaintEnter={() => handleTaxPaintEnter(rule.id)}
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
                onBaseChange={(next) => handleBaseChange(rule.id, next)}
                onOpChange={(next) => handleOpChange(rule.id, next)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
