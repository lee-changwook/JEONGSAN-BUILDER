import { SLOT_CONFIGS } from "../template";
import type { CourseBlock, StudentEntry } from '@/features/paybuilder/types';

export type SlotConfig = (typeof SLOT_CONFIGS)[number];

export type RenderCourse = CourseBlock & {
  students: StudentEntry[];
};

export type TemplateSection =
  | {
      kind: "regular";
      start: number;
      end: number;
      regularSlots: number;
      regularTitleRow: number;
      regularHeaderRow: number;
      regularStudentStart: number;
      regularTotalRow: number;
      regularCapacity: number;
    }
  | {
      kind: "arrears";
      start: number;
      end: number;
      regularSlots: 0;
      titleRow: number;
      headerRow: number;
      studentStart: number;
      totalRow: number;
    }
  | {
      kind: "mixed";
      start: number;
      end: number;
      regularSlots: number;
      regularTitleRow: number;
      regularHeaderRow: number;
      regularStudentStart: number;
      regularTotalRow: number;
      regularCapacity: number;
      arrearsSlotIndex: number;
      arrearsTitleRow: number;
      arrearsHeaderRow: number;
      arrearsStudentStart: number;
      arrearsTotalRow: number;
    };

export type TemplateRegularBlock = {
  start: number;
  end: number;
  height: number;
  titleRowOffset: number;
  headerRowOffset: number;
  studentStartOffset: number;
  totalRowOffset: number;
  capacity: number;
};

export type TemplateMixedBlock = {
  start: number;
  end: number;
  height: number;
  regularSlots: number;
  arrearsSlotIndex: number;
  regularTitleRowOffset: number;
  regularHeaderRowOffset: number;
  regularStudentStartOffset: number;
  regularTotalRowOffset: number;
  regularCapacity: number;
  arrearsMonthRowOffset: number;
  arrearsTitleRowOffset: number;
  arrearsHeaderRowOffset: number;
  arrearsStudentStartOffset: number;
  arrearsTotalRowOffset: number;
};

export type TemplateArrearsBlock = {
  sourceStart: number;
  sourceEnd: number;
  teacherRow: number;
  monthRow: number;
  courseTitleRow: number;
  headerRow: number;
  studentRow: number;
  totalRow: number;
};

export type TemplateBlockLibrary = {
  regularBlocks: TemplateRegularBlock[];
  mixedBlocks: TemplateMixedBlock[];
  arrearsBlock: TemplateArrearsBlock;
};

export type LayoutRegularRow = {
  courses: RenderCourse[];
};

export type LayoutArrearsBlock = {
  teacherName: string;
  courses: RenderCourse[];
};

export type LayoutTeacherGroup = {
  teacherName: string;
  regularRows: LayoutRegularRow[];
  arrearsBlock: LayoutArrearsBlock | null;
};

export type LayoutRowGroup =
  | {
      kind: "regular";
      teacherName: string;
      row: LayoutRegularRow;
    }
  | {
      kind: "arrears";
      teacherName: string;
      block: LayoutArrearsBlock;
    }
  | {
      kind: "mixed";
      teacherName: string;
      row: LayoutRegularRow;
      block: LayoutArrearsBlock;
    };

export const ARREARS_SLOT: SlotConfig = {
  titleRangeStart: 1,
  titleRangeEnd: 7,
  studentCol: 2,
  countCol: 3,
  paidCol: 4,
  unpaidCol: 5,
  methodCol: 6,
  payCol: 7
};
