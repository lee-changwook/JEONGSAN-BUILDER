import ExcelJS from "exceljs";
import { SLOT_CONFIGS } from "../template";
import type { TemplateBlockLibrary, TemplateSection, LayoutArrearsBlock, LayoutRegularRow, RenderCourse } from './types';

function detectTemplateSections(sourceSheet: ExcelJS.Worksheet): TemplateSection[] {
  const starts: number[] = [];
  sourceSheet.eachRow((row, rowNumber) => {
    if (row.getCell(1).text === "강사") {
      starts.push(rowNumber);
    }
  });

  return starts.map((start, index) => {
    const end = (starts[index + 1] ?? sourceSheet.rowCount + 1) - 1;
    const rowAfterTeacher = sourceSheet.getRow(start + 1);
    const arrearsSlotIndex = SLOT_CONFIGS.findIndex((slot) => rowAfterTeacher.getCell(slot.studentCol).text.trim() === "미납회수금");
    const kind = rowAfterTeacher.getCell(2).text === "미납회수금" ? "arrears" : arrearsSlotIndex >= 0 ? "mixed" : "regular";

    if (kind === "arrears") {
      return {
        kind,
        start,
        end,
        regularSlots: 0,
        titleRow: start + 2,
        headerRow: start + 3,
        studentStart: start + 4,
        totalRow: end
      };
    }

    const regularSlots = SLOT_CONFIGS.filter((slot) => {
      const text = rowAfterTeacher.getCell(slot.studentCol).text.trim();
      return text !== "" && text !== "미납회수금";
    }).length;

    const base = {
      start,
      end,
      regularSlots,
      regularTitleRow: start + 1,
      regularHeaderRow: start + 2,
      regularStudentStart: start + 3,
      regularTotalRow: end,
      regularCapacity: Math.max(0, end - (start + 3))
    } as const;

    if (kind === "mixed") {
      return {
        kind,
        ...base,
        arrearsSlotIndex,
        arrearsTitleRow: start + 2,
        arrearsHeaderRow: start + 3,
        arrearsStudentStart: start + 4,
        arrearsTotalRow: end
      };
    }

    return {
      kind,
      ...base
    };
  });
}

export function extractTemplateBlockLibrary(sourceSheet: ExcelJS.Worksheet): TemplateBlockLibrary {
  const sections = detectTemplateSections(sourceSheet);
  const regularBlocks = sections
    .filter((section): section is Extract<TemplateSection, { kind: "regular" }> => section.kind === "regular" && section.regularSlots === 4)
    .map((section) => ({
      start: section.start,
      end: section.end,
      height: section.end - section.start + 1,
      titleRowOffset: section.regularTitleRow - section.start,
      headerRowOffset: section.regularHeaderRow - section.start,
      studentStartOffset: section.regularStudentStart - section.start,
      totalRowOffset: section.regularTotalRow - section.start,
      capacity: section.regularCapacity
    }))
    .sort((left, right) => left.capacity - right.capacity);

  const arrearsSection = sections.find((section): section is Extract<TemplateSection, { kind: "arrears" }> => section.kind === "arrears");
  if (!arrearsSection || regularBlocks.length === 0) {
    throw new Error("강좌별매출 템플릿 donor block을 추출하지 못했습니다.");
  }

  const mixedBlocks = sections
    .filter((section): section is Extract<TemplateSection, { kind: "mixed" }> => section.kind === "mixed")
    .map((section) => ({
      start: section.start,
      end: section.end,
      height: section.end - section.start + 1,
      regularSlots: section.regularSlots,
      arrearsSlotIndex: section.arrearsSlotIndex,
      regularTitleRowOffset: section.regularTitleRow - section.start,
      regularHeaderRowOffset: section.regularHeaderRow - section.start,
      regularStudentStartOffset: section.regularStudentStart - section.start,
      regularTotalRowOffset: section.regularTotalRow - section.start,
      regularCapacity: section.regularCapacity,
      arrearsMonthRowOffset: section.regularTitleRow - section.start,
      arrearsTitleRowOffset: section.arrearsTitleRow - section.start,
      arrearsHeaderRowOffset: section.arrearsHeaderRow - section.start,
      arrearsStudentStartOffset: section.arrearsStudentStart - section.start,
      arrearsTotalRowOffset: section.arrearsTotalRow - section.start
    }));

  return {
    regularBlocks,
    mixedBlocks,
    arrearsBlock: {
      sourceStart: arrearsSection.start,
      sourceEnd: arrearsSection.end,
      teacherRow: arrearsSection.start,
      monthRow: arrearsSection.start + 1,
      courseTitleRow: arrearsSection.titleRow,
      headerRow: arrearsSection.headerRow,
      studentRow: arrearsSection.studentStart,
      totalRow: arrearsSection.totalRow
    }
  };
}

export function selectRegularBlock(library: TemplateBlockLibrary, courses: RenderCourse[]) {
  const requiredCapacity = courses.reduce((max, course) => Math.max(max, course.students.length), 0);
  return library.regularBlocks.find((block) => block.capacity >= requiredCapacity) ?? library.regularBlocks[library.regularBlocks.length - 1];
}

export function selectMixedBlock(
  library: TemplateBlockLibrary,
  row: LayoutRegularRow,
  block: LayoutArrearsBlock
) {
  const requiredRegularCapacity = row.courses.reduce((max, course) => Math.max(max, course.students.length), 0);
  const totalArrearsStudents = block.courses.reduce((sum, course) => sum + course.students.length, 0);
  const requiredHeight = Math.max(requiredRegularCapacity + 4, 3 + (block.courses.length * 2) + totalArrearsStudents);

  return library.mixedBlocks.find(
    (template) => template.regularSlots === row.courses.length && template.height >= requiredHeight
  );
}
