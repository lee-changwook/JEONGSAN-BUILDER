"use client";

import { Check } from "lucide-react";

interface MiniCheckboxProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  color?: string;
  ariaLabel?: string;
}

export function MiniCheckbox({ checked, onChange, color, ariaLabel }: MiniCheckboxProps) {
  const fill = color ?? "var(--aca-blue-primary)";
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
          className="flex size-4 items-center justify-center rounded-[3px]"
          style={{ background: fill }}
        >
          <Check className="size-2.5" style={{ color: "var(--aca-white)" }} strokeWidth={3} />
        </span>
      ) : (
        <span
          className="size-[14px] rounded-[3px]"
          style={{
            background: "var(--aca-white)",
            border: "1.5px solid var(--aca-gray-300)",
          }}
        />
      )}
    </button>
  );
}
