import ExcelJS from "exceljs";
import type { PreviousPayoutData, PreviousPayoutRow } from "@/jeongsan/features/types";
import { buildTeacherCourseMatchKey, normalizeKey, text } from "@/jeongsan/features/utils";

function parseMetaRows(worksheet: ExcelJS.Worksheet): PreviousPayoutRow[] {
  const rows: PreviousPayoutRow[] = [];
  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const payload = text(worksheet.getRow(rowIndex).getCell(2).value).trim();
    if (!payload) {
      continue;
    }
    try {
      const parsed = JSON.parse(payload) as PreviousPayoutRow;
      rows.push(parsed);
    } catch {
      continue;
    }
  }
  return rows;
}

function parseVisiblePayoutRows(workbook: ExcelJS.Workbook): PreviousPayoutRow[] {
  const rows: PreviousPayoutRow[] = [];
  for (const worksheet of workbook.worksheets) {
    const header = text(worksheet.getRow(2).getCell(1).value).trim();
    if (header !== "이름") {
      continue;
    }

    let currentTeacher = "";
    for (let rowIndex = 3; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      const teacherCell = text(worksheet.getRow(rowIndex).getCell(1).value).trim();
      const courseName = text(worksheet.getRow(rowIndex).getCell(3).value || worksheet.getRow(rowIndex).getCell(2).value).trim();
      if (teacherCell) {
        currentTeacher = teacherCell.endsWith("T") ? teacherCell : `${teacherCell}T`;
      }
      if (!courseName) {
        continue;
      }
      const ratioText = text(worksheet.getRow(rowIndex).getCell(10).value || worksheet.getRow(rowIndex).getCell(9).value).trim();
      const hoursText = text(worksheet.getRow(rowIndex).getCell(11).value).trim();
      const note = text(worksheet.getRow(rowIndex).getCell(16).value).trim();
      const ratio = ratioText ? Number(ratioText) : null;
      const hours = hoursText ? Number(hoursText) : null;
      rows.push({
        teacherName: currentTeacher || "강사미정T",
        teacherKey: normalizeKey(currentTeacher || "강사미정T"),
        courseName,
        courseKey: buildTeacherCourseMatchKey(currentTeacher || "강사미정T", courseName),
        ratio: Number.isFinite(ratio ?? NaN) ? ratio : null,
        hours: Number.isFinite(hours ?? NaN) ? hours : null,
        note,
      });
    }
  }
  return rows;
}

export async function readPreviousPayoutWorkbook(
  buffer: Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0],
): Promise<PreviousPayoutData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const metaSheet = workbook.getWorksheet("__JEONGSAN_META");
  const rows = metaSheet ? parseMetaRows(metaSheet) : parseVisiblePayoutRows(workbook);
  return {
    sourceName: workbook.creator || "previous-payout",
    rows,
  };
}
