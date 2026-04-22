import ExcelJS from "exceljs";
import type { PayBlockSnapshot, PayBlockSnapshotCell, PayBlockSnapshotMerge } from "@/jeongsan/features/types";
import { text } from "@/jeongsan/features/utils";

const SNAPSHOT_VERSION = 1;

function columnNumberFromAddress(address: string): number {
  const letters = address.replace(/\d+/g, "").toUpperCase();
  return letters.split("").reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0);
}

function rowFromAddress(address: string): number {
  return Number(address.replace(/^[A-Z]+/i, ""));
}

function parseMergeBounds(
  worksheet: ExcelJS.Worksheet,
  mergeRef: string,
): { top: number; left: number; bottom: number; right: number } | null {
  const parts = mergeRef.split(":");
  if (parts.length < 2) {
    return null;
  }
  const startAddress = worksheet.getCell(parts[0]).address;
  const endAddress = worksheet.getCell(parts[parts.length - 1]).address;
  return {
    top: rowFromAddress(startAddress),
    left: columnNumberFromAddress(startAddress),
    bottom: rowFromAddress(endAddress),
    right: columnNumberFromAddress(endAddress),
  };
}

function rectsOverlap(
  r0: number,
  r1: number,
  c0: number,
  c1: number,
  t: number,
  b: number,
  l: number,
  rr: number,
): boolean {
  return !(r1 < t || b < r0 || c1 < l || rr < c0);
}

/**
 * 강좌별 시트에서 첫 슬롯은 A열에 NO.·강사·월 라벨이 붙고, 두 번째 슬롯부터는 왼쪽이 PAY 열이라 NO. 열이 없음(raw/pay-docs-2 등).
 * 스냅샷은 학생명 열만 기준으로 자르면 첫 박스에서 A열이 빠져 제목·행 높이가 어색해진다.
 */
export function snapshotColumnStartForPayBlock(
  worksheet: ExcelJS.Worksheet,
  headerRowIndex: number,
  studentNameCol: number,
): number {
  if (studentNameCol <= 1) {
    return studentNameCol;
  }
  const leftHeader = text(worksheet.getRow(headerRowIndex).getCell(studentNameCol - 1).value).trim();
  const compact = leftHeader.replace(/\s+/g, "");
  const isNoColumn =
    compact === "NO." ||
    compact === "NO" ||
    /^NO\.?$/iu.test(compact);
  if (isNoColumn) {
    return studentNameCol - 1;
  }
  return studentNameCol;
}

/**
 * 직사각형과 겹치는 머지 영역이 있으면 그 머지 전체를 포함하도록 경계를 넓힙니다.
 */
export function expandBoundsForMerges(
  worksheet: ExcelJS.Worksheet,
  rowStart: number,
  rowEnd: number,
  colStart: number,
  colEnd: number,
): { rowStart: number; rowEnd: number; colStart: number; colEnd: number } {
  const merges = worksheet.model.merges ?? [];
  let r0 = rowStart;
  let r1 = rowEnd;
  let c0 = colStart;
  let c1 = colEnd;
  for (let iter = 0; iter < 20; iter += 1) {
    let changed = false;
    for (const mergeRef of merges) {
      const m = parseMergeBounds(worksheet, mergeRef);
      if (!m) {
        continue;
      }
      if (!rectsOverlap(r0, r1, c0, c1, m.top, m.bottom, m.left, m.right)) {
        continue;
      }
      const nr0 = Math.min(r0, m.top);
      const nr1 = Math.max(r1, m.bottom);
      const nc0 = Math.min(c0, m.left);
      const nc1 = Math.max(c1, m.right);
      if (nr0 !== r0 || nr1 !== r1 || nc0 !== c0 || nc1 !== c1) {
        r0 = nr0;
        r1 = nr1;
        c0 = nc0;
        c1 = nc1;
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return { rowStart: r0, rowEnd: r1, colStart: c0, colEnd: c1 };
}

function safeJsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {}));
}

/**
 * 공유 수식/수식은 스냅샷에 넣으면 붙여넣기 위치가 바뀔 때 ExcelJS가
 * "Shared Formula master must exist above and or left of clone" 로 실패한다.
 * 페이문서 세부내역은 겉보기 값만 유지하면 되므로 결과값·표시 텍스트만 저장한다.
 */
function normalizeSnapshotCellValue(sourceCell: ExcelJS.Cell): unknown {
  const v = sourceCell.value;
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v !== "object") {
    return v;
  }
  if ("richText" in v) {
    try {
      JSON.stringify(v);
      return v;
    } catch {
      return sourceCell.text;
    }
  }
  if ("hyperlink" in v && "text" in v) {
    try {
      JSON.stringify(v);
      return v;
    } catch {
      return sourceCell.text;
    }
  }
  if ("formula" in v || "sharedFormula" in v) {
    const fromValue = (v as { result?: unknown }).result;
    if (fromValue !== undefined && fromValue !== null) {
      return fromValue;
    }
    const r = sourceCell.result;
    if (r !== undefined && r !== null && String(r) !== "") {
      return r;
    }
    return sourceCell.text;
  }
  try {
    JSON.stringify(v);
    return v;
  } catch {
    return sourceCell.text;
  }
}

function cloneCellSnapshot(sourceCell: ExcelJS.Cell): PayBlockSnapshotCell {
  const value = normalizeSnapshotCellValue(sourceCell);
  return {
    value,
    numFmt: sourceCell.numFmt,
    style: safeJsonClone(sourceCell.style),
    alignment: safeJsonClone(sourceCell.alignment),
    border: safeJsonClone(sourceCell.border),
    fill: safeJsonClone(sourceCell.fill),
    font: safeJsonClone(sourceCell.font),
    protection: safeJsonClone(sourceCell.protection),
  };
}

export function extractRectSnapshot(
  worksheet: ExcelJS.Worksheet,
  rowStart: number,
  rowEnd: number,
  colStart: number,
  colEnd: number,
): PayBlockSnapshot {
  const expanded = expandBoundsForMerges(worksheet, rowStart, rowEnd, colStart, colEnd);
  const { rowStart: rs, rowEnd: re, colStart: cs, colEnd: ce } = expanded;
  const rowCount = re - rs + 1;
  const colCount = ce - cs + 1;
  const cells: PayBlockSnapshotCell[][] = [];
  const rowHeights: (number | undefined)[] = [];
  for (let r = 0; r < rowCount; r += 1) {
    const row: PayBlockSnapshotCell[] = [];
    const sourceRow = worksheet.getRow(rs + r);
    rowHeights.push(sourceRow.height ?? undefined);
    for (let c = 0; c < colCount; c += 1) {
      row.push(cloneCellSnapshot(sourceRow.getCell(cs + c)));
    }
    cells.push(row);
  }
  const columnWidths: (number | undefined)[] = [];
  const columnStyles: unknown[] = [];
  const columnHidden: boolean[] = [];
  for (let c = 0; c < colCount; c += 1) {
    const column = worksheet.getColumn(cs + c);
    columnWidths.push(column.width ?? undefined);
    columnStyles.push(safeJsonClone(column.style));
    columnHidden.push(Boolean(column.hidden));
  }
  const defaultRowHeight = worksheet.properties.defaultRowHeight;
  const merges: PayBlockSnapshotMerge[] = [];
  for (const mergeRef of worksheet.model.merges ?? []) {
    const m = parseMergeBounds(worksheet, mergeRef);
    if (!m) {
      continue;
    }
    if (!rectsOverlap(rs, re, cs, ce, m.top, m.bottom, m.left, m.right)) {
      continue;
    }
    const clippedTop = Math.max(m.top, rs);
    const clippedBottom = Math.min(m.bottom, re);
    const clippedLeft = Math.max(m.left, cs);
    const clippedRight = Math.min(m.right, ce);
    if (clippedTop > clippedBottom || clippedLeft > clippedRight) {
      continue;
    }
    merges.push({
      top: clippedTop - rs + 1,
      left: clippedLeft - cs + 1,
      bottom: clippedBottom - rs + 1,
      right: clippedRight - cs + 1,
    });
  }
  return {
    version: SNAPSHOT_VERSION,
    rowCount,
    colCount,
    columnWidths,
    cells,
    merges,
    rowHeights,
    columnStyles,
    columnHidden,
    defaultRowHeight,
    sourceAbsoluteRowStart: rs,
    sourceAbsoluteColStart: cs,
  };
}

/** 예전 스냅샷·직렬화 잔여분에 수식 객체가 남았을 때 쓰기 오류 방지 */
function snapshotValueToExcelCellValue(raw: unknown): ExcelJS.CellValue {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== "object") {
    return raw as ExcelJS.CellValue;
  }
  if ("formula" in raw || "sharedFormula" in raw) {
    const r = (raw as { result?: unknown }).result;
    if (r !== undefined && r !== null) {
      return r as ExcelJS.CellValue;
    }
    return "";
  }
  return raw as ExcelJS.CellValue;
}

/** settlement `template.copyRowRange`와 동일 순서: 스타일·서식 후 마지막에 value */
function pasteCellLikeSettlement(targetCell: ExcelJS.Cell, cell: PayBlockSnapshotCell) {
  targetCell.style = safeJsonClone(cell.style) as ExcelJS.Style;
  targetCell.numFmt = cell.numFmt;
  targetCell.alignment = safeJsonClone(cell.alignment) as ExcelJS.Alignment;
  targetCell.border = safeJsonClone(cell.border) as ExcelJS.Borders;
  targetCell.fill = safeJsonClone(cell.fill) as ExcelJS.Fill;
  targetCell.font = safeJsonClone(cell.font) as ExcelJS.Font;
  targetCell.protection = safeJsonClone(cell.protection) as ExcelJS.Protection;
  try {
    targetCell.value = snapshotValueToExcelCellValue(cell.value);
  } catch {
    targetCell.value = String(cell.value ?? "");
  }
}

export function pasteSnapshotToSheet(
  sheet: ExcelJS.Worksheet,
  snapshot: PayBlockSnapshot,
  topRow: number,
  leftCol: number,
) {
  /* settlement: cloneWorksheetShell에서 열 먼저 → copyRowRange에서 행 높이·셀 */
  for (let c = 0; c < snapshot.colCount; c += 1) {
    const column = sheet.getColumn(leftCol + c);
    const w = snapshot.columnWidths[c];
    if (w !== undefined) {
      column.width = w;
    }
    const cs = snapshot.columnStyles?.[c];
    if (cs !== undefined && cs !== null) {
      column.style = safeJsonClone(cs) as ExcelJS.Style;
    }
    if (snapshot.columnHidden?.[c] !== undefined) {
      column.hidden = snapshot.columnHidden[c];
    }
  }
  for (let r = 0; r < snapshot.rowCount; r += 1) {
    const targetRow = sheet.getRow(topRow + r);
    const rh = snapshot.rowHeights?.[r];
    if (rh !== undefined && rh !== null && rh > 0) {
      targetRow.height = rh;
    }
    for (let c = 0; c < snapshot.colCount; c += 1) {
      const cell = snapshot.cells[r]?.[c];
      if (!cell) {
        continue;
      }
      pasteCellLikeSettlement(targetRow.getCell(leftCol + c), cell);
    }
  }
  for (const m of snapshot.merges) {
    if (m.top > m.bottom || m.left > m.right) {
      continue;
    }
    if (m.top === m.bottom && m.left === m.right) {
      continue;
    }
    sheet.mergeCells(topRow + m.top - 1, leftCol + m.left - 1, topRow + m.bottom - 1, leftCol + m.right - 1);
    const endCell = snapshot.cells[m.bottom - 1]?.[m.right - 1];
    if (endCell) {
      const targetEnd = sheet.getCell(topRow + m.bottom - 1, leftCol + m.right - 1);
      targetEnd.border = safeJsonClone(endCell.border) as ExcelJS.Borders;
    }
  }
}
