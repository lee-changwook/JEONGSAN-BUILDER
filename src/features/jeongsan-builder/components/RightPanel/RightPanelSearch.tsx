"use client";

import { ChevronDown, Search as SearchIcon } from "lucide-react";

export type SortOrder = "default" | "net-desc" | "net-asc";

interface RightPanelSearchProps {
  value: string;
  onChange: (value: string) => void;
  sortOrder: SortOrder;
  onSortChange: (order: SortOrder) => void;
  disabled?: boolean;
}

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: "default", label: "기본순" },
  { value: "net-desc", label: "실지급액 높은순" },
  { value: "net-asc", label: "실지급액 낮은순" },
];

export function RightPanelSearch({
  value,
  onChange,
  sortOrder,
  onSortChange,
  disabled,
}: RightPanelSearchProps) {
  return (
    <div className="flex gap-1.5" style={{ opacity: disabled ? 0.6 : 1 }}>
      <div
        className="flex h-8 flex-1 items-stretch overflow-hidden rounded-[4px]"
        style={{
          background: "var(--aca-white)",
          border: "1px solid var(--aca-gray-200)",
        }}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="검색"
          disabled={disabled}
          className="min-w-0 flex-1 border-none bg-transparent px-2.5 text-[13px] outline-none"
          style={{ fontFamily: "inherit" }}
        />
        <div
          className="flex items-center px-2.5"
          style={{ color: "var(--aca-gray-400)" }}
        >
          <SearchIcon className="size-3.5" />
        </div>
      </div>

      <div
        className="relative flex h-8 shrink-0 items-center rounded-[4px]"
        style={{
          background: sortOrder !== "default" ? "var(--aca-blue-100)" : "var(--aca-white)",
          border: `1px solid ${sortOrder !== "default" ? "var(--aca-blue-200)" : "var(--aca-gray-200)"}`,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <select
          value={sortOrder}
          onChange={(e) => onSortChange(e.target.value as SortOrder)}
          disabled={disabled}
          className="h-full cursor-pointer appearance-none border-none bg-transparent py-0 pr-6 pl-2.5 text-xs font-semibold outline-none disabled:cursor-not-allowed"
          style={{
            fontFamily: "inherit",
            color: sortOrder !== "default" ? "var(--aca-blue-primary)" : "var(--aca-gray-500)",
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-1.5 size-3"
          style={{
            color: sortOrder !== "default" ? "var(--aca-blue-primary)" : "var(--aca-gray-400)",
          }}
        />
      </div>
    </div>
  );
}
