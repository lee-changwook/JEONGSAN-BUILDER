"use client";

import { Check } from "lucide-react";

type CheckboxColor = "blue" | "green";

interface MiniCheckboxProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  /**
   * 호환성을 위해 string도 받지만 실제 사용되는 값은
   * - "#2BB673" 또는 그 외(default) → green
   * - "var(--aca-blue-primary)" 또는 "blue" → blue
   *
   * 새 코드에서는 "blue" | "green" 사용 권장.
   */
  color?: CheckboxColor | string;
  ariaLabel?: string;
}

function resolveColor(color?: CheckboxColor | string): CheckboxColor {
  if (color === "green" || color === "#2BB673") return "green";
  return "blue";
}

export function MiniCheckbox({ checked, onChange, color, ariaLabel }: MiniCheckboxProps) {
  const resolved = resolveColor(color);
  const fillClass =
    resolved === "green" ? "bg-[#2BB673]" : "bg-[var(--aca-blue-primary)]";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      className="flex size-4 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0"
    >
      {checked ? (
        <span
          className={`flex size-4 items-center justify-center rounded-[3px] ${fillClass}`}
        >
          <Check className="size-2.5 text-[var(--aca-white)]" strokeWidth={3} />
        </span>
      ) : (
        <span className="size-[14px] rounded-[3px] border-[1.5px] border-[var(--aca-gray-300)] bg-[var(--aca-white)]" />
      )}
    </button>
  );
}
