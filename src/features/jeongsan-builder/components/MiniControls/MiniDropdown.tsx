"use client";

import { ChevronDown } from "lucide-react";

export interface MiniDropdownOption<T extends string = string> {
  value: T;
  label: string;
}

interface MiniDropdownProps<T extends string = string> {
  value: T;
  options: ReadonlyArray<MiniDropdownOption<T>>;
  onChange?: (value: T) => void;
  disabled?: boolean;
}

export function MiniDropdown<T extends string = string>({
  value,
  options,
  onChange,
  disabled,
}: MiniDropdownProps<T>) {
  return (
    <div
      className="relative flex h-7 w-full items-center rounded-[4px] px-2 text-xs"
      style={{
        background: disabled ? "var(--aca-gray-10)" : "var(--aca-white)",
        color: "var(--aca-black)",
        border: "1px solid var(--aca-gray-200)",
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value as T)}
        className="w-full cursor-pointer appearance-none border-none bg-transparent pr-5 text-xs outline-none"
        style={{
          color: "var(--aca-black)",
          fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 size-3.5"
        style={{ color: "var(--aca-gray-500)" }}
      />
    </div>
  );
}
