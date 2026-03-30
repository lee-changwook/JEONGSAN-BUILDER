import ExcelJS from "exceljs";
import { SLOT_CONFIGS } from "./template";
import { makeId, parseNumber } from "./utils";
import type { PreviousSettlementMeta, PreviousSettlementSource, StudentEntry } from '@/features/paybuilder/types';

type ExpectedPreviousMonth = {
  year: number;
  month: number;
};

type ParsedSheetIdentity = {
  campusName: string | null;
  year: number | null;
  month: number | null;
};

function text(value: ExcelJS.CellValue | null | undefined) {
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

function parseSheetIdentity(sheet: ExcelJS.Worksheet): ParsedSheetIdentity {
  const header = sheet.getCell("A1").text.trim();
  const source = header || sheet.name;
  const longMatch = source.match(/(\d{4})년\s*(\d{1,2})월\s*(.+?)\s*강좌별(?:\s*매출)?/);
  if (longMatch) {
    return {
      year: Number(longMatch[1]),
      month: Number(longMatch[2]),
      campusName: longMatch[3].trim()
    };
  }

  const shortMatch = source.match(/(\d{2})\.(\d{1,2})월\s*(.+?)강좌별/);
  if (shortMatch) {
    return {
      year: 2000 + Number(shortMatch[1]),
      month: Number(shortMatch[2]),
      campusName: shortMatch[3].trim()
    };
  }

  return {
    year: null,
    month: null,
    campusName: null
  };
}

function choosePreviousSheet(workbook: ExcelJS.Workbook, expected: ExpectedPreviousMonth) {
  const visibleSheets = workbook.worksheets.filter((sheet) => sheet.state === "visible");
  const candidateSheets = visibleSheets.filter((sheet) => {
    const header = sheet.getCell("A1").text.trim();
    return sheet.name.includes("강좌별") || header.includes("강좌별");
  });

  if (candidateSheets.length === 0) {
    return null;
  }

  const exact = candidateSheets.find((sheet) => {
    const identity = parseSheetIdentity(sheet);
    return identity.year === expected.year && identity.month === expected.month;
  });
  return exact ?? candidateSheets[0];
}

function parseCarryOverName(rawName: string, fallbackMonth: number) {
  const trimmed = rawName.trim();
  const matched = trimmed.match(/^(.*?)(?:\((\d{1,2})월\))$/);
  if (!matched) {
    return {
      studentName: trimmed,
      carryOverMonth: fallbackMonth
    };
  }
  return {
    studentName: matched[1].trim(),
    carryOverMonth: Number(matched[2])
  };
}

function parseArrearsStudents(
  sheet: ExcelJS.Worksheet,
  row: number,
  slot: (typeof SLOT_CONFIGS)[number],
  fallbackMonth: number
) {
  const students: StudentEntry[] = [];
  let cursor = row;

  while (cursor <= sheet.rowCount) {
    const studentCell = sheet.getRow(cursor).getCell(slot.studentCol).text.trim();
    const countCell = sheet.getRow(cursor).getCell(slot.countCol).text.trim();
    if (!studentCell || studentCell === "전월미납" || countCell === "TOTAL") {
      break;
    }

    const { studentName, carryOverMonth } = parseCarryOverName(studentCell, fallbackMonth);
    const attendanceCount = parseNumber(text(sheet.getRow(cursor).getCell(slot.countCol).value));
    const paidAmount = parseNumber(text(sheet.getRow(cursor).getCell(slot.paidCol).value));
    const unpaidAmount = parseNumber(text(sheet.getRow(cursor).getCell(slot.unpaidCol).value));
    const paymentMethod = sheet.getRow(cursor).getCell(slot.methodCol).text.trim();
    const payAmount = parseNumber(text(sheet.getRow(cursor).getCell(slot.payCol).value));

    students.push({
      id: makeId(),
      studentName,
      carryOverMonth,
      attendanceCount,
      attendanceLabel: attendanceCount > 0 ? String(attendanceCount) : "",
      paidAmount,
      unpaidAmount,
      paymentMethod,
      payAmount,
      payOverridden: false,
      note: "",
      isCarryOver: true,
      needsReview: unpaidAmount > 0
    });
    cursor += 1;
  }

  return {
    students,
    nextRow: cursor
  };
}

function parseCarryOverCourses(sheet: ExcelJS.Worksheet, fallbackMonth: number) {
  const courses: PreviousSettlementMeta["courses"] = [];
  const bandStarts: number[] = [];
  for (let row = 1; row <= sheet.rowCount; row += 1) {
    if (sheet.getRow(row).getCell(1).text.trim() === "강사") {
      bandStarts.push(row);
    }
  }

  for (let bandIndex = 0; bandIndex < bandStarts.length; bandIndex += 1) {
    const teacherRow = bandStarts[bandIndex];
    const bandEnd = (bandStarts[bandIndex + 1] ?? sheet.rowCount + 1) - 1;

    for (const slot of SLOT_CONFIGS) {
      const teacherName = sheet.getRow(teacherRow).getCell(slot.studentCol).text.trim();
      if (!teacherName) {
        continue;
      }

      let arrearsMonthRow: number | null = null;
      for (let row = teacherRow + 1; row <= bandEnd; row += 1) {
        if (sheet.getRow(row).getCell(slot.studentCol).text.trim() === "미납회수금") {
          arrearsMonthRow = row;
          break;
        }
      }

      if (!arrearsMonthRow) {
        continue;
      }

      let cursor = arrearsMonthRow + 1;
      while (cursor <= bandEnd) {
        const title = sheet.getRow(cursor).getCell(slot.studentCol).text.trim();
        if (!title) {
          cursor += 1;
          continue;
        }
        if (title === "전월미납") {
          break;
        }

        const headerLabel = sheet.getRow(cursor + 1).getCell(slot.studentCol).text.trim();
        if (headerLabel !== "학생명") {
          cursor += 1;
          continue;
        }

        const parsed = parseArrearsStudents(sheet, cursor + 2, slot, fallbackMonth);
        if (parsed.students.length > 0) {
          courses.push({
            id: makeId(),
            titleText: title,
            teacherName,
            courseNameRaw: title,
            students: parsed.students
          });
        }
        cursor = parsed.nextRow;
      }
    }
  }

  return courses;
}

export async function readPreviousSettlement(buffer: Buffer, expected: ExpectedPreviousMonth): Promise<PreviousSettlementSource> {
  const workbook = new ExcelJS.Workbook();
  const workbookPayload = buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];
  await workbook.xlsx.load(workbookPayload);

  const metaSheet = workbook.getWorksheet("__SETTLEMENT_META");
  let meta: PreviousSettlementMeta | null = null;
  if (metaSheet) {
    const firstChunk = metaSheet.getCell("B2").value;
    if (typeof firstChunk === "string") {
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
      meta = JSON.parse(json) as PreviousSettlementMeta;
    }
  }

  const targetSheet = choosePreviousSheet(workbook, expected);
  const identity = targetSheet ? parseSheetIdentity(targetSheet) : { campusName: null, year: null, month: null };
  const carryOverCourses = targetSheet ? parseCarryOverCourses(targetSheet, expected.month) : [];

  return {
    meta,
    carryOverCourses,
    campusName: meta?.campusName ?? identity.campusName,
    year: meta?.year ?? identity.year,
    month: meta?.month ?? identity.month
  };
}
