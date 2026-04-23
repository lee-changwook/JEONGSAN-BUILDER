"use client";

import { useEffect, useRef, useState } from "react";

interface MiniInputProps {
  /** 외부에서 전달되는 정규화된 값. blur/Enter 후 동기화된다. */
  value: string;
  /** 사용자가 commit한 시점에 호출. raw string 그대로 전달. */
  onChange?: (value: string) => void;
  align?: "left" | "right";
  /** Excel-like 셀 선택 hit-test용. 셀 선택 대상이 아니면 둘 다 omit. */
  cellId?: string;
  cellCol?: "value" | "customBase";
  /** 셀이 현재 다중 선택의 일부일 때 outline 표시. */
  cellSelected?: boolean;
}

/**
 * 숫자 입력용 mini input.
 *
 * 입력 중간 상태("0.", "0.0" 등)가 부모 state에 즉시 전파되어
 * `Number()` 변환으로 사용자 의도가 잘리는 문제를 막기 위해,
 * **편집 중에는 로컬 raw string을 보관**하고 blur/Enter 시점에만 부모로 commit한다.
 *
 * 외부에서 value가 변경되면 (예: bulk apply) 편집 중이 아닐 때만 동기화한다.
 */
export function MiniInput({
  value,
  onChange,
  align = "right",
  cellId,
  cellCol,
  cellSelected,
}: MiniInputProps) {
  const [draft, setDraft] = useState(value);
  const editingRef = useRef(false);

  // 외부 value 변화 → 편집 중이 아닐 때만 draft에 반영
  useEffect(() => {
    if (!editingRef.current) {
      setDraft(value);
    }
  }, [value]);

  function commit() {
    editingRef.current = false;
    if (draft !== value) {
      onChange?.(draft);
    }
  }

  const borderClass = draft
    ? "border-[var(--aca-gray-300)]"
    : "border-[var(--aca-gray-200)]";
  const selectedClass = cellSelected
    ? "shadow-[inset_0_0_0_2px_var(--aca-blue-primary)]"
    : "";

  return (
    <div
      className={`flex h-7 items-center rounded-[4px] border bg-[var(--aca-white)] px-2 ${borderClass} ${selectedClass}`}
      data-cell-id={cellId}
      data-cell-col={cellCol}
    >
      <input
        value={draft}
        onChange={(e) => {
          editingRef.current = true;
          setDraft(e.target.value);
        }}
        onFocus={() => {
          editingRef.current = true;
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            // 변경 취소 — 외부 value로 되돌림
            editingRef.current = false;
            setDraft(value);
            (e.target as HTMLInputElement).blur();
          }
        }}
        inputMode="decimal"
        className={`w-full min-w-0 border-none bg-transparent p-0 font-[inherit] text-xs text-[var(--aca-black)] outline-none ${
          align === "right" ? "text-right" : "text-left"
        }`}
      />
    </div>
  );
}
