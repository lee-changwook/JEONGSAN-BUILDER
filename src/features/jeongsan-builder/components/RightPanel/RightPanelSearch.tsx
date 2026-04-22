"use client";

import { ChevronDown, Filter, Search as SearchIcon } from "lucide-react";

interface RightPanelSearchProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function RightPanelSearch({ value, onChange, disabled }: RightPanelSearchProps) {
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
      <button
        type="button"
        disabled={disabled}
        className="flex size-8 shrink-0 items-center justify-center rounded-[4px] disabled:cursor-not-allowed"
        style={{
          background: "var(--aca-white)",
          border: "1px solid var(--aca-gray-200)",
          color: disabled ? "var(--aca-gray-300)" : "var(--aca-gray-500)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        aria-label="필터"
      >
        <Filter className="size-3.5" />
      </button>
      <button
        type="button"
        disabled={disabled}
        className="flex h-8 shrink-0 items-center gap-0.5 rounded-[4px] px-2.5 text-xs font-semibold disabled:cursor-not-allowed"
        style={{
          background: disabled ? "var(--aca-gray-10)" : "var(--aca-blue-100)",
          color: disabled ? "var(--aca-gray-400)" : "var(--aca-blue-primary)",
          border: `1px solid ${
            disabled ? "var(--aca-gray-200)" : "var(--aca-blue-200)"
          }`,
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "inherit",
        }}
      >
        정렬
        <ChevronDown className="size-3" />
      </button>
    </div>
  );
}
