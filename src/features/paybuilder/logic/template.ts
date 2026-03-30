import ExcelJS from "exceljs";

export const SLOT_CONFIGS = [
  { titleRangeStart: 1, titleRangeEnd: 7, studentCol: 2, countCol: 3, paidCol: 4, unpaidCol: 5, methodCol: 6, payCol: 7 },
  { titleRangeStart: 8, titleRangeEnd: 13, studentCol: 8, countCol: 9, paidCol: 10, unpaidCol: 11, methodCol: 12, payCol: 13 },
  { titleRangeStart: 14, titleRangeEnd: 19, studentCol: 14, countCol: 15, paidCol: 16, unpaidCol: 17, methodCol: 18, payCol: 19 },
  { titleRangeStart: 20, titleRangeEnd: 25, studentCol: 20, countCol: 21, paidCol: 22, unpaidCol: 23, methodCol: 24, payCol: 25 }
] as const;

export async function loadTemplateWorkbook(templatePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const formulaSheets = workbook.worksheets.filter((sheet) => sheet.state === "visible" && sheet.name.includes("강좌별"));
  const sourceSheet = formulaSheets[0] ?? workbook.worksheets[0];

  if (!sourceSheet) {
    throw new Error("강좌별매출 템플릿 시트를 찾지 못했습니다.");
  }

  return { workbook, sourceSheet };
}

export function detectBandBounds(sourceSheet: ExcelJS.Worksheet) {
  const starts: number[] = [];
  sourceSheet.eachRow((row, rowNumber) => {
    const cellValue = row.getCell(1).text;
    if (cellValue === "강사") {
      starts.push(rowNumber);
    }
  });
  if (starts.length < 2) {
    throw new Error("템플릿에서 밴드 구조를 찾지 못했습니다.");
  }
  return {
    bandStart: starts[0],
    bandEnd: starts[1] - 1
  };
}

export function cloneWorksheetShell(sourceSheet: ExcelJS.Worksheet, workbook: ExcelJS.Workbook, targetName: string) {
  const existing = workbook.getWorksheet(targetName);
  if (existing) {
    workbook.removeWorksheet(existing.id);
  }
  const outputSheet = workbook.addWorksheet(targetName);
  outputSheet.properties.defaultRowHeight = sourceSheet.properties.defaultRowHeight;
  outputSheet.views = sourceSheet.views;
  outputSheet.pageSetup = sourceSheet.pageSetup;
  outputSheet.headerFooter = sourceSheet.headerFooter;
  outputSheet.state = "visible";

  sourceSheet.columns.forEach((column, index) => {
    const targetColumn = outputSheet.getColumn(index + 1);
    targetColumn.width = column.width;
    targetColumn.hidden = Boolean(column.hidden);
    targetColumn.style = JSON.parse(JSON.stringify(column.style ?? {}));
  });

  return outputSheet;
}

export function copyRowRange(
  sourceSheet: ExcelJS.Worksheet,
  outputSheet: ExcelJS.Worksheet,
  sourceStart: number,
  sourceEnd: number,
  targetStart: number
) {
  for (let offset = 0; offset <= sourceEnd - sourceStart; offset += 1) {
    const sourceRow = sourceSheet.getRow(sourceStart + offset);
    const targetRow = outputSheet.getRow(targetStart + offset);
    targetRow.height = sourceRow.height;
    for (let col = 1; col <= sourceSheet.columnCount; col += 1) {
      const sourceCell = sourceRow.getCell(col);
      const targetCell = targetRow.getCell(col);
      targetCell.style = JSON.parse(JSON.stringify(sourceCell.style ?? {}));
      targetCell.numFmt = sourceCell.numFmt;
      targetCell.alignment = JSON.parse(JSON.stringify(sourceCell.alignment ?? {}));
      targetCell.border = JSON.parse(JSON.stringify(sourceCell.border ?? {}));
      targetCell.fill = JSON.parse(JSON.stringify(sourceCell.fill ?? {}));
      targetCell.font = JSON.parse(JSON.stringify(sourceCell.font ?? {}));
      targetCell.protection = JSON.parse(JSON.stringify(sourceCell.protection ?? {}));
      targetCell.value = sourceCell.value;
    }
  }
}

export function copyMergedRanges(
  sourceSheet: ExcelJS.Worksheet,
  outputSheet: ExcelJS.Worksheet,
  sourceStart: number,
  sourceEnd: number,
  targetStart: number
) {
  const diff = targetStart - sourceStart;
  const merges = sourceSheet.model.merges ?? [];
  const columnNumberFromRef = (ref: string) => {
    const letters = ref.replace(/\d+/g, "").toUpperCase();
    return letters.split("").reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0);
  };
  for (const mergeRef of merges) {
    const [startRef, endRef] = mergeRef.split(":");
    const startAddress = sourceSheet.getCell(startRef).address;
    const endAddress = sourceSheet.getCell(endRef).address;
    const startRow = Number(startAddress.replace(/^[A-Z]+/i, ""));
    const endRow = Number(endAddress.replace(/^[A-Z]+/i, ""));
    const startCol = columnNumberFromRef(startAddress);
    const endCol = columnNumberFromRef(endAddress);
    if (startRow < sourceStart || endRow > sourceEnd) {
      continue;
    }
    outputSheet.mergeCells(startRow + diff, startCol, endRow + diff, endCol);
  }
}
