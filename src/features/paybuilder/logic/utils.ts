import type { CourseBlock } from '@/features/paybuilder/types';

export function makeId() {
  return crypto.randomUUID();
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return 0;
  }
  const normalized = value.replace(/[,\s원]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isCardPayment(method: string) {
  const normalized = method.toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized.includes("카드");
}

export function computePayAmount(paidAmount: number, paymentMethod: string, feeRate: number) {
  if (isCardPayment(paymentMethod)) {
    return Math.round(paidAmount * (1 - feeRate));
  }
  return Math.round(paidAmount);
}

export function splitPaidAndUnpaid(raw: string) {
  const [paidPart = "0", unpaidPart = "0"] = raw.split("/");
  return {
    paidAmount: parseNumber(paidPart),
    unpaidAmount: parseNumber(unpaidPart)
  };
}

export function monthLabel(year: number, month: number) {
  return `${year}년 ${month}월`;
}

export function sheetMonthLabel(year: number, month: number, campusName: string) {
  const shortYear = String(year).slice(-2);
  return `${shortYear}.${month}월 ${campusName}강좌별`;
}

export function fileNameLabel(year: number, month: number, campusName: string) {
  return `${year}년 ${month}월_강좌별매출(${campusName}).xlsx`;
}

export function parseDateFragment(label: string) {
  const compact = label.replace(/\s+/g, "").trim();
  if (!compact) {
    return "";
  }

  const monthDayMatch = compact.match(/(?:\d{2,4}[./-])?(\d{1,2})월(\d{1,2})일?/);
  if (monthDayMatch) {
    return `${monthDayMatch[2].padStart(2, "0")}일`;
  }

  const dayMatch = compact.match(/(?:\d{2,4}[./-])?(?:\d{1,2}[./-])?(\d{1,2})일$/);
  if (dayMatch) {
    return `${dayMatch[1].padStart(2, "0")}일`;
  }

  const slashMatch = compact.match(/(?:\d{2,4}[./-])?(\d{1,2})[./-](\d{1,2})$/);
  if (slashMatch) {
    return `${slashMatch[2].padStart(2, "0")}일`;
  }

  const numberMatch = compact.match(/^(\d{1,2})(일|월)?$/);
  if (numberMatch) {
    const value = Number(numberMatch[1]);
    if (numberMatch[2] === "월" && value <= 12) {
      return "";
    }
    return `${String(value).padStart(2, "0")}일`;
  }

  return compact;
}

export function normalizeSessionDates(values: string[]) {
  const deduped = new Set<string>();
  for (const value of values) {
    const parsed = parseDateFragment(value);
    if (!parsed) {
      continue;
    }
    deduped.add(parsed);
  }
  return Array.from(deduped);
}

export function buildCourseKey(teacherName: string, courseNameRaw: string) {
  return normalizeWhitespace(`${teacherName}::${courseNameRaw}`).toLowerCase();
}

export function buildCarryOverStudentKey(
  teacherName: string,
  courseNameRaw: string,
  studentName: string,
  carryOverMonth: number | null
) {
  return normalizeWhitespace(`${teacherName}::${courseNameRaw}::${studentName}::${carryOverMonth ?? ""}`).toLowerCase();
}

export function totalCoursePay(course: CourseBlock) {
  return course.students.reduce((sum, student) => sum + student.payAmount, 0);
}

export function totalCourseUnpaid(course: CourseBlock) {
  return course.students.reduce((sum, student) => sum + student.unpaidAmount, 0);
}

export function mergeCourseCollections(existingCourses: CourseBlock[], incomingCourses: CourseBlock[]) {
  const merged = new Map<string, CourseBlock>();

  for (const course of existingCourses) {
    merged.set(buildCourseKey(course.teacherName, course.courseNameRaw), course);
  }

  for (const course of incomingCourses) {
    const key = buildCourseKey(course.teacherName, course.courseNameRaw);
    const current = merged.get(key);
    if (!current) {
      merged.set(key, course);
      continue;
    }

    const currentCarry = current.students.filter((student) => student.isCarryOver);
    const currentRegular = current.students.filter((student) => !student.isCarryOver);
    const incomingCarry = course.students.filter((student) => student.isCarryOver);
    const incomingRegular = course.students.filter((student) => !student.isCarryOver);

    merged.set(key, {
      ...current,
      ...course,
      notes: Array.from(new Set([...current.notes, ...course.notes])),
      carryOverCount: Math.max(current.carryOverCount, course.carryOverCount, currentCarry.length, incomingCarry.length),
      needsReview: current.needsReview || course.needsReview,
      students: [
        ...(currentCarry.length > 0 ? currentCarry : incomingCarry),
        ...(currentRegular.length > 0 ? currentRegular : incomingRegular)
      ]
    });
  }

  return Array.from(merged.values()).sort((left, right) => {
    const teacherCompare = left.teacherName.localeCompare(right.teacherName, "ko");
    if (teacherCompare !== 0) {
      return teacherCompare;
    }
    return left.titleText.localeCompare(right.titleText, "ko");
  });
}

export function getDefaultTargetMonth() {
  const now = new Date();
  return {
    year: now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(),
    month: now.getMonth() === 11 ? 1 : now.getMonth() + 2
  };
}
