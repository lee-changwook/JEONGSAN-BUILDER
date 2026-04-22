"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

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

interface MiniDropdownProps {
  label: string;
}

export function MiniDropdown({ label }: MiniDropdownProps) {
  return (
    <button
      type="button"
      className="flex h-7 w-full cursor-pointer items-center justify-between rounded-[4px] px-2 text-xs"
      style={{
        background: "var(--aca-white)",
        color: "var(--aca-black)",
        border: "1px solid var(--aca-gray-200)",
        fontFamily: "inherit",
      }}
    >
      <span className="truncate">{label}</span>
      <ChevronDown className="size-3.5" style={{ color: "var(--aca-gray-500)" }} />
    </button>
  );
}

interface MiniInputProps {
  value: string;
  onChange?: (value: string) => void;
  align?: "left" | "right";
  highlighted?: boolean;
  onMouseDown?: (event: ReactMouseEvent<HTMLInputElement>) => void;
  onMouseEnter?: (event: ReactMouseEvent<HTMLInputElement>) => void;
}

export function MiniInput({
  value,
  onChange,
  align = "right",
  highlighted,
  onMouseDown,
  onMouseEnter,
}: MiniInputProps) {
  const border = highlighted
    ? "var(--aca-blue-primary)"
    : value
      ? "var(--aca-gray-300)"
      : "var(--aca-gray-200)";

  return (
    <div
      className="flex h-7 items-center rounded-[4px] px-2"
      style={{
        background: highlighted ? "var(--aca-blue-10)" : "var(--aca-white)",
        border: `1px solid ${border}`,
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        className="w-full min-w-0 border-none bg-transparent p-0 text-xs outline-none"
        style={{
          color: "var(--aca-black)",
          textAlign: align,
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}
