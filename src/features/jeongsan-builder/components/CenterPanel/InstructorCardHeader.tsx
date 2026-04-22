"use client";

import { formatKRW } from "@/features/jeongsan-builder/calculator";
import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";

interface MetricCellProps {
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
  negative?: boolean;
  highlight?: boolean;
}

function MetricCell({
  label,
  value,
  hint,
  positive,
  negative,
  highlight,
}: MetricCellProps) {
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

export function InstructorCardHeader() {
  const calculator = useBuilderStore((s) => s.calculator);
  const activeTeacherId = useBuilderStore((s) => s.activeTeacherId);

  if (!calculator || !activeTeacherId) return null;
  const teacher = calculator.getTeacher(activeTeacherId);
  const summary = calculator.getTeacherSummary(activeTeacherId);
  if (!teacher || !summary) return null;

  const itemHint = [
    summary.revenueCount > 0 ? `+수업 ${summary.revenueCount}` : null,
    summary.plusCount > 0 ? `+수업외 ${summary.plusCount}` : null,
    summary.minusCount > 0 ? `-차감 ${summary.minusCount}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
              {teacher.name}
            </span>
          </div>
          <div className="text-[13px]" style={{ color: "var(--aca-gray-500)" }}>
            {teacher.subjectLabel}
          </div>
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
          hint={itemHint || undefined}
        />
        <MetricCell label="지급 합계" value={formatKRW(summary.gross)} positive />
        <MetricCell label="차감 합계" value={formatKRW(summary.deduct)} negative />
        <MetricCell label="정산액" value={formatKRW(summary.settle)} />
        <MetricCell
          label="원천세 (3.3%)"
          value={formatKRW(Math.abs(summary.withholding))}
        />
        <MetricCell label="과세기준액" value={formatKRW(summary.taxable)} />
        <MetricCell label="실지급액" value={formatKRW(summary.net)} highlight />
      </div>
    </div>
  );
}
