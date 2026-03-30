import ExcelJS from "exceljs";
import { SLOT_CONFIGS } from "../template";
import type { SettlementMonth } from '@/features/paybuilder/types';
import {
  clearRegularSectionSlot,
  clearSlot,
  copyTemplateBlock,
  copyTemplateRow,
  fillStudentRow,
  setCell,
  setNumericInputCell,
  stripRegularSectionSlotVisuals,
  writeRegularCourseToSlot
} from "./cells";
import { ARREARS_SLOT } from './types';
import type {
  LayoutArrearsBlock,
  LayoutRegularRow,
  TemplateArrearsBlock,
  TemplateMixedBlock,
  TemplateRegularBlock
} from './types';

export function renderRegularRowGroup(
  sourceSheet: ExcelJS.Worksheet,
  outputSheet: ExcelJS.Worksheet,
  settlement: SettlementMonth,
  teacherName: string,
  row: LayoutRegularRow,
  block: TemplateRegularBlock,
  targetStart: number
) {
  copyTemplateBlock(sourceSheet, outputSheet, block.start, block.end, targetStart);

  const teacherRow = targetStart;
  const titleRow = targetStart + block.titleRowOffset;
  const headerRow = targetStart + block.headerRowOffset;
  const studentStart = targetStart + block.studentStartOffset;
  const totalRow = targetStart + block.totalRowOffset;
  const totalRefs: string[] = [];

  setCell(outputSheet, teacherRow, 1, "강사");
  for (let slotIndex = 0; slotIndex < SLOT_CONFIGS.length; slotIndex += 1) {
    setCell(outputSheet, teacherRow, SLOT_CONFIGS[slotIndex].studentCol, slotIndex < row.courses.length ? teacherName : "");
  }

  for (let slotIndex = 0; slotIndex < row.courses.length; slotIndex += 1) {
    const totalRef = writeRegularCourseToSlot(
      outputSheet,
      SLOT_CONFIGS[slotIndex],
      titleRow,
      headerRow,
      studentStart,
      totalRow,
      block.capacity,
      settlement.month,
      row.courses[slotIndex],
      slotIndex === 0
    );
    if (totalRef) {
      totalRefs.push(totalRef);
    }
  }

  for (let slotIndex = row.courses.length; slotIndex < SLOT_CONFIGS.length; slotIndex += 1) {
    const slot = SLOT_CONFIGS[slotIndex];
    clearRegularSectionSlot(outputSheet, slot, titleRow, headerRow, studentStart, totalRow, block.capacity, slotIndex === 0);
    stripRegularSectionSlotVisuals(outputSheet, slot, teacherRow, titleRow, studentStart, totalRow);
  }

  return {
    nextRow: targetStart + block.height,
    totalRefs
  };
}

export function renderArrearsBlock(
  sourceSheet: ExcelJS.Worksheet,
  outputSheet: ExcelJS.Worksheet,
  settlement: SettlementMonth,
  block: LayoutArrearsBlock,
  template: TemplateArrearsBlock,
  targetStart: number
) {
  let row = targetStart;
  const totalRefs: string[] = [];

  copyTemplateRow(sourceSheet, outputSheet, template.teacherRow, row);
  setCell(outputSheet, row, 1, "강사");
  setCell(outputSheet, row, 2, block.teacherName);
  row += 1;

  copyTemplateRow(sourceSheet, outputSheet, template.monthRow, row);
  setCell(outputSheet, row, 1, `${settlement.month}월`);
  setCell(outputSheet, row, 2, "미납회수금");
  row += 1;

  let nextNumber = 1;
  let totalPaid = 0;
  let totalUnpaid = 0;
  let totalPay = 0;

  for (let courseIndex = 0; courseIndex < block.courses.length; courseIndex += 1) {
    const course = block.courses[courseIndex];

    copyTemplateRow(sourceSheet, outputSheet, template.courseTitleRow, row);
    setCell(outputSheet, row, 1, courseIndex === 0 ? "NO." : nextNumber);
    setCell(outputSheet, row, 2, course.courseNameRaw || course.titleText);
    row += 1;

    copyTemplateRow(sourceSheet, outputSheet, template.headerRow, row);
    setCell(outputSheet, row, 1, nextNumber);
    setCell(outputSheet, row, 2, "학생명");
    setCell(outputSheet, row, 3, "실강회수");
    setCell(outputSheet, row, 4, "납부액");
    setCell(outputSheet, row, 5, "미납액");
    setCell(outputSheet, row, 6, "납입방법");
    setCell(outputSheet, row, 7, "PAY ");
    row += 1;

    for (let studentIndex = 0; studentIndex < course.students.length; studentIndex += 1) {
      fillStudentRow(outputSheet, row, ARREARS_SLOT, course.students[studentIndex], nextNumber + studentIndex + 1);
      row += 1;
    }

    nextNumber += course.students.length + 2;
    totalPaid += course.students.reduce((sum, student) => sum + student.paidAmount, 0);
    totalUnpaid += course.students.reduce((sum, student) => sum + student.unpaidAmount, 0);
    totalPay += course.students.reduce((sum, student) => sum + student.payAmount, 0);
  }

  copyTemplateRow(sourceSheet, outputSheet, template.totalRow, row);
  setCell(outputSheet, row, 2, "전월미납");
  setCell(outputSheet, row, 3, "TOTAL");
  setCell(outputSheet, row, 4, totalPaid);
  setCell(outputSheet, row, 5, totalUnpaid);
  setCell(outputSheet, row, 7, totalPay);
  totalRefs.push(`${outputSheet.getColumn(ARREARS_SLOT.payCol).letter}${row}`);

  return {
    nextRow: row + 1,
    totalRefs
  };
}

function writeArrearsToMixedSlot(
  sheet: ExcelJS.Worksheet,
  monthRow: number,
  firstContentRow: number,
  totalRow: number,
  block: LayoutArrearsBlock,
  slotIndex: number
) {
  const slot = SLOT_CONFIGS[slotIndex];

  for (let row = monthRow; row <= totalRow; row += 1) {
    for (let col = slot.studentCol; col <= slot.payCol; col += 1) {
      sheet.getCell(row, col).value = null;
    }
  }

  setCell(sheet, monthRow, slot.studentCol, "미납회수금");

  let row = firstContentRow;
  let totalPaid = 0;
  let totalUnpaid = 0;
  let totalPay = 0;

  for (const course of block.courses) {
    setCell(sheet, row, slot.studentCol, course.courseNameRaw || course.titleText);
    row += 1;

    setCell(sheet, row, slot.studentCol, "학생명");
    setCell(sheet, row, slot.countCol, "실강회수");
    setCell(sheet, row, slot.paidCol, "납부액");
    setCell(sheet, row, slot.unpaidCol, "미납액");
    setCell(sheet, row, slot.methodCol, "납입방법");
    setCell(sheet, row, slot.payCol, "PAY ");
    row += 1;

    for (const student of course.students) {
      fillStudentRow(sheet, row, slot, student);
      row += 1;
    }

    totalPaid += course.students.reduce((sum, student) => sum + student.paidAmount, 0);
    totalUnpaid += course.students.reduce((sum, student) => sum + student.unpaidAmount, 0);
    totalPay += course.students.reduce((sum, student) => sum + student.payAmount, 0);
  }

  clearSlot(sheet, row, slot, Math.max(0, totalRow - row), false);
  setCell(sheet, totalRow, slot.studentCol, "전월미납");
  setCell(sheet, totalRow, slot.countCol, "TOTAL");
  setNumericInputCell(sheet, totalRow, slot.paidCol, totalPaid || "");
  setNumericInputCell(sheet, totalRow, slot.unpaidCol, totalUnpaid || "");
  setNumericInputCell(sheet, totalRow, slot.payCol, totalPay || "");

  return `${sheet.getColumn(slot.payCol).letter}${totalRow}`;
}

export function renderMixedRowGroup(
  sourceSheet: ExcelJS.Worksheet,
  outputSheet: ExcelJS.Worksheet,
  settlement: SettlementMonth,
  teacherName: string,
  row: LayoutRegularRow,
  block: LayoutArrearsBlock,
  template: TemplateMixedBlock,
  targetStart: number
) {
  copyTemplateBlock(sourceSheet, outputSheet, template.start, template.end, targetStart);

  const teacherRow = targetStart;
  const regularTitleRow = targetStart + template.regularTitleRowOffset;
  const regularHeaderRow = targetStart + template.regularHeaderRowOffset;
  const regularStudentStart = targetStart + template.regularStudentStartOffset;
  const totalRow = targetStart + template.regularTotalRowOffset;
  const arrearsMonthRow = targetStart + template.arrearsMonthRowOffset;
  const arrearsTitleRow = targetStart + template.arrearsTitleRowOffset;
  const totalRefs: string[] = [];

  setCell(outputSheet, teacherRow, 1, "강사");
  for (let slotIndex = 0; slotIndex < SLOT_CONFIGS.length; slotIndex += 1) {
    setCell(outputSheet, teacherRow, SLOT_CONFIGS[slotIndex].studentCol, slotIndex <= template.arrearsSlotIndex ? teacherName : "");
  }

  for (let slotIndex = 0; slotIndex < row.courses.length; slotIndex += 1) {
    const totalRef = writeRegularCourseToSlot(
      outputSheet,
      SLOT_CONFIGS[slotIndex],
      regularTitleRow,
      regularHeaderRow,
      regularStudentStart,
      totalRow,
      template.regularCapacity,
      settlement.month,
      row.courses[slotIndex],
      slotIndex === 0
    );
    if (totalRef) {
      totalRefs.push(totalRef);
    }
  }

  totalRefs.push(writeArrearsToMixedSlot(outputSheet, arrearsMonthRow, arrearsTitleRow, totalRow, block, template.arrearsSlotIndex));

  for (let slotIndex = template.arrearsSlotIndex + 1; slotIndex < SLOT_CONFIGS.length; slotIndex += 1) {
    const slot = SLOT_CONFIGS[slotIndex];
    clearRegularSectionSlot(outputSheet, slot, regularTitleRow, regularHeaderRow, regularStudentStart, totalRow, template.regularCapacity, false);
    stripRegularSectionSlotVisuals(outputSheet, slot, teacherRow, regularTitleRow, regularStudentStart, totalRow);
  }

  setCell(outputSheet, arrearsMonthRow, 1, `${settlement.month}월`);
  setCell(outputSheet, regularHeaderRow, 1, "NO.");

  return {
    nextRow: targetStart + template.height,
    totalRefs
  };
}
