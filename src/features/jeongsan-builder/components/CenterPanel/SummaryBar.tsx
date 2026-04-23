"use client";

import { useShallow } from "zustand/react/shallow";

import { formatKRW } from "@/features/jeongsan-builder/calculator";
import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";

interface SummaryMetricProps {
  label: string;
  value: string;
  highlight?: boolean;
  colorClassName?: string;
}

function SummaryMetric({ label, value, highlight, colorClassName }: SummaryMetricProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="text-[11px] font-medium text-[var(--aca-gray-400)]">
        {label}
      </div>
      <div
        className={`jb2-tnum text-base tracking-[-0.2px] ${
          highlight ? "font-bold" : "font-semibold"
        } ${colorClassName ?? "text-[var(--aca-black)]"}`}
      >
        {value}
      </div>
    </div>
  );
}

export function SummaryBar() {
  const summary = useBuilderStore(
    useShallow((s) => s.calculator?.getMonthlySummary() ?? null),
  );

  if (!summary) return null;

  const monthLabel = `${summary.year}년 ${String(summary.month).padStart(2, "0")}월`;

  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-3 border-b border-[var(--aca-gray-100)] bg-[var(--aca-white)] px-6 py-3.5">
      <div className="flex flex-col gap-0.5 border-r border-[var(--aca-gray-100)] pr-5">
        <div className="text-[11px] font-medium text-[var(--aca-gray-400)]">
          월간 정산
        </div>
        <div className="text-base font-bold text-[var(--aca-black)]">
          {monthLabel}
        </div>
      </div>

      <SummaryMetric label="전체 강사 수" value={`${summary.teacherCount}명`} />
      <SummaryMetric
        label="전체 매출"
        value={formatKRW(summary.totalRevenue)}
      />
      <SummaryMetric
        label="정산액 (Gross)"
        value={formatKRW(summary.totalSettle)}
        highlight
      />
      <SummaryMetric
        label="원천세 (3.3%)"
        value={formatKRW(Math.abs(summary.totalWithholding))}
      />
      <SummaryMetric
        label="실지급액"
        value={formatKRW(summary.totalPayout)}
        highlight
        colorClassName="text-[var(--aca-blue-primary)]"
      />
    </div>
  );
}
