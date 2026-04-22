import { History, Save } from "lucide-react";

import { formatKRW } from "@/features/jeongsan-builder/utils/format";
import type { InstructorCardSummary } from "@/features/jeongsan-builder/types";

interface MetricCellProps {
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
  negative?: boolean;
  highlight?: boolean;
}

function MetricCell({ label, value, hint, positive, negative, highlight }: MetricCellProps) {
  const color = highlight
    ? "var(--aca-blue-primary)"
    : positive
      ? "var(--aca-green)"
      : negative
        ? "var(--aca-red-primary)"
        : "var(--aca-black)";
  return (
    <div
      className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5"
      style={{ borderRight: "1px solid var(--aca-gray-100)" }}
    >
      <div
        className="text-[10.5px] font-medium"
        style={{ color: "var(--aca-gray-500)" }}
      >
        {label}
      </div>
      <div
        className="jb2-tnum truncate tracking-[-0.2px]"
        style={{
          fontSize: highlight ? 15 : 13.5,
          fontWeight: highlight ? 700 : 600,
          color,
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          className="truncate text-[10px]"
          style={{ color: "var(--aca-gray-400)" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

export function InstructorCardHeader({ summary }: { summary: InstructorCardSummary }) {
  return (
    <div
      className="flex flex-col gap-3.5 px-5 py-4"
      style={{
        background: "var(--aca-white)",
        borderBottom: "1px solid var(--aca-gray-100)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span
              className="text-[22px] font-bold tracking-[-0.3px]"
              style={{ color: "var(--aca-black)" }}
            >
              {summary.name}
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
              style={{
                background: "var(--aca-yellow-10)",
                color: "var(--aca-yellow-primary)",
              }}
            >
              확인 {summary.reviewCount}
            </span>
          </div>
          <div className="text-[13px]" style={{ color: "var(--aca-gray-500)" }}>
            {summary.subjects}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            className="flex h-[27px] cursor-pointer items-center gap-1 rounded-md px-2.5 text-sm font-semibold"
            style={{
              background: "var(--aca-white)",
              color: "var(--aca-gray-500)",
              border: "1px solid var(--aca-gray-200)",
            }}
          >
            <History className="size-3.5" />
            히스토리
          </button>
          <button
            type="button"
            className="flex h-[27px] cursor-pointer items-center gap-1 rounded-md px-2.5 text-sm font-semibold"
            style={{
              background: "var(--aca-white)",
              color: "var(--aca-gray-500)",
              border: "1px solid var(--aca-gray-200)",
            }}
          >
            <Save className="size-3.5" />
            임시저장
          </button>
          <button
            type="button"
            className="flex h-[27px] cursor-pointer items-center gap-1 rounded-md px-2.5 text-sm font-semibold"
            style={{
              background: "var(--aca-black)",
              color: "var(--aca-white)",
              border: "none",
            }}
          >
            <Save className="size-3.5" />
            확정·발송
          </button>
        </div>
      </div>

      <div
        className="grid overflow-hidden rounded-md"
        style={{
          gridTemplateColumns: "auto 1fr 1fr 1fr 1fr 1fr 1fr",
          background: "var(--aca-gray-10)",
          border: "1px solid var(--aca-gray-100)",
        }}
      >
        <MetricCell
          label="항목"
          value={`${summary.itemCount}개`}
          hint="+수업 6 · +수업외 3 · -조교 2"
        />
        <MetricCell label="지급 합계" value={formatKRW(summary.gross)} positive />
        <MetricCell label="차감 합계" value={formatKRW(summary.deduct)} negative />
        <MetricCell label="정산액" value={formatKRW(summary.settle)} />
        <MetricCell label="원천세 (3.3%)" value={formatKRW(summary.wth)} />
        <MetricCell label="과세기준액" value={formatKRW(summary.taxable)} />
        <MetricCell label="실지급액" value={formatKRW(summary.net)} highlight />
      </div>
    </div>
  );
}
