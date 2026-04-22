import ExcelJS from "exceljs";
import { extractRectSnapshot, snapshotColumnStartForPayBlock } from "@/jeongsan/features/pay-block-snapshot";
import type {
  ParsedCourseBlock,
  ParsedPayDocument,
  ParsedPayRow,
  PayBlockSnapshot,
  SettlementWarning,
  SheetKind,
} from "@/jeongsan/features/types";
import {
  computePayFromPaid,
  detectSheetKind,
  extractScheduleText,
  extractTeacherName,
  makeId,
  normalizeKey,
  parseMonthTagFromName,
  parseNumericCell,
  sheetMatchesTarget,
  derivePayDocumentCourseName,
  text,
} from "@/jeongsan/features/utils";

type ParseInput = {
  year: number;
  month: number;
  files: Array<{ name: string; buffer: Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0] }>;
};

type ParseOutput = {
  documents: ParsedPayDocument[];
  warnings: SettlementWarning[];
};

function parseSheetBlocks(
  workbookName: string,
  worksheet: ExcelJS.Worksheet,
  sheetKind: SheetKind,
) {
  const blocks: ParsedCourseBlock[] = [];

  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    for (let col = 1; col <= worksheet.columnCount; col += 1) {
      if (text(row.getCell(col).value).trim() !== "학생명") {
        continue;
      }

      const titleText = text(worksheet.getRow(rowIndex - 1).getCell(col).value).trim();
      if (!titleText || titleText === "미납회수금") {
        continue;
      }

      const teacherText = text(worksheet.getRow(rowIndex - 2).getCell(col).value).trim();
      const teacherName = extractTeacherName(`${teacherText} ${titleText}`);
      const courseName = derivePayDocumentCourseName(titleText);

      const rowStart = rowIndex - 2;
      let rowEnd = 0;
      let lastDataRow = 0;
      const rows: ParsedPayRow[] = [];
      for (let dataRowIndex = rowIndex + 1; dataRowIndex <= worksheet.rowCount; dataRowIndex += 1) {
        const studentText = text(worksheet.getRow(dataRowIndex).getCell(col).value).trim();
        const attendanceText = text(worksheet.getRow(dataRowIndex).getCell(col + 1).value).trim();
        const paidText = text(worksheet.getRow(dataRowIndex).getCell(col + 2).value).trim();
        const unpaidText = text(worksheet.getRow(dataRowIndex).getCell(col + 3).value).trim();
        const methodText = text(worksheet.getRow(dataRowIndex).getCell(col + 4).value).trim();
        const payText = text(worksheet.getRow(dataRowIndex).getCell(col + 5).value).trim();

        if (
          studentText.includes("TOTAL") ||
          studentText === "전월미납" ||
          studentText === "학생명" ||
          studentText === "강사"
        ) {
          rowEnd = studentText.includes("TOTAL") ? dataRowIndex : lastDataRow;
          break;
        }

        if (!studentText) {
          const nextTeacher = text(worksheet.getRow(dataRowIndex + 1).getCell(1).value).trim();
          if (nextTeacher === "강사") {
            rowEnd = lastDataRow;
            break;
          }
          continue;
        }

        const paid = parseNumericCell(paidText);
        const unpaid = parseNumericCell(unpaidText);
        const pay = parseNumericCell(payText);
        rows.push({
          id: makeId(),
          source: {
            workbookName,
            sheetName: worksheet.name,
            blockTitle: titleText,
            rowNumber: dataRowIndex,
          },
          name: studentText.replace(/\(\d{1,2}월\)/, "").trim(),
          nameMonthTag: parseMonthTagFromName(studentText),
          attendance: parseNumericCell(attendanceText),
          paid,
          unpaid,
          paymentMethod: methodText,
          pay: pay.value > 0 || pay.raw ? pay : { raw: paid.raw, value: computePayFromPaid(paid.value, methodText) },
        memo: "",
        /* 페이 문서는 행정관에서 확정된 산출물로 가정 — 수식·% 표시는 여기서 검토 플래그로 쓰지 않습니다. */
        needsReview: false,
        });
        lastDataRow = dataRowIndex;
      }

      if (rowEnd === 0) {
        rowEnd = lastDataRow;
      }

      if (rows.length === 0) {
        continue;
      }

      let detailSnapshot: PayBlockSnapshot | null = null;
      if (rowEnd >= rowStart) {
        try {
          const colStart = snapshotColumnStartForPayBlock(worksheet, rowIndex, col);
          detailSnapshot = extractRectSnapshot(worksheet, rowStart, rowEnd, colStart, col + 5);
        } catch {
          detailSnapshot = null;
        }
      }

      blocks.push({
        id: makeId(),
        sourceWorkbook: workbookName,
        sourceSheet: worksheet.name,
        sheetKind,
        teacherName,
        teacherKey: normalizeKey(teacherName),
        courseTitle: titleText,
        courseName,
        courseKey: normalizeKey(courseName),
        scheduleText: extractScheduleText(titleText),
        rows,
        detailSnapshot,
      });
    }
  }

  return blocks;
}

function parseArrearsSheet(workbookName: string, worksheet: ExcelJS.Worksheet) {
  const blocks: ParsedCourseBlock[] = [];
  let currentTeacher = "";

  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const firstCell = text(worksheet.getRow(rowIndex).getCell(1).value).trim();
    const secondCell = text(worksheet.getRow(rowIndex).getCell(2).value).trim();
    if (firstCell === "강사") {
      currentTeacher = extractTeacherName(secondCell);
    }
    if (firstCell !== "NO.") {
      continue;
    }

    const titleText = secondCell;
    if (!titleText || titleText === "미납회수금") {
      continue;
    }

    const rowStart = rowIndex;
    let rowEnd = 0;
    let lastDataRow = 0;
    const rows: ParsedPayRow[] = [];
    for (let dataRowIndex = rowIndex + 2; dataRowIndex <= worksheet.rowCount; dataRowIndex += 1) {
      const studentText = text(worksheet.getRow(dataRowIndex).getCell(2).value).trim();
      if (
        studentText === "전월미납" ||
        studentText === "학생명" ||
        studentText.startsWith("H") ||
        studentText.includes("미납회수금")
      ) {
        rowEnd = lastDataRow;
        break;
      }
      if (!studentText) {
        continue;
      }
      const paid = parseNumericCell(text(worksheet.getRow(dataRowIndex).getCell(4).value).trim());
      const unpaid = parseNumericCell(text(worksheet.getRow(dataRowIndex).getCell(5).value).trim());
      const method = text(worksheet.getRow(dataRowIndex).getCell(6).value).trim();
      rows.push({
        id: makeId(),
        source: {
          workbookName,
          sheetName: worksheet.name,
          blockTitle: titleText,
          rowNumber: dataRowIndex,
        },
        name: studentText.replace(/\(\d{1,2}월\)/, "").trim(),
        nameMonthTag: parseMonthTagFromName(studentText),
        attendance: parseNumericCell(text(worksheet.getRow(dataRowIndex).getCell(3).value).trim()),
        paid,
        unpaid,
        paymentMethod: method,
        pay: parseNumericCell(text(worksheet.getRow(dataRowIndex).getCell(7).value).trim()),
        memo: "",
        needsReview: false,
      });
      lastDataRow = dataRowIndex;
    }

    if (rowEnd === 0) {
      rowEnd = lastDataRow;
    }

    if (rows.length === 0) {
      continue;
    }

    let detailSnapshot: PayBlockSnapshot | null = null;
    if (rowEnd >= rowStart) {
      try {
        detailSnapshot = extractRectSnapshot(worksheet, rowStart, rowEnd, 1, 7);
      } catch {
        detailSnapshot = null;
      }
    }

    const teacherName = currentTeacher || extractTeacherName(titleText);
    blocks.push({
      id: makeId(),
      sourceWorkbook: workbookName,
      sourceSheet: worksheet.name,
      sheetKind: "arrears",
      teacherName,
      teacherKey: normalizeKey(teacherName),
      courseTitle: titleText,
      courseName: derivePayDocumentCourseName(titleText),
      courseKey: normalizeKey(derivePayDocumentCourseName(titleText)),
      scheduleText: extractScheduleText(titleText),
      rows,
      detailSnapshot,
    });
  }

  return blocks;
}

export async function parsePayDocuments(input: ParseInput): Promise<ParseOutput> {
  const warnings: SettlementWarning[] = [];
  const documents: ParsedPayDocument[] = [];

  for (const file of input.files) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const blocks: ParsedCourseBlock[] = [];
    let matchedSheetCount = 0;
    let relevantSheetCount = 0;

    workbook.eachSheet((worksheet) => {
      const header = text(worksheet.getCell("A1").value).trim();
      const kind = detectSheetKind(worksheet.name, header);
      if (!kind) {
        return;
      }
      relevantSheetCount += 1;

      const identityCandidates = [worksheet.name, header].filter(Boolean);
      if (!sheetMatchesTarget(input.year, input.month, identityCandidates)) {
        return;
      }
      matchedSheetCount += 1;

      const parsedBlocks =
        kind === "arrears"
          ? parseArrearsSheet(file.name, worksheet)
          : parseSheetBlocks(file.name, worksheet, kind);

      blocks.push(...parsedBlocks);
    });

    documents.push({
      workbookName: file.name,
      year: input.year,
      month: input.month,
      blocks,
    });

    if (relevantSheetCount > 0 && matchedSheetCount === 0) {
      warnings.push({
        id: makeId(),
        category: "sheet",
        message: `${file.name}: 대상 ${input.year}년 ${input.month}월에 해당하는 강좌별/교재비/장기미납 시트를 찾지 못했습니다.`,
      });
    }
  }

  return { documents, warnings };
}
