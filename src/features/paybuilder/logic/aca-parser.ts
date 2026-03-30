import ExcelJS from "exceljs";
import { makeId, computePayAmount, parseDateFragment, splitPaidAndUnpaid, buildCourseKey, normalizeSessionDates, buildCarryOverStudentKey } from "./utils";
import type { CourseBlock, PreviousSettlementSource, SettlementMonth, StudentEntry } from '@/features/paybuilder/types';

type ParseOptions = {
  year: number;
  month: number;
  feeRate: number;
  campusName: string;
  templateSheetName: string;
  templateWorkbookName: string;
};

type ParsedMeta = {
  titleBase: string;
  teacherName: string;
};

function cellString(value: ExcelJS.CellValue | undefined) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if ("richText" in value) {
    return value.richText.map((entry) => entry.text).join("");
  }
  if ("text" in value) {
    return value.text ?? "";
  }
  if ("formula" in value) {
    return value.result ? String(value.result) : "";
  }
  return "";
}

function parseTeacherName(rawTitle: string) {
  const matched = rawTitle.match(/-([^-\n]+T)(?:반)?(?:\s|$)/);
  return matched?.[1]?.trim() ?? "미정T";
}

function parseCourseTitle(rawTitle: string) {
  return rawTitle.replace(/출결현황.*$/g, "").replace(/\(샘플\)/g, "").trim();
}

function parseMetaFromRaw(rawValue: string): ParsedMeta {
  const titleBase = parseCourseTitle(rawValue);
  return {
    titleBase,
    teacherName: parseTeacherName(titleBase)
  };
}

function parseFileNameMeta(fileName: string) {
  const withoutExtension = fileName.replace(/\.xlsx$/i, "").trim();
  return parseMetaFromRaw(withoutExtension);
}

function extractDates(worksheet: ExcelJS.Worksheet) {
  const headerRow = worksheet.getRow(6);
  const dates: string[] = [];
  for (let col = 9; col <= worksheet.columnCount; col += 1) {
    const label = cellString(headerRow.getCell(col).value).trim();
    if (!label) {
      continue;
    }
    const parsed = parseDateFragment(label);
    if (parsed) {
      dates.push(parsed);
    }
  }
  return normalizeSessionDates(dates);
}

function extractSessionFee(rawTitle: string, students: StudentEntry[]) {
  const matched = rawTitle.match(/\*1회\s*([\d,]+)원/);
  if (matched) {
    return Number(matched[1].replace(/,/g, ""));
  }
  const paid = students.find((student) => student.paidAmount > 0 && student.attendanceCount > 0);
  if (!paid) {
    return 0;
  }
  return Math.round(paid.paidAmount / Math.max(paid.attendanceCount, 1));
}

function extractSessionCount(rawTitle: string, students: StudentEntry[], sessionDates: string[]) {
  const matched = rawTitle.match(/\*(\d+)회/);
  if (matched) {
    return Number(matched[1]);
  }
  if (sessionDates.length > 0) {
    return sessionDates.length;
  }
  return Math.max(...students.map((student) => student.attendanceCount), 0);
}

function buildDisplayTitle(rawCourseTitle: string, sessionCount: number, sessionDates: string[], sessionFee: number) {
  const compactDates = sessionDates.join(",");
  const segments = [rawCourseTitle];
  if (sessionCount > 0) {
    segments.push(`*${sessionCount}회(${compactDates})`);
  }
  if (sessionFee > 0) {
    segments.push(`*1회 ${sessionFee.toLocaleString("ko-KR")}원`);
  }
  return segments.join("  ").trim();
}

function parseStudentRows(worksheet: ExcelJS.Worksheet, feeRate: number) {
  const students: StudentEntry[] = [];
  for (let rowIndex = 8; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const studentName = cellString(row.getCell(3).value).trim();
    if (!studentName) {
      continue;
    }
    const paymentMethod = cellString(row.getCell(7).value).trim().replace(/^,+/, "");
    const paidSummary = cellString(row.getCell(8).value);
    const { paidAmount, unpaidAmount } = splitPaidAndUnpaid(paidSummary);

    let attendanceCount = 0;
    for (let col = 9; col <= worksheet.columnCount; col += 1) {
      const marker = cellString(row.getCell(col).value).trim();
      if (marker === "출" || marker === "지") {
        attendanceCount += 1;
      }
    }

    const payAmount = computePayAmount(paidAmount, paymentMethod, feeRate);
    const needsReview = !paymentMethod || paidAmount === 0 || unpaidAmount > 0;
    students.push({
      id: makeId(),
      studentName,
      carryOverMonth: null,
      attendanceCount,
      attendanceLabel: attendanceCount > 0 ? String(attendanceCount) : "",
      paidAmount,
      unpaidAmount,
      paymentMethod,
      payAmount,
      payOverridden: false,
      note: "",
      isCarryOver: false,
      needsReview
    });
  }
  return students;
}

function ensureCarryOverCourse(
  courses: CourseBlock[],
  courseMap: Map<string, CourseBlock>,
  teacherName: string,
  courseNameRaw: string,
  titleText: string,
  note: string
) {
  const key = buildCourseKey(teacherName, courseNameRaw);
  let targetCourse = courseMap.get(key);
  if (!targetCourse) {
    targetCourse = {
      id: makeId(),
      teacherName,
      courseNameRaw,
      titleText,
      sessionCount: 0,
      sessionDates: [],
      sessionFee: 0,
      sourceSheetName: "carry-over",
      carryOverCount: 0,
      needsReview: true,
      notes: [note],
      students: []
    };
    courses.push(targetCourse);
    courseMap.set(key, targetCourse);
  } else if (!targetCourse.notes.includes(note)) {
    targetCourse.notes.push(note);
  }
  return targetCourse;
}

function pushCarryOverStudent(
  targetCourse: CourseBlock,
  student: StudentEntry,
  carryOverMonth: number,
  feeRate: number
) {
  targetCourse.students.unshift({
    ...student,
    id: makeId(),
    carryOverMonth,
    attendanceCount: student.attendanceCount,
    attendanceLabel: student.attendanceLabel || (student.attendanceCount > 0 ? String(student.attendanceCount) : ""),
    paidAmount: 0,
    paymentMethod: "미납 이월",
    payAmount: computePayAmount(0, "미납 이월", feeRate),
    note: student.note ? `${student.note} / 전월 미납` : "전월 미납",
    isCarryOver: true,
    needsReview: true
  });
  targetCourse.carryOverCount += 1;
  targetCourse.needsReview = true;
}

function applyCarryOver(courses: CourseBlock[], previous: PreviousSettlementSource | null, feeRate: number) {
  if (!previous) {
    return;
  }
  const courseMap = new Map<string, CourseBlock>();
  for (const course of courses) {
    courseMap.set(buildCourseKey(course.teacherName, course.courseNameRaw), course);
  }
  const carryOverSeen = new Set<string>();

  for (const previousCourse of previous.carryOverCourses) {
    const carryStudents = previousCourse.students.filter((student) => student.unpaidAmount > 0);
    if (carryStudents.length === 0) {
      continue;
    }
    const targetCourse = ensureCarryOverCourse(
      courses,
      courseMap,
      previousCourse.teacherName,
      previousCourse.courseNameRaw,
      previousCourse.titleText,
      "미납회수금에서 복원된 강좌입니다."
    );

    for (const student of carryStudents) {
      const carryOverMonth = student.carryOverMonth ?? previous.month ?? null;
      const dedupeKey = buildCarryOverStudentKey(
        previousCourse.teacherName,
        previousCourse.courseNameRaw,
        student.studentName,
        carryOverMonth
      );
      if (carryOverMonth === null || carryOverSeen.has(dedupeKey)) {
        continue;
      }
      carryOverSeen.add(dedupeKey);
      pushCarryOverStudent(targetCourse, student, carryOverMonth, feeRate);
    }
  }

  if (!previous.meta) {
    return;
  }

  for (const previousCourse of previous.meta.courses) {
    const carryStudents = previousCourse.students.filter((student) => !student.isCarryOver && student.unpaidAmount > 0);
    if (carryStudents.length === 0) {
      continue;
    }
    const targetCourse = ensureCarryOverCourse(
      courses,
      courseMap,
      previousCourse.teacherName,
      previousCourse.courseNameRaw,
      previousCourse.titleText,
      "이월로 자동 생성된 강좌입니다."
    );

    for (const student of carryStudents) {
      const dedupeKey = buildCarryOverStudentKey(
        previousCourse.teacherName,
        previousCourse.courseNameRaw,
        student.studentName,
        previous.meta.month
      );
      if (carryOverSeen.has(dedupeKey)) {
        continue;
      }
      carryOverSeen.add(dedupeKey);
      pushCarryOverStudent(targetCourse, student, previous.meta.month, feeRate);
    }
  }
}

export async function parseAcaFiles(
  files: Array<{ name: string; buffer: Buffer }>,
  previous: PreviousSettlementSource | null,
  options: ParseOptions
) {
  const courses: CourseBlock[] = [];

  for (const file of files) {
    const workbook = new ExcelJS.Workbook();
    const payload = file.buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];
    await workbook.xlsx.load(payload);

    workbook.eachSheet((worksheet) => {
      const fileMeta = parseFileNameMeta(file.name);
      const sheetMeta = parseMetaFromRaw(worksheet.name);
      const headerRaw = cellString(worksheet.getCell("A1").value).trim();
      const headerMeta = parseMetaFromRaw(headerRaw || worksheet.name);

      const chosenMeta =
        fileMeta.titleBase && fileMeta.teacherName !== "미정T"
          ? fileMeta
          : sheetMeta.titleBase
            ? sheetMeta
            : headerMeta;

      if (!chosenMeta.titleBase) {
        return;
      }

      const students = parseStudentRows(worksheet, options.feeRate);
      if (students.length === 0) {
        return;
      }
      const sessionDates = extractDates(worksheet);
      const sessionFee = extractSessionFee(chosenMeta.titleBase || headerMeta.titleBase, students);
      const sessionCount = extractSessionCount(chosenMeta.titleBase || headerMeta.titleBase, students, sessionDates);
      const titleText = buildDisplayTitle(chosenMeta.titleBase, sessionCount, sessionDates, sessionFee);
      const notes: string[] = [];
      let needsReview = false;

      if (fileMeta.titleBase && headerMeta.titleBase && fileMeta.titleBase !== headerMeta.titleBase) {
        notes.push("파일명과 A1 제목이 달라 파일명을 우선 사용했습니다.");
        needsReview = true;
      }

      if (fileMeta.teacherName && headerMeta.teacherName && fileMeta.teacherName !== headerMeta.teacherName) {
        notes.push("파일명과 A1 강사명이 달라 파일명을 우선 사용했습니다.");
        needsReview = true;
      }

      courses.push({
        id: makeId(),
        teacherName: chosenMeta.teacherName,
        courseNameRaw: chosenMeta.titleBase,
        titleText,
        sessionCount,
        sessionDates,
        sessionFee,
        sourceSheetName: worksheet.name,
        carryOverCount: 0,
        needsReview,
        notes,
        students
      });
    });
  }

  applyCarryOver(courses, previous, options.feeRate);

  courses.sort((left, right) => {
    const teacherCompare = left.teacherName.localeCompare(right.teacherName, "ko");
    if (teacherCompare !== 0) {
      return teacherCompare;
    }
    return left.titleText.localeCompare(right.titleText, "ko");
  });

  return {
    campusName: options.campusName,
    year: options.year,
    month: options.month,
    feeRate: options.feeRate,
    templateSheetName: options.templateSheetName,
    templateWorkbookName: options.templateWorkbookName,
    courses
  } satisfies SettlementMonth;
}
