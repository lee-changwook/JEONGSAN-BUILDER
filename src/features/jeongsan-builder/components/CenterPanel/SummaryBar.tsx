"use client";

import { useShallow } from "zustand/react/shallow";

import { formatKRW } from "@/features/jeongsan-builder/calculator";
import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";

interface SummaryMetricProps {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}

function SummaryMetric({ label, value, highlight, color }: SummaryMetricProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="text-[11px] font-medium" style={{ color: "var(--aca-gray-400)" }}>
        {label}
      </div>
      <div
        className="jb2-tnum text-base tracking-[-0.2px]"
        style={{
          fontWeight: highlight ? 700 : 600,
          color: color ?? "var(--aca-black)",
        }}
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
    <div
      className="flex flex-wrap items-center gap-x-7 gap-y-3 px-6 py-3.5"
      style={{
        background: "var(--aca-white)",
        borderBottom: "1px solid var(--aca-gray-100)",
      }}
    >
      <div
        className="flex flex-col gap-0.5 pr-5"
        style={{ borderRight: "1px solid var(--aca-gray-100)" }}
      >
        <div
          className="text-[11px] font-medium"
          style={{ color: "var(--aca-gray-400)" }}
        >
          월간 정산
        </div>
        <div className="text-base font-bold" style={{ color: "var(--aca-black)" }}>
          {monthLabel}
        </div>
      </div>

      <SummaryMetric label="전체 강사 수" value={`${summary.teacherCount}명`} />
      <SummaryMetric
        label="전체 매출"
        value={formatKRW(summary.totalRevenue)}
        color="var(--aca-gray-700)"
      />
      <SummaryMetric
        label="정산액 (Gross)"
        value={formatKRW(summary.totalSettle)}
        highlight
      />
      <SummaryMetric
        label="원천세 (3.3%)"
        value={formatKRW(Math.abs(summary.totalWithholding))}
        color="var(--aca-gray-600)"
      />
      <SummaryMetric
        label="실지급액"
        value={formatKRW(summary.totalPayout)}
        highlight
        color="var(--aca-blue-primary)"
      />

      <div className="ml-auto flex items-center gap-2.5">
        <div className="flex flex-col gap-0.5">
          <div
            className="text-[11px] font-medium"
            style={{ color: "var(--aca-gray-400)" }}
          >
            미확정
          </div>
          <span
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-base font-bold"
            style={{
              background: "var(--aca-yellow-10)",
              color: "var(--aca-yellow-primary)",
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: "var(--aca-yellow-primary)" }}
            />
            {summary.unconfirmedCount}명
          </span>
        </div>
      </div>
    </div>
  );
}
