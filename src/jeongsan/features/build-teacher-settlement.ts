import type {
  CourseSettlement,
  ParsedPayDocument,
  PayoutRow,
  PreviousPayoutData,
  SettlementWarning,
  StudentSettlementRow,
  TeacherSettlement,
  TeacherSettlementMonth,
} from "@/jeongsan/features/types";
import {
  buildTeacherCourseMatchKey,
  computeTeacherSummary,
  createEmptyAssistant,
  inferSubjectName,
  makeId,
  normalizeKey,
  recalculatePayoutRow,
  sortTeachers,
} from "@/jeongsan/features/utils";

type BuildInput = {
  year: number;
  month: number;
  documents: ParsedPayDocument[];
  warnings: SettlementWarning[];
  previous: PreviousPayoutData | null;
  previousFileName: string | null;
  /** 전월 강사지급액 파일을 올렸을 때만, 전월 매칭 누락을 경고·검토 표시합니다. 파일이 없으면 비율·시수는 수동 입력 전제로 조용히 둡니다. */
  hasPreviousPayoutFile: boolean;
};

function createStudentRow(row: CourseSettlement["rows"][number]): StudentSettlementRow {
  return { ...row };
}

function toCourseSettlement(block: ParsedPayDocument["blocks"][number], teacherId: string): CourseSettlement {
  return {
    id: block.id,
    teacherId,
    teacherName: block.teacherName,
    teacherKey: block.teacherKey,
    sheetKind: block.sheetKind,
    sourceWorkbook: block.sourceWorkbook,
    sourceSheet: block.sourceSheet,
    titleText: block.courseTitle,
    courseName: block.courseName,
    courseKey: block.courseKey,
    scheduleText: block.scheduleText,
    detailSnapshot: block.detailSnapshot ?? null,
    rows: block.rows.map((row) => ({
      id: row.id,
      source: row.source,
      studentName: row.name,
      studentNameRaw: row.name,
      monthTag: row.nameMonthTag,
      attendanceCount: row.attendance.value,
      attendanceRaw: row.attendance.raw,
      paidAmount: row.paid.value,
      paidAmountRaw: row.paid.raw,
      unpaidAmount: row.unpaid.value,
      unpaidAmountRaw: row.unpaid.raw,
      paymentMethod: row.paymentMethod,
      payAmount: row.pay.value,
      payAmountRaw: row.pay.raw,
      note: row.memo,
      needsReview: row.needsReview,
    })),
  };
}

function summarizeCourse(
  course: CourseSettlement,
  month: number,
  previousMap: Map<string, PayoutRow | null>,
  warnings: SettlementWarning[],
  hasPreviousPayoutFile: boolean,
) {
  let previousOutstandingAmount = 0;
  let previousPaidAmount = 0;
  let currentPaidAmount = 0;
  let currentUnpaidAmount = 0;

  for (const row of course.rows) {
    if (course.sheetKind === "arrears") {
      previousOutstandingAmount += row.unpaidAmount;
      previousPaidAmount += row.payAmount;
      continue;
    }

    const isPrevious = row.monthTag !== null && row.monthTag !== month;
    if (isPrevious) {
      previousOutstandingAmount += row.unpaidAmount;
      previousPaidAmount += row.payAmount;
      continue;
    }
    currentPaidAmount += row.payAmount;
    currentUnpaidAmount += row.unpaidAmount;
  }

  const matchKey = buildTeacherCourseMatchKey(course.teacherName, course.courseName);
  const inherited = previousMap.get(matchKey);
  if (!inherited && hasPreviousPayoutFile) {
    warnings.push({
      id: makeId(),
      category: "match",
      message: `${course.teacherName} / ${course.courseName}: 전월 강사지급액에 해당 강좌가 없어 비율·시수를 직접 확인해 주세요.`,
      courseId: course.id,
    });
  }

  const missingPreviousRow = !inherited;
  const needsReviewFromPrevious = hasPreviousPayoutFile && missingPreviousRow;

  return recalculatePayoutRow({
    id: makeId(),
    courseId: course.id,
    courseName: course.courseName,
    courseKey: course.courseKey,
    sheetKind: course.sheetKind,
    scheduleText: course.scheduleText,
    previousOutstandingAmount,
    previousPaidAmount,
    currentPaidAmount,
    currentUnpaidAmount,
    totalSalesAmount: 0,
    ratio: inherited?.ratio ?? null,
    hours: inherited?.hours ?? null,
    payoutAmount: 0,
    note: inherited?.note ?? "",
    inherited: Boolean(inherited),
    inheritedFromPrevious: Boolean(inherited),
    needsReview: needsReviewFromPrevious,
  });
}

export function buildTeacherSettlementMonth(input: BuildInput): TeacherSettlementMonth {
  const warningList = [...input.warnings];
  const previousMap = new Map<string, PayoutRow | null>();

  if (input.previous) {
    for (const row of input.previous.rows) {
      previousMap.set(buildTeacherCourseMatchKey(row.teacherName, row.courseName), {
        id: makeId(),
        courseId: "",
        courseName: row.courseName,
        courseKey: row.courseKey,
        sheetKind: "revenue",
        scheduleText: "",
        previousOutstandingAmount: 0,
        previousPaidAmount: 0,
        currentPaidAmount: 0,
        currentUnpaidAmount: 0,
        totalSalesAmount: 0,
        ratio: row.ratio,
        hours: row.hours,
        payoutAmount: 0,
        note: row.note,
        inherited: true,
        inheritedFromPrevious: true,
        needsReview: false,
      });
    }
  }

  const teacherMap = new Map<string, TeacherSettlement>();

  for (const document of input.documents) {
    for (const block of document.blocks) {
      const teacherKey = normalizeKey(block.teacherName);
      const teacherId = teacherMap.get(teacherKey)?.id ?? makeId();
      const course = toCourseSettlement(block, teacherId);
      const teacher =
        teacherMap.get(teacherKey) ??
        {
          id: teacherId,
          teacherName: block.teacherName,
          teacherKey,
          subjectName: "",
          campusLabel: "고등1관",
          courses: [],
          payoutRows: [],
          extraPayoutLines: [],
          assistants: [],
          note: "",
          summary: {
            totalSalesAmount: 0,
            totalPayoutAmount: 0,
            totalAssistantGrossPay: 0,
            teacherTaxRate: 0.033,
            teacherTaxAmount: 0,
            finalTeacherPay: 0,
          },
        };

      teacher.courses.push(course);
      teacherMap.set(teacherKey, teacher);
    }
  }

  const teachers = sortTeachers([...teacherMap.values()]).map((teacher) => {
    const payoutRows = teacher.courses.map((course) =>
      summarizeCourse(course, input.month, previousMap, warningList, input.hasPreviousPayoutFile),
    );
    const assistants = [createEmptyAssistant(teacher.id)];
    const nextTeacher: TeacherSettlement = {
      ...teacher,
      subjectName: inferSubjectName(teacher.courses),
      campusLabel: teacher.campusLabel ?? "고등1관",
      payoutRows,
      extraPayoutLines: teacher.extraPayoutLines ?? [],
      assistants,
      summary: computeTeacherSummary({
        ...teacher,
        payoutRows,
        extraPayoutLines: teacher.extraPayoutLines ?? [],
        assistants,
      }),
    };
    return nextTeacher;
  });

  return {
    year: input.year,
    month: input.month,
    uploadedDocumentNames: input.documents.map((document) => document.workbookName),
    previousPayoutFileName: input.previousFileName,
    teachers,
    warnings: warningList,
  };
}
