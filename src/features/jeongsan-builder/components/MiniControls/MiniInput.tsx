"use client";

import { useState } from "react";

interface MiniInputProps {
  /** 외부에서 전달되는 정규화된 값. blur/Enter 후 동기화된다. */
  value: string;
  /** 사용자가 commit한 시점에 호출. raw string 그대로 전달. */
  onChange?: (value: string) => void;
  /** 편집 중인 raw 값을 부모로 broadcast. 그룹 미리보기에 사용. */
  onDraftChange?: (draft: string) => void;
  /** 편집 시작/종료 시점 알림. 부모가 그룹 편집 주체를 식별하는 데 사용. */
  onEditingChange?: (editing: boolean) => void;
  align?: "left" | "right";
  /** Excel-like 셀 선택 hit-test용. 셀 선택 대상이 아니면 둘 다 omit. */
  cellId?: string;
  cellCol?: "value" | "customBase";
  /** 셀이 현재 다중 선택의 일부일 때 outline 표시. */
  cellSelected?: boolean;
  /**
   * 같은 그룹 내 다른 셀이 편집 중일 때 화면에 표시할 미리보기 값.
   * 본 셀이 편집 중이 아니고 이 값이 정의되어 있을 때 input에 표시되며,
   * 외부 value commit 후 자연스럽게 정규화 값으로 대체된다.
   */
  groupDraft?: string;
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
  onDraftChange,
  onEditingChange,
  align = "right",
  cellId,
  cellCol,
  cellSelected,
  groupDraft,
}: MiniInputProps) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const [lastSyncedValue, setLastSyncedValue] = useState(value);

  // 외부 value 변화를 render 중 감지해 draft에 반영 (편집 중이 아닐 때만).
  // useEffect + setState 우회로, React 권장 "prop 변화 시 state 조정" 패턴.
  if (!editing && value !== lastSyncedValue) {
    setLastSyncedValue(value);
    setDraft(value);
  }

  function commit() {
    if (editing) {
      setEditing(false);
      onEditingChange?.(false);
    }
    if (draft !== value) {
      onChange?.(draft);
    }
  }

  // 본 셀이 편집 중이 아니고 그룹 편집 주체가 broadcast 중이면 그 값을 표시한다.
  const displayValue =
    !editing && groupDraft !== undefined ? groupDraft : draft;

  // broadcast 중인 셀(편집 주체가 아니지만 그룹 미리보기를 받는 셀): 더 진한 강조 표시.
  const isBroadcasting = !editing && groupDraft !== undefined;
  const borderClass = displayValue
    ? "border-[var(--aca-gray-300)]"
    : "border-[var(--aca-gray-200)]";
  const selectedClass = isBroadcasting
    ? "shadow-[inset_0_0_0_3px_var(--aca-blue-primary)]"
    : cellSelected
      ? "shadow-[inset_0_0_0_2px_var(--aca-blue-primary)]"
      : "";
  const bgClass = isBroadcasting
    ? "bg-[var(--aca-blue-100)]"
    : "bg-[var(--aca-white)]";

  return (
    <div
      className={`flex h-7 items-center rounded-[4px] border px-2 ${bgClass} ${borderClass} ${selectedClass}`}
      data-cell-id={cellId}
      data-cell-col={cellCol}
    >
      <input
        value={displayValue}
        onChange={(e) => {
          if (!editing) {
            setEditing(true);
            onEditingChange?.(true);
          }
          setDraft(e.target.value);
          onDraftChange?.(e.target.value);
        }}
        onFocus={() => {
          if (!editing) {
            setEditing(true);
            onEditingChange?.(true);
          }
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            // 변경 취소 — 외부 value로 되돌림
            if (editing) {
              setEditing(false);
              onEditingChange?.(false);
            }
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
