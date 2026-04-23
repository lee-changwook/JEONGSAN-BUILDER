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
      className={`relative flex h-7 w-full items-center rounded-[4px] border border-[var(--aca-gray-200)] px-2 font-[inherit] text-xs text-[var(--aca-black)] ${
        disabled
          ? "cursor-not-allowed bg-[var(--aca-gray-10)]"
          : "cursor-pointer bg-[var(--aca-white)]"
      }`}
    >
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value as T)}
        className={`w-full appearance-none border-none bg-transparent pr-5 font-[inherit] text-xs text-[var(--aca-black)] outline-none ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-[var(--aca-gray-500)]" />
    </div>
  );
}
