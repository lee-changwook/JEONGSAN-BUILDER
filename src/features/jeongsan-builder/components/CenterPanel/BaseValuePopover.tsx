import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Check, ChevronDown } from "lucide-react";

import {
  formatKRW,
  type BaseId,
  type ClassAggregate,
} from "@/features/jeongsan-builder/calculator";

/**
 * 테이블 행의 정산 기준선택을 위한 커스텀 팝오버 드롭다운.
 * native `<select>` 대비 장점:
 *   - 그룹 헤더로 카테고리(매출 / 수량 / 미납 / 기타) 구분
 *   - 옵션마다 label + hint + 현재 선택 수업에서 계산된 preview value 동시 노출
 *   - 선택된 옵션을 체크 마크 + blue-10 배경으로 강조
 *   - base-ui Popover 기반 포커스/포지셔닝 (스크롤 위치에 맞춰 자동 뒤집힘)
 */

interface OptionMeta {
  id: BaseId;
  label: string;
  hint: string;
}

const GROUPS: Array<{ title: string; items: OptionMeta[] }> = [
  {
    title: "매출",
    items: [
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
      {
        id: "revenueVAT",
        label: "매출 (수수료 포함)",
        hint: "학생이 낸 총액 (납부액)",
      },
      {
        id: "revenueNet",
        label: "순매출 (수수료 제외)",
        hint: "카드 수수료 차감 후 실입금 (PAY)",
      },
    ],
  },
  {
    title: "수량",
    items: [
      { id: "hours", label: "시수", hint: "수업 시간" },
      { id: "students", label: "학생 수", hint: "등록 학생 수" },
    ],
  },
  {
    title: "미납",
    items: [
      { id: "unpaidShare", label: "미납금", hint: "미납액 합" },
      {
        id: "currentUnpaidNeg",
        label: "현재 미납금액 (-)",
        hint: "당월 미납 + 전월 미회수를 음수로",
      },
    ],
  },
  {
    title: "기타",
    items: [
      { id: "direct", label: "직접 입력", hint: "금액을 직접 입력" },
    ],
  },
];

const ALL_OPTIONS: OptionMeta[] = GROUPS.flatMap((g) => g.items);

function baseValueOf(id: BaseId, agg: ClassAggregate): number {
  switch (id) {
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

function formatValueFor(id: BaseId, v: number): string {
  if (id === "hours") return `${v.toLocaleString()}시간`;
  if (id === "students") return `${v.toLocaleString()}명`;
  if (id === "direct") return "—";
  return formatKRW(v);
}

export function BaseValuePopover({
  value,
  agg,
  onChange,
}: {
  value: BaseId;
  agg: ClassAggregate;
  onChange: (next: BaseId) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = ALL_OPTIONS.find((o) => o.id === value);

  function pick(id: BaseId) {
    onChange(id);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={(props) => (
          <button
            {...props}
            type="button"
            className="flex h-6 w-full cursor-pointer items-center justify-between gap-0.5 rounded-[3px] border border-[var(--aca-gray-200)] bg-[var(--aca-white)] px-1.5 text-[10.5px] text-[var(--aca-black)]"
            aria-label="정산 기준선택"
            title={current?.hint ?? current?.label ?? value}
          >
            <span className="truncate">{current?.label ?? value}</span>
            <ChevronDown className="size-3 shrink-0 text-[var(--aca-gray-500)]" />
          </button>
        )}
      />
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={4}
          side="bottom"
          align="start"
          className="z-50"
        >
          <Popover.Popup
            className="jb2-scope z-50 w-[230px] max-w-[calc(100vw-2rem)] rounded-md border border-[var(--aca-gray-200)] bg-[var(--aca-white)] py-0.5 text-[11px] text-[var(--aca-black)] shadow-[var(--aca-shadow-popover)] outline-none"
            // React Portal이라 이벤트가 React 트리로 bubble해 테이블 wrapper의
            // onMouseDown을 건드린다 — 그 때 target이 DOM상 wrapper 밖이어서
            // closest(data-cell)이 null이 되면 selection이 clear된다. 이를 막기
            // 위해 팝업 내부 mousedown/click은 여기서 중단시킨다.
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {GROUPS.map((g) => (
              <div key={g.title} className="px-0.5">
                <div className="px-1.5 pt-1 pb-0 text-[9px] font-semibold uppercase tracking-wider text-[var(--aca-gray-400)]">
                  {g.title}
                </div>
                {g.items.map((it) => {
                  const selected = it.id === value;
                  const v = baseValueOf(it.id, agg);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => pick(it.id)}
                      className={`flex w-full cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-left ${selected
                          ? "bg-[var(--aca-blue-10)]"
                          : "hover:bg-[var(--aca-gray-10)]"
                        }`}
                      title={it.hint}
                    >
                      <span className="inline-flex size-3 shrink-0 items-center justify-center">
                        {selected ? (
                          <Check
                            className="size-3 text-[var(--aca-blue-primary)]"
                            strokeWidth={3}
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--aca-black)]">
                        {it.label}
                      </span>
                      <span className="jb2-tnum shrink-0 text-[10px] font-semibold text-[var(--aca-gray-500)]">
                        {formatValueFor(it.id, v)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
