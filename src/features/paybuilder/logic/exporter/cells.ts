import ExcelJS from "exceljs";
import { copyMergedRanges, copyRowRange } from "../template";
import type { StudentEntry } from '@/features/paybuilder/types';
import type { RenderCourse, SlotConfig } from './types';

export function setCell(sheet: ExcelJS.Worksheet, row: number, col: number, value: ExcelJS.CellValue) {
  sheet.getRow(row).getCell(col).value = value;
}

function isFormulaValue(value: ExcelJS.CellValue | null | undefined): value is ExcelJS.CellFormulaValue {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "formula" in value;
}

function buildPayFormula(sheet: ExcelJS.Worksheet, row: number, slot: SlotConfig) {
  const paidRef = `${sheet.getColumn(slot.paidCol).letter}${row}`;
  const methodRef = `${sheet.getColumn(slot.methodCol).letter}${row}`;
  return `IF(OR(${paidRef}="",${paidRef}=0),"",IF(ISNUMBER(SEARCH("카드",${methodRef})),ROUND(${paidRef}*(1-'__SETTLEMENT_META'!$B$3),0),ROUND(${paidRef},0)))`;
}

export function setNumericInputCell(sheet: ExcelJS.Worksheet, row: number, col: number, value: number | "" | null | undefined) {
  const cell = sheet.getCell(row, col);
  if (value === "" || value === null || value === undefined) {
    cell.value = null;
    return;
  }

  if (isFormulaValue(cell.value)) {
    cell.value = {
      formula: String(value),
      result: value
    };
    return;
  }

  cell.value = value;
}

function displayStudentName(student: StudentEntry) {
  return student.carryOverMonth ? `${student.studentName}(${student.carryOverMonth}월)` : student.studentName;
}

function displayPaymentMethod(student: StudentEntry) {
  return student.paymentMethod === "미납 이월" ? "미납" : student.paymentMethod;
}

export function fillStudentRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  slot: SlotConfig,
  student: StudentEntry,
  numberLabel?: number
) {
  if (typeof numberLabel === "number") {
    setCell(sheet, row, 1, numberLabel);
  }
  setCell(sheet, row, slot.studentCol, displayStudentName(student));
  setNumericInputCell(sheet, row, slot.countCol, student.attendanceLabel ? Number(student.attendanceLabel) : (student.attendanceCount || ""));
  setNumericInputCell(sheet, row, slot.paidCol, student.paidAmount || "");
  setNumericInputCell(sheet, row, slot.unpaidCol, student.unpaidAmount || "");
  setCell(sheet, row, slot.methodCol, displayPaymentMethod(student));
  sheet.getCell(row, slot.payCol).value = student.payOverridden
    ? student.payAmount || 0
    : {
        formula: buildPayFormula(sheet, row, slot),
        result: student.payAmount || 0
      };
}

export function clearSlot(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  slot: SlotConfig,
  rowCount: number,
  withNumbering: boolean,
  startNumber = 1
) {
  for (let rowOffset = 0; rowOffset < rowCount; rowOffset += 1) {
    const row = startRow + rowOffset;
    for (let col = slot.studentCol; col <= slot.payCol; col += 1) {
      sheet.getCell(row, col).value = null;
    }
    if (withNumbering) {
      sheet.getCell(row, 1).value = startNumber + rowOffset;
    }
  }
}

export function clearRegularSectionSlot(
  sheet: ExcelJS.Worksheet,
  slot: SlotConfig,
  titleRow: number,
  headerRow: number,
  studentStart: number,
  totalRow: number,
  capacity: number,
  withNumbering: boolean
) {
  clearSlot(sheet, studentStart, slot, capacity, withNumbering);
  setCell(sheet, titleRow, slot.studentCol, "");
  setCell(sheet, headerRow, slot.studentCol, "");
  setCell(sheet, headerRow, slot.countCol, "");
  setCell(sheet, headerRow, slot.paidCol, "");
  setCell(sheet, headerRow, slot.unpaidCol, "");
  setCell(sheet, headerRow, slot.methodCol, "");
  setCell(sheet, headerRow, slot.payCol, "");
  setCell(sheet, totalRow, slot.studentCol, "");
  setCell(sheet, totalRow, slot.paidCol, "");
  setCell(sheet, totalRow, slot.unpaidCol, "");
  setCell(sheet, totalRow, slot.payCol, "");
  if (withNumbering) {
    setCell(sheet, titleRow, 1, "");
    setCell(sheet, headerRow, 1, "");
  }
}

export function stripRegularSectionSlotVisuals(
  sheet: ExcelJS.Worksheet,
  slot: SlotConfig,
  teacherRow: number,
  titleRow: number,
  studentStart: number,
  totalRow: number
) {
  try {
    sheet.unMergeCells(teacherRow, slot.titleRangeStart, teacherRow, slot.titleRangeEnd);
  } catch {}

  try {
    sheet.unMergeCells(titleRow, slot.titleRangeStart, titleRow, slot.titleRangeEnd);
  } catch {}

  for (let row = teacherRow; row <= totalRow; row += 1) {
    for (let col = slot.titleRangeStart; col <= slot.titleRangeEnd; col += 1) {
      const cell = sheet.getCell(row, col);
      cell.value = null;
      cell.style = {};
      cell.numFmt = "";
      cell.alignment = {};
      cell.border = {};
      cell.fill = { type: "pattern", pattern: "none" };
      cell.font = {};
      cell.protection = {};
    }
  }

  for (let row = studentStart; row < totalRow; row += 1) {
    sheet.getCell(row, 1).value = null;
  }
}

export function writeRegularCourseToSlot(
  sheet: ExcelJS.Worksheet,
  slot: SlotConfig,
  titleRow: number,
  headerRow: number,
  studentsStart: number,
  totalRow: number,
  maxRows: number,
  month: number,
  course?: RenderCourse,
  withNumbering = false
) {
  if (!course) {
    clearRegularSectionSlot(sheet, slot, titleRow, headerRow, studentsStart, totalRow, maxRows, withNumbering);
    return null;
  }

  if (withNumbering) {
    setCell(sheet, titleRow, 1, `${month}월`);
    setCell(sheet, headerRow, 1, "NO.");
  }
  setCell(sheet, titleRow, slot.studentCol, course.titleText);
  setCell(sheet, headerRow, slot.studentCol, "학생명");
  setCell(sheet, headerRow, slot.countCol, "실강회수");
  setCell(sheet, headerRow, slot.paidCol, "납부액");
  setCell(sheet, headerRow, slot.unpaidCol, "미납액");
  setCell(sheet, headerRow, slot.methodCol, "납입방법");
  setCell(sheet, headerRow, slot.payCol, "PAY ");

  course.students.forEach((student, index) => {
    fillStudentRow(sheet, studentsStart + index, slot, student, withNumbering ? index + 1 : undefined);
  });
  clearSlot(
    sheet,
    studentsStart + course.students.length,
    slot,
    Math.max(0, maxRows - course.students.length),
    withNumbering,
    course.students.length + 1
  );

  const paidColLetter = sheet.getColumn(slot.paidCol).letter;
  const unpaidColLetter = sheet.getColumn(slot.unpaidCol).letter;
  const payColLetter = sheet.getColumn(slot.payCol).letter;

  const totalPaid = course.students.reduce((sum, student) => sum + student.paidAmount, 0);
  const totalUnpaid = course.students.reduce((sum, student) => sum + student.unpaidAmount, 0);
  const totalPay = course.students.reduce((sum, student) => sum + student.payAmount, 0);

  setCell(sheet, totalRow, slot.studentCol, `${month}월 TOTAL`);
  sheet.getCell(totalRow, slot.paidCol).value = {
    formula: `SUM(${paidColLetter}${studentsStart}:${paidColLetter}${studentsStart + maxRows - 1})`,
    result: totalPaid
  };
  sheet.getCell(totalRow, slot.unpaidCol).value = {
    formula: `SUM(${unpaidColLetter}${studentsStart}:${unpaidColLetter}${studentsStart + maxRows - 1})`,
    result: totalUnpaid
  };
  sheet.getCell(totalRow, slot.payCol).value = {
    formula: `SUM(${payColLetter}${studentsStart}:${payColLetter}${studentsStart + maxRows - 1})`,
    result: totalPay
  };
  return `${payColLetter}${totalRow}`;
}

export function copyTemplateBlock(
  sourceSheet: ExcelJS.Worksheet,
  outputSheet: ExcelJS.Worksheet,
  sourceStart: number,
  sourceEnd: number,
  targetStart: number
) {
  copyRowRange(sourceSheet, outputSheet, sourceStart, sourceEnd, targetStart);
  copyMergedRanges(sourceSheet, outputSheet, sourceStart, sourceEnd, targetStart);
}

export function copyTemplateRow(
  sourceSheet: ExcelJS.Worksheet,
  outputSheet: ExcelJS.Worksheet,
  sourceRow: number,
  targetRow: number
) {
  copyTemplateBlock(sourceSheet, outputSheet, sourceRow, sourceRow, targetRow);
}
