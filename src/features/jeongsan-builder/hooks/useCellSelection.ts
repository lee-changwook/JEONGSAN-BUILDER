"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export type CellCol = "base" | "op" | "value" | "customBase" | "taxable";

// 테이블 컬럼의 시각적 좌→우 순서로 정렬.
// customBase는 revenue+direct일 때 base 자리에 중첩 렌더되지만, 논리적으로는
// value 계열로 묶어 rect-select 시 자연스러운 묶음이 되도록 뒤에 둔다.
const CELL_COLS: ReadonlyArray<CellCol> = [
  "base",
  "op",
  "value",
  "customBase",
  "taxable",
];

export interface DraggableMap {
  /** ruleId → 드래그 가능한 컬럼 집합. customBase는 cat !== 'revenue', value는 op.needsAux. */
  get(ruleId: string): ReadonlySet<CellCol> | undefined;
}

export interface CellSelectionApi {
  /** 셀 outline 표시용. */
  isSelected(ruleId: string, col: CellCol): boolean;
  /** 테이블 wrapper props. */
  wrapperProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    style?: React.CSSProperties;
  };
  /** 외부에서 selection을 강제로 비울 때 (예: 강사 변경). */
  clear(): void;
  /** 현재 선택된 셀 키 목록 (`${ruleId}|${col}`). */
  selectedKeys: ReadonlySet<string>;
}

/**
 * Excel-like 셀 사각형 선택. (co-fi RuleTable.tsx 패턴 이식)
 *
 * 동작:
 * - wrapper 위에서 mousedown → 드래그 시작 (앵커 셀 기록).
 * - mousemove → 앵커~현재 셀의 사각형 영역을 selectedKeys로 교체.
 * - mouseup → 드래그 종료. selection은 유지된다 (Excel처럼).
 * - 빈 공간 클릭 → selection clear.
 * - 셀 자체는 `data-cell-id={ruleId}` `data-cell-col={col}` 속성을 부착해야 hit-test 됨.
 *
 * 입력 처리:
 * - 한 셀의 input value 변경 시 호출자가 `selectedKeys`를 보고 다중 적용 여부를 결정한다.
 *   본 훅은 selection 상태만 관리한다.
 */
export function useCellSelection(
  orderedRuleIds: ReadonlyArray<string>,
  draggable: DraggableMap,
): CellSelectionApi {
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const dragRef = useRef<{ startId: string; startCol: CellCol } | null>(null);

  const ruleIndex = useMemo(() => {
    const m = new Map<string, number>();
    orderedRuleIds.forEach((id, i) => m.set(id, i));
    return m;
  }, [orderedRuleIds]);

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent): {
      id: string;
      col: CellCol;
    } | null => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-cell-id][data-cell-col]",
      );
      if (!cell) return null;
      const id = cell.dataset.cellId;
      const col = cell.dataset.cellCol as CellCol | undefined;
      if (!id || !col) return null;
      return { id, col };
    },
    [],
  );

  const computeRect = useCallback(
    (
      startId: string,
      startCol: CellCol,
      endId: string,
      endCol: CellCol,
    ): Set<string> => {
      const startIdx = ruleIndex.get(startId);
      const endIdx = ruleIndex.get(endId);
      if (startIdx === undefined || endIdx === undefined) return new Set();
      const [rFrom, rTo] = [startIdx, endIdx].sort((a, b) => a - b);
      const startColIdx = CELL_COLS.indexOf(startCol);
      const endColIdx = CELL_COLS.indexOf(endCol);
      const [cFrom, cTo] = [startColIdx, endColIdx].sort((a, b) => a - b);
      const next = new Set<string>();
      for (let r = rFrom; r <= rTo; r++) {
        const ruleId = orderedRuleIds[r];
        const allowed = draggable.get(ruleId);
        if (!allowed) continue;
        for (let c = cFrom; c <= cTo; c++) {
          const colName = CELL_COLS[c];
          if (allowed.has(colName)) next.add(`${ruleId}|${colName}`);
        }
      }
      return next;
    },
    [ruleIndex, orderedRuleIds, draggable],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const cell = getCellFromEvent(e);
      if (!cell) {
        // 빈 공간 클릭 → selection 해제
        if (selected.size > 0) setSelected(new Set());
        return;
      }
      // 드래그 가능 컬럼이 아니면 무시
      const allowed = draggable.get(cell.id);
      if (!allowed?.has(cell.col)) {
        if (selected.size > 0) setSelected(new Set());
        return;
      }
      const key = `${cell.id}|${cell.col}`;
      // 이미 multi-selection(2개 이상)의 일부인 셀을 다시 mousedown하면
      // selection도 dragRef도 건드리지 않는다. 이렇게 해야:
      //   1) 후속 click에서 드롭다운/체크박스가 열려 bulk 적용 가능
      //   2) mousedown 직후의 미세한 mousemove가 rect를 새로 계산해 selection을
      //      1개로 축소해버리는 문제를 방지
      // 다른 셀로 drag를 시작하려면 바깥 영역을 먼저 클릭해 selection을 비운 뒤 시작.
      if (selected.has(key) && selected.size > 1) {
        return;
      }
      dragRef.current = { startId: cell.id, startCol: cell.col };
      setSelected(new Set([key]));
    },
    [getCellFromEvent, selected, draggable],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;
      const cell = getCellFromEvent(e);
      if (!cell) return;
      const next = computeRect(
        dragRef.current.startId,
        dragRef.current.startCol,
        cell.id,
        cell.col,
      );
      setSelected(next);
    },
    [getCellFromEvent, computeRect],
  );

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onMouseLeave = useCallback(() => {
    // 테이블 영역을 벗어나면 드래그만 종료. selection은 유지.
    dragRef.current = null;
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  return {
    isSelected: (ruleId, col) => selected.has(`${ruleId}|${col}`),
    wrapperProps: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
    },
    clear,
    selectedKeys: selected,
  };
}
