"use client";

import { MiniCheckbox } from "@/features/jeongsan-builder/components/MiniControls";
import type { InstructorListItem } from "@/features/jeongsan-builder/types";

interface InstructorRowProps extends Omit<InstructorListItem, "active"> {
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
      className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      style={{
        background: active ? "var(--aca-yellow-10)" : "transparent",
        borderBottom: "1px solid var(--aca-gray-100)",
        borderLeft: active
          ? "3px solid var(--aca-yellow-primary)"
          : "3px solid transparent",
      }}
    >
      <MiniCheckbox
        checked={exportChecked}
        onChange={onToggleExport}
        color="#2BB673"
        ariaLabel={`${name} export 선택`}
      />
      <span
        className="size-2 shrink-0 rounded-full"
        style={{
          background: dot === "yellow" ? "var(--aca-yellow-primary)" : "#1E8E5C",
        }}
      />
      <div className="min-w-0 flex-1">
        <div
          className="text-sm font-bold tracking-[-0.2px]"
          style={{ color: "var(--aca-black)" }}
        >
          {name}
        </div>
        <div className="mt-px text-xs" style={{ color: "var(--aca-gray-500)" }}>
          {subject} ·{" "}
          <span
            className="jb2-tnum"
            style={{ color: "var(--aca-gray-600)", fontWeight: 500 }}
          >
            {amount}
          </span>
        </div>
      </div>
    </div>
  );
}
