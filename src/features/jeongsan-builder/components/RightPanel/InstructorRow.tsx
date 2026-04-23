"use client";

import { MiniCheckbox } from "@/features/jeongsan-builder/components/MiniControls";

export type InstructorDot = "green" | "yellow";

interface InstructorRowProps {
  name: string;
  subject: string;
  amount: string;
  dot: InstructorDot;
  active: boolean;
  exportChecked: boolean;
  onClick: () => void;
  onToggleExport: () => void;
}

export function InstructorRow({
  name,
  subject,
  amount,
  dot,
  active,
  exportChecked,
  onClick,
  onToggleExport,
}: InstructorRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`flex cursor-pointer items-center gap-2.5 border-b border-l-[3px] border-b-[var(--aca-gray-100)] px-3.5 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        active
          ? "border-l-[var(--aca-yellow-primary)] bg-[var(--aca-yellow-10)]"
          : "border-l-transparent bg-transparent"
      }`}
    >
      <MiniCheckbox
        checked={exportChecked}
        onChange={onToggleExport}
        color="#2BB673"
        ariaLabel={`${name} export 선택`}
      />
      <span
        className={`size-2 shrink-0 rounded-full ${
          dot === "yellow" ? "bg-[var(--aca-yellow-primary)]" : "bg-[#1E8E5C]"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold tracking-[-0.2px] text-[var(--aca-black)]">
          {name}
        </div>
        <div className="mt-px text-xs text-[var(--aca-gray-500)]">
          {subject} ·{" "}
          <span className="jb2-tnum font-medium text-[var(--aca-gray-600)]">
            {amount}
          </span>
        </div>
      </div>
    </div>
  );
}
