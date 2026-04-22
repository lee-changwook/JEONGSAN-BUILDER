"use client";

import { useEffect, useRef, useState } from "react";

import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";

interface DragState {
  anchorIndex: number;
  value: string;
  hoverIndex: number | null;
}

/**
 * Shift+드래그로 특정 행의 aux 값을 연속된 행들에 일괄 적용.
 * 드래그 시작 후 shift 키를 누른 채 다른 행의 aux 셀 위로 이동하면
 * [anchor, current] 범위가 선택 상태로 하이라이트되고, mouseup에 일괄 반영된다.
 */
export function useAuxDrag() {
  const applyAuxRange = useBuilderStore((s) => s.applyAuxRange);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(() => {
    if (!drag) return;

    function handleMouseUp() {
      const current = dragRef.current;
      if (current && current.hoverIndex !== null) {
        applyAuxRange(current.anchorIndex, current.hoverIndex, current.value);
      }
      setDrag(null);
    }

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [drag, applyAuxRange]);

  function beginDrag(index: number, value: string, shift: boolean) {
    if (!shift) return;
    setDrag({ anchorIndex: index, value, hoverIndex: index });
  }

  function hoverDrag(index: number) {
    setDrag((prev) => (prev ? { ...prev, hoverIndex: index } : prev));
  }

  function isHighlighted(index: number): boolean {
    if (!drag || drag.hoverIndex === null) return false;
    const [start, end] =
      drag.anchorIndex <= drag.hoverIndex
        ? [drag.anchorIndex, drag.hoverIndex]
        : [drag.hoverIndex, drag.anchorIndex];
    return index >= start && index <= end;
  }

  return { beginDrag, hoverDrag, isHighlighted, dragActive: drag !== null };
}
