import ExcelJS from "exceljs";
import type { PreviousSettlementMeta, SettlementMonth } from '@/features/paybuilder/types';

const META_SHEET_NAME = "__SETTLEMENT_META";
const CHUNK_SIZE = 30000;

function buildPayload(data: SettlementMonth): PreviousSettlementMeta {
  return {
    campusName: data.campusName,
    year: data.year,
    month: data.month,
    feeRate: data.feeRate,
    courses: data.courses.map((course) => ({
      id: course.id,
      titleText: course.titleText,
      teacherName: course.teacherName,
      courseNameRaw: course.courseNameRaw,
      students: course.students.map((student) => ({
        id: student.id,
        studentName: student.studentName,
        carryOverMonth: student.carryOverMonth,
        attendanceCount: student.attendanceCount,
        attendanceLabel: student.attendanceLabel,
        paidAmount: student.paidAmount,
        unpaidAmount: student.unpaidAmount,
        paymentMethod: student.paymentMethod,
        payAmount: student.payAmount,
        payOverridden: student.payOverridden,
        note: student.note,
        isCarryOver: student.isCarryOver,
        needsReview: student.needsReview
      }))
    }))
  };
}

export async function writeMetaSheet(workbook: ExcelJS.Workbook, data: SettlementMonth) {
  const existing = workbook.getWorksheet(META_SHEET_NAME);
  if (existing) {
    workbook.removeWorksheet(existing.id);
  }
  const metaSheet = workbook.addWorksheet(META_SHEET_NAME, {
    state: "veryHidden"
  });

  const json = JSON.stringify(buildPayload(data));
  const chunks: string[] = [];
  for (let i = 0; i < json.length; i += CHUNK_SIZE) {
    chunks.push(json.slice(i, i + CHUNK_SIZE));
  }

  metaSheet.getCell("A1").value = "version";
  metaSheet.getCell("B1").value = "1";
  metaSheet.getCell("A2").value = "payload";
  metaSheet.getCell("B2").value = chunks[0] ?? "";
  metaSheet.getCell("A3").value = "feeRate";
  metaSheet.getCell("B3").value = data.feeRate;

  // Rows 4+ hold overflow chunks (payload_1, payload_2, ...)
  for (let i = 1; i < chunks.length; i += 1) {
    metaSheet.getCell(3 + i, 1).value = `payload_${i}`;
    metaSheet.getCell(3 + i, 2).value = chunks[i];
  }
}

export async function readMetaSheet(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  const workbookPayload = buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];
  await workbook.xlsx.load(workbookPayload);
  const metaSheet = workbook.getWorksheet(META_SHEET_NAME);
  if (!metaSheet) {
    return null;
  }
  const firstChunk = metaSheet.getCell("B2").value;
  if (typeof firstChunk !== "string") {
    return null;
  }

  let json = firstChunk;
  let row = 4;
  while (true) {
    const label = metaSheet.getCell(row, 1).value;
    if (typeof label !== "string" || !label.startsWith("payload_")) {
      break;
    }
    const chunk = metaSheet.getCell(row, 2).value;
    if (typeof chunk !== "string") {
      break;
    }
    json += chunk;
    row += 1;
  }

  return JSON.parse(json) as PreviousSettlementMeta;
}
