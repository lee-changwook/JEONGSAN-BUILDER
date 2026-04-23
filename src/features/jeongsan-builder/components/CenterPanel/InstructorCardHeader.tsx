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
  const valueColorClass = highlight
    ? "text-[var(--aca-blue-primary)]"
    : positive
      ? "text-[var(--aca-green)]"
      : negative
        ? "text-[var(--aca-red-primary)]"
        : "text-[var(--aca-black)]";
  const valueSizeClass = highlight
    ? "text-[15px] font-bold"
    : "text-[13.5px] font-semibold";
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-r border-[var(--aca-gray-100)] px-3 py-2.5">
      <div className="text-[10.5px] font-medium text-[var(--aca-gray-500)]">
        {label}
      </div>
      <div
        className={`jb2-tnum truncate tracking-[-0.2px] ${valueSizeClass} ${valueColorClass}`}
      >
        {value}
      </div>
      {hint && (
        <div className="truncate text-[10px] text-[var(--aca-gray-400)]">
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
    <div className="flex flex-col gap-3.5 border-b border-[var(--aca-gray-100)] bg-[var(--aca-white)] px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-[22px] font-bold tracking-[-0.3px] text-[var(--aca-black)]">
              {teacher.name}
            </span>
          </div>
          <div className="text-[13px] text-[var(--aca-gray-500)]">
            {teacher.subjectLabel}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] overflow-hidden rounded-md border border-[var(--aca-gray-100)] bg-[var(--aca-gray-10)]">
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
