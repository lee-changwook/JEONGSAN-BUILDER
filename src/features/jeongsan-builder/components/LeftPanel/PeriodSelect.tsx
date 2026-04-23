"use client";

import { ChevronDown } from "lucide-react";

interface PeriodSelectProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

export function PeriodSelect({ label, value, options, onChange }: PeriodSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--aca-gray-500)]">
        {label}
      </label>
      <div
        className={`relative flex h-[27px] items-center rounded-[4px] border bg-[var(--aca-white)] ${
          value ? "border-[var(--aca-gray-300)]" : "border-[var(--aca-gray-200)]"
        }`}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-full w-full cursor-pointer appearance-none border-none bg-transparent pr-7 pl-2 font-[inherit] text-[13px] text-[var(--aca-black)] outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-[var(--aca-gray-500)]" />
      </div>
    </div>
  );
}
