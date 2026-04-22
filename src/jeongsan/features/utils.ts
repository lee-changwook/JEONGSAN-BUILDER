import type {
  AssistantPayrollRow,
  CourseSettlement,
  NumericCell,
  PayoutRow,
  TeacherSettlement,
  TeacherSettlementMonth,
} from "@/jeongsan/features/types";

export function makeId() {
  return crypto.randomUUID();
}

const OPEN_XML_SPREADSHEET_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
]);

/** ExcelJS로 읽는 OOXML 통합문서(.xlsx / .xlsm). 확장자 대소문자·MIME으로 식별 */
export function isOpenXmlSpreadsheetFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) {
    return true;
  }
  if (file.type && OPEN_XML_SPREADSHEET_MIME_TYPES.has(file.type)) {
    return true;
  }
  return false;
}

export function text(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
  }
  if (typeof value === "object" && value && "text" in value && typeof value.text === "string") {
    return value.text;
  }
  if (typeof value === "object" && value && "result" in value) {
    return text((value as { result?: unknown }).result);
  }
  if (typeof value === "object" && value && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((entry: { text?: string }) => entry.text ?? "").join("");
  }
  return "";
}

export function roundCurrency(value: number) {
  return Math.round(value);
}

export function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function normalizeKey(input: string) {
  return normalizeWhitespace(input)
    .replace(/[()]/g, " ")
    .replace(/[_/]/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ko-KR");
}

export function normalizeTeacherName(input: string) {
  const cleaned = normalizeWhitespace(input).replace(/\s+/g, "");
  return cleaned || "강사미정";
}

export function extractTeacherName(input: string) {
  const direct = input.match(/([가-힣A-Za-z]+T)/);
  if (direct?.[1]) {
    return normalizeTeacherName(direct[1]);
  }
  return normalizeTeacherName(input || "강사미정");
}

export function simplifyCourseName(input: string) {
  const firstLine = normalizeWhitespace(input.split(/\r?\n/)[0] ?? "");
  return firstLine
    .replace(/^\d{2,4}[.)년월\s]*/g, "")
    .replace(/^[A-Z]?\d{0,2}[가-힣A-Za-z0-9]+[-_]/, "")
    .replace(/[-_](?:월|화|수|목|금|토|일).+$/u, "")
    .replace(/[-_][가-힣A-Za-z0-9]+T.*$/u, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\*.*$/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || firstLine;
}

/** settlement `aca-parser` `parseCourseTitle`와 동일 계열 — 출결/샘플 문구만 제거 */
export function parsePayCourseTitleBase(raw: string): string {
  let s = normalizeWhitespace(raw.replace(/\r\n/g, "\n"));
  s = s.replace(/출결현황[\s\S]*$/gim, "").replace(/\(샘플\)/g, "").trim();
  const lines = s
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines[0] ?? "";
}

/** settlement 표시 제목의 `*8회(...)` / `*1회 n원` 줄 — 강좌명 본문에서 분리 */
export function stripPayTitleSessionMarkers(line: string): string {
  return line
    .replace(/\s*\*\d+회\([^)]*\).*/g, "")
    .replace(/\s*\*1회\s*[\d,]+원.*/g, "")
    .trim();
}

/**
 * settlement `parseTeacherName`이 잡는 `_김명훈T` / `-김명훈T` 접미사를 블록 제목 끝에서 제거해 강좌명만 남김.
 * (페이문서 블록 제목은 `과합…_토710…(개강…)_김명훈T` 형태가 많음)
 */
export function stripPayTitleTrailingTeacher(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) {
    return "";
  }
  let m = trimmed.match(/^(.*)_[가-힣A-Za-z0-9]+T(?:\([^)]*\))?(?:반)?$/u);
  if (m?.[1] !== undefined) {
    const left = m[1].trim();
    return left || trimmed;
  }
  m = trimmed.match(/^(.+)-[가-힣A-Za-z0-9]+T(?:\([^)]*\))?(?:반)?$/u);
  if (m?.[1] !== undefined) {
    const left = m[1].trim();
    return left || trimmed;
  }
  return trimmed;
}

/**
 * 페이 문서 블록 제목 → 강좌명 (settlement 아카·강좌 제목 규칙에 맞춤).
 * 과도한 치환 없이 첫 줄 + 회차 표시 제거 + 강사 접미사 제거.
 */
export function derivePayDocumentCourseName(rawTitle: string): string {
  const firstLine = parsePayCourseTitleBase(rawTitle);
  if (!firstLine) {
    return "";
  }
  const withoutSessions = stripPayTitleSessionMarkers(firstLine);
  let name = stripPayTitleTrailingTeacher(withoutSessions);
  name = normalizeWhitespace(name.replace(/\s+/g, " ").trim());
  if (!name || name.length < 1) {
    name = stripPayTitleTrailingTeacher(firstLine).trim() || firstLine.trim();
  }
  return name || firstLine;
}

export function extractScheduleText(input: string) {
  const firstLine = input.split(/\r?\n/)[0] ?? "";
  const paren = firstLine.match(/\(([^)]*)\)/);
  return paren?.[1]?.trim() ?? "";
}

export function parseMonthTagFromName(name: string) {
  const matched = name.match(/\((\d{1,2})월\)/);
  return matched ? Number(matched[1]) : null;
}

export function parseNumericCell(rawInput: string): NumericCell {
  const raw = normalizeWhitespace(rawInput);
  if (!raw) {
    return { raw: "", value: 0 };
  }

  const sanitized = raw
    .replace(/[원,\s]/g, "")
    .replace(/×/g, "*");

  if (/^[=+\-*/().\d]+$/.test(sanitized)) {
    try {
      const value = Function(`"use strict"; return (${sanitized.replace(/^=/, "")});`)();
      if (typeof value === "number" && Number.isFinite(value)) {
        return { raw, value: roundCurrency(value) };
      }
    } catch {
      // noop
    }
  }

  const numberLike = sanitized.match(/-?\d+(?:\.\d+)?/g);
  if (!numberLike) {
    return { raw, value: 0 };
  }
  if (numberLike.length === 1) {
    return { raw, value: roundCurrency(Number(numberLike[0])) };
  }
  return {
    raw,
    value: roundCurrency(numberLike.reduce((sum, token) => sum + Number(token), 0)),
  };
}

export function computePayFromPaid(paidAmount: number, paymentMethod: string) {
  if (paymentMethod.toLocaleLowerCase("ko-KR").includes("카드")) {
    return roundCurrency(paidAmount * 0.965);
  }
  return roundCurrency(paidAmount);
}

export function createEmptyAssistant(teacherId: string): AssistantPayrollRow {
  const grossPay = 0;
  const taxRate = 0.033;
  return {
    id: makeId(),
    teacherId,
    name: "",
    residentId: "",
    bankName: "",
    accountNumber: "",
    grossPay,
    taxRate,
    taxAmount: 0,
    netPay: 0,
  };
}

export function recalculateAssistant(row: AssistantPayrollRow): AssistantPayrollRow {
  const taxAmount = roundCurrency(row.grossPay * row.taxRate);
  return {
    ...row,
    taxAmount,
    netPay: roundCurrency(row.grossPay - taxAmount),
  };
}

export function recalculatePayoutRow(row: PayoutRow): PayoutRow {
  const totalSalesAmount = roundCurrency(row.previousPaidAmount + row.currentPaidAmount);
  const payoutAmount = row.ratio === null ? 0 : roundCurrency(totalSalesAmount * row.ratio);
  return {
    ...row,
    totalSalesAmount,
    payoutAmount,
  };
}

export function computeTeacherSummary(teacher: TeacherSettlement): TeacherSettlement["summary"] {
  const totalSalesAmount = teacher.payoutRows.reduce((sum, row) => sum + row.totalSalesAmount, 0);
  const coursePayout = teacher.payoutRows.reduce((sum, row) => sum + row.payoutAmount, 0);
  const extraPayout = (teacher.extraPayoutLines ?? []).reduce((sum, line) => sum + line.amount, 0);
  const totalPayoutAmount = coursePayout + extraPayout;
  const totalAssistantGrossPay = teacher.assistants.reduce((sum, row) => sum + row.grossPay, 0);
  const teacherTaxRate = 0.033;
  const teacherTaxAmount = roundCurrency(totalPayoutAmount * teacherTaxRate);
  const finalTeacherPay = roundCurrency(totalPayoutAmount - totalAssistantGrossPay - teacherTaxAmount);

  return {
    totalSalesAmount,
    totalPayoutAmount,
    totalAssistantGrossPay,
    teacherTaxRate,
    teacherTaxAmount,
    finalTeacherPay,
  };
}

export function recalculateTeacher(teacher: TeacherSettlement): TeacherSettlement {
  const payoutRows = teacher.payoutRows.map(recalculatePayoutRow);
  const assistants = teacher.assistants.map(recalculateAssistant);
  return {
    ...teacher,
    payoutRows,
    assistants,
    summary: computeTeacherSummary({
      ...teacher,
      payoutRows,
      assistants,
    }),
  };
}

export function recalculateSettlement(settlement: TeacherSettlementMonth): TeacherSettlementMonth {
  return {
    ...settlement,
    teachers: settlement.teachers.map(recalculateTeacher),
  };
}

export function sortTeachers<T extends { teacherName: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.teacherName.localeCompare(b.teacherName, "ko-KR"));
}

export function sheetMatchesTarget(year: number, month: number, candidates: string[]) {
  const targetYearCandidates = new Set([year, Number(String(year).slice(-2))]);
  const targetMonth = month;

  return candidates.some((candidate) => {
    const value = normalizeWhitespace(candidate);

    const explicitMatches = [
      ...value.matchAll(/(\d{4})년?\s*\(?[^)]*\)?\s*(\d{1,2})월/g),
      ...value.matchAll(/(\d{2})[.](\d{1,2})월/g),
      ...value.matchAll(/(\d{4})\s*[/-]\s*(\d{1,2})/g),
      ...value.matchAll(/(\d{2})\s*[/-]\s*(\d{1,2})/g),
    ];

    if (explicitMatches.some((match) => targetYearCandidates.has(Number(match[1])) && Number(match[2]) === targetMonth)) {
      return true;
    }

    const zeroPaddedShort = `${String(year).slice(-2)}.${String(month).padStart(2, "0")}월`;
    const unpaddedShort = `${String(year).slice(-2)}.${month}월`;
    const fullLabel = `${year}년 ${month}월`;
    return value.includes(zeroPaddedShort) || value.includes(unpaddedShort) || value.includes(fullLabel);
  });
}

export function detectSheetKind(name: string, header: string) {
  const combined = `${name} ${header}`;
  if (combined.includes("장기미납") || combined.includes("미납회수금")) {
    return "arrears" as const;
  }
  if (combined.includes("교재비")) {
    return "material" as const;
  }
  if (combined.includes("강좌별")) {
    return "revenue" as const;
  }
  return null;
}

export function buildTeacherCourseMatchKey(teacherName: string, courseName: string) {
  return `${normalizeKey(teacherName)}::${normalizeKey(courseName)}`;
}

export function inferSubjectName(courses: CourseSettlement[]) {
  const material = courses.find((course) => course.sheetKind !== "material");
  const basis = material?.courseName ?? courses[0]?.courseName ?? "";
  if (basis.includes("수학")) return "수학";
  if (basis.includes("영어")) return "영어";
  if (basis.includes("화학")) return "화학";
  if (basis.includes("생명")) return "생명";
  if (basis.includes("물리")) return "물리";
  return "";
}
