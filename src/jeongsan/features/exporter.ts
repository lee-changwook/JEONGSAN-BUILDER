import ExcelJS from "exceljs";
import { pasteSnapshotToSheet } from "@/jeongsan/features/pay-block-snapshot";
import type { CourseSettlement, TeacherSettlement, TeacherSettlementMonth } from "@/jeongsan/features/types";
import { makeId } from "@/jeongsan/features/utils";

function snapshotHasSourceAnchor(snapshot: NonNullable<CourseSettlement["detailSnapshot"]>) {
  return (
    typeof snapshot.sourceAbsoluteRowStart === "number" &&
    typeof snapshot.sourceAbsoluteColStart === "number"
  );
}

function bandKey(course: CourseSettlement) {
  const s = course.detailSnapshot;
  if (!s || !snapshotHasSourceAnchor(s)) {
    return "";
  }
  const rs = s.sourceAbsoluteRowStart!;
  const re = rs + s.rowCount - 1;
  return `${course.sourceWorkbook}\0${course.sourceSheet}\0${rs}\0${re}`;
}

function sortCoursesBySourcePosition(courses: CourseSettlement[]) {
  return [...courses].sort((a, b) => {
    const sa = a.detailSnapshot;
    const sb = b.detailSnapshot;
    if (!sa || !sb) {
      return 0;
    }
    const wb = a.sourceWorkbook.localeCompare(b.sourceWorkbook);
    if (wb !== 0) {
      return wb;
    }
    const sh = a.sourceSheet.localeCompare(b.sourceSheet);
    if (sh !== 0) {
      return sh;
    }
    const ya = sa.sourceAbsoluteRowStart ?? 0;
    const yb = sb.sourceAbsoluteRowStart ?? 0;
    if (ya !== yb) {
      return ya - yb;
    }
    const xa = sa.sourceAbsoluteColStart ?? 0;
    const xb = sb.sourceAbsoluteColStart ?? 0;
    return xa - xb;
  });
}

function shortYear(year: number) {
  return String(year).slice(-2);
}

/** 샘플: "25년 2월 급여내역" */
function payrollSheetTitle(year: number, month: number) {
  return `${shortYear(year)}년 ${month}월 급여내역`;
}

function detailSheetTitle(year: number, month: number) {
  return `${shortYear(year)}년 ${month}월 강좌별 세부내역`;
}

function teacherDisplayName(teacherName: string) {
  return teacherName.replace(/T$/u, "").trim() || teacherName;
}

function payrollDocumentTitle(campusLabel: string | undefined, year: number, month: number) {
  const campus = (campusLabel ?? "고등1관").trim() || "고등1관";
  return `${campus} ${month}월 결산자료(${year}년)`;
}

function setHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: "FF0F172A" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.border = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };
}

function setValueStyle(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };
  cell.alignment = { vertical: "middle" };
}

function sanitizeSheetName(name: string) {
  const cleaned = name.replace(/[\\/*?:\[\]]/g, "").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 31) || "Sheet";
}

function uniqueWorksheetName(workbook: ExcelJS.Workbook, desired: string) {
  const base = sanitizeSheetName(desired);
  if (!workbook.getWorksheet(base)) {
    return base;
  }
  for (let index = 2; index < 200; index += 1) {
    const suffix = ` (${index})`;
    const candidate = sanitizeSheetName(base.slice(0, Math.max(1, 31 - suffix.length)) + suffix);
    if (!workbook.getWorksheet(candidate)) {
      return candidate;
    }
  }
  return sanitizeSheetName(`${base.slice(0, 20)}_${Math.random().toString(36).slice(2, 7)}`);
}

function renderLegacyCourseDetailBlock(sheet: ExcelJS.Worksheet, course: CourseSettlement, startRow: number) {
  let row = startRow;
  sheet.getCell(row, 1).value = "강좌";
  sheet.getCell(row, 2).value = course.courseName;
  sheet.getCell(row, 5).value = course.sheetKind === "material" ? "교재비" : course.sheetKind === "arrears" ? "장기미납" : "강좌";
  setHeaderStyle(sheet.getCell(row, 1));
  setValueStyle(sheet.getCell(row, 2));
  setHeaderStyle(sheet.getCell(row, 5));
  setValueStyle(sheet.getCell(row, 6));
  sheet.getCell(row, 6).value = course.scheduleText;
  row += 1;

  const headers = ["학생명", "실강회수", "납부액", "미납액", "납입방법", "PAY", "원본표시"];
  headers.forEach((header, index) => {
    const cell = sheet.getCell(row, index + 1);
    cell.value = header;
    setHeaderStyle(cell);
  });
  row += 1;

  for (const entry of course.rows) {
    [
      entry.studentNameRaw,
      entry.attendanceCount,
      entry.paidAmount,
      entry.unpaidAmount,
      entry.paymentMethod,
      entry.payAmount,
      [entry.attendanceRaw, entry.paidAmountRaw, entry.unpaidAmountRaw, entry.payAmountRaw].filter(Boolean).join(" / "),
    ].forEach((value, index) => {
      const cell = sheet.getCell(row, index + 1);
      cell.value = value;
      setValueStyle(cell);
    });
    row += 1;
  }
  return row + 1;
}

function renderTeacherDetailSheet(
  workbook: ExcelJS.Workbook,
  teacher: TeacherSettlement,
  year: number,
  month: number,
  sheetName?: string,
) {
  const resolvedName = sheetName
    ? uniqueWorksheetName(workbook, sheetName)
    : detailSheetTitle(year, month);
  const sheet = workbook.addWorksheet(resolvedName, {
    views: [{ showGridLines: true }],
  });
  const defaultRowHeightFromSnap = teacher.courses
    .map((c) => c.detailSnapshot?.defaultRowHeight)
    .find((h): h is number => typeof h === "number" && h > 0);
  if (defaultRowHeightFromSnap != null) {
    sheet.properties.defaultRowHeight = defaultRowHeightFromSnap;
  }
  const anchored = teacher.courses.filter(
    (c) => c.detailSnapshot && snapshotHasSourceAnchor(c.detailSnapshot),
  );
  const anchoredIds = new Set(anchored.map((c) => c.id));
  const maxRight = Math.max(
    7,
    ...teacher.courses.map((c) => {
      const s = c.detailSnapshot;
      if (!s) {
        return 7;
      }
      const left = snapshotHasSourceAnchor(s) ? s.sourceAbsoluteColStart! : 1;
      return left + s.colCount - 1;
    }),
  );
  sheet.mergeCells(1, 1, 1, maxRight);
  sheet.getCell("A1").value = payrollDocumentTitle(teacher.campusLabel, year, month);
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

  let row = 3;
  const sortedAnchored = sortCoursesBySourcePosition(anchored);
  const bandGroups: CourseSettlement[][] = [];
  for (const course of sortedAnchored) {
    const key = bandKey(course);
    const prev = bandGroups[bandGroups.length - 1];
    if (prev?.length && bandKey(prev[0]) === key) {
      prev.push(course);
    } else {
      bandGroups.push([course]);
    }
  }
  for (const group of bandGroups) {
    const ordered = [...group].sort((a, b) => {
      const xa = a.detailSnapshot!.sourceAbsoluteColStart ?? 0;
      const xb = b.detailSnapshot!.sourceAbsoluteColStart ?? 0;
      return xa - xb;
    });
    const maxH = Math.max(...ordered.map((c) => c.detailSnapshot!.rowCount));
    for (const course of ordered) {
      const s = course.detailSnapshot!;
      pasteSnapshotToSheet(sheet, s, row, s.sourceAbsoluteColStart!);
    }
    row += maxH + 1;
  }

  for (const course of teacher.courses) {
    if (anchoredIds.has(course.id)) {
      continue;
    }
    if (course.detailSnapshot) {
      pasteSnapshotToSheet(sheet, course.detailSnapshot, row, 1);
      row += course.detailSnapshot.rowCount + 1;
    } else {
      row = renderLegacyCourseDetailBlock(sheet, course, row);
    }
  }
  /* 스냅샷 붙인 열은 pasteSnapshotToSheet에서 이미 너비 복원. 아래 고정값은 열 1~7만 덮어써
   * 첫 박스(왼쪽)만 형식이 달라 보이는 원인이 됨 — 스냅샷이 하나라도 있으면 적용하지 않음 */
  if (!teacher.courses.some((c) => c.detailSnapshot)) {
    sheet.columns = [
      { width: 24 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
      { width: 16 },
      { width: 14 },
      { width: 34 },
    ];
  }
}

/**
 * 샘플 `김명훈T 급여대장 샘플.xlsx`의 「25년 N월 급여내역」 시트와 동일한 열·머지·첫 줄 이름/과목 구조
 */
function renderTeacherPayrollSheet(
  workbook: ExcelJS.Workbook,
  teacher: TeacherSettlement,
  year: number,
  month: number,
  sheetName?: string,
) {
  const resolvedName = sheetName
    ? uniqueWorksheetName(workbook, sheetName)
    : payrollSheetTitle(year, month);
  const sheet = workbook.addWorksheet(resolvedName);
  const lastCol = 16;
  sheet.mergeCells("A1:P1");
  sheet.getRow(1).height = 28;
  sheet.getCell(1, 1).value = payrollDocumentTitle(teacher.campusLabel, year, month);
  sheet.getCell(1, 1).font = { bold: true, size: 14 };
  sheet.getCell(1, 1).alignment = { vertical: "middle", horizontal: "center" };

  const headers = [
    "이름",
    "과목",
    "강좌명",
    "요일 및 시간",
    "전월누적미납액",
    "전월미납 납부액",
    `${month}월납부액`,
    `${month}월미납액`,
    `${month}월누적총매출액`,
    "비율",
    "시수",
    "강좌별지급액",
    "개별 총지급액",
    "세금공제(3.3)",
    "실지급액",
    "비고",
  ];
  headers.forEach((header, index) => {
    const cell = sheet.getCell(2, index + 1);
    cell.value = header;
    setHeaderStyle(cell);
  });

  const displayName = teacherDisplayName(teacher.teacherName);
  const subject = teacher.subjectName || "";
  const extras = teacher.extraPayoutLines ?? [];
  const totalBodyRows = teacher.payoutRows.length + extras.length;
  const firstDataRow = 3;
  const lastDataRow = firstDataRow + totalBodyRows - 1;

  let r = firstDataRow;
  for (let i = 0; i < teacher.payoutRows.length; i += 1) {
    const row = teacher.payoutRows[i];
    const isFirstRow = i === 0;
    for (let c = 1; c <= lastCol; c += 1) {
      setValueStyle(sheet.getCell(r, c));
    }
    sheet.getCell(r, 1).value = isFirstRow ? displayName : "";
    sheet.getCell(r, 2).value = isFirstRow ? subject : "";
    sheet.getCell(r, 3).value = row.courseName;
    sheet.getCell(r, 4).value = row.scheduleText;
    sheet.getCell(r, 5).value = row.previousOutstandingAmount;
    sheet.getCell(r, 6).value = row.previousPaidAmount;
    sheet.getCell(r, 7).value = row.currentPaidAmount;
    sheet.getCell(r, 8).value = row.currentUnpaidAmount;
    sheet.getCell(r, 9).value = row.totalSalesAmount;
    sheet.getCell(r, 10).value = row.ratio ?? "";
    sheet.getCell(r, 11).value = row.hours ?? "";
    sheet.getCell(r, 12).value = row.payoutAmount;
    sheet.getCell(r, 16).value = row.note;
    r += 1;
  }

  for (const extra of extras) {
    for (let c = 1; c <= lastCol; c += 1) {
      setValueStyle(sheet.getCell(r, c));
    }
    sheet.getCell(r, 1).value = "";
    sheet.getCell(r, 2).value = "";
    sheet.getCell(r, 3).value = extra.title;
    sheet.getCell(r, 4).value = extra.scheduleText;
    sheet.getCell(r, 10).value = extra.ratio ?? "";
    sheet.getCell(r, 11).value = extra.hours ?? "";
    sheet.getCell(r, 12).value = extra.amount;
    sheet.getCell(r, 16).value = extra.note;
    r += 1;
  }

  if (totalBodyRows > 0) {
    const mCell = sheet.getCell(firstDataRow, 13);
    mCell.value = {
      formula: `SUM(L${firstDataRow}:L${lastDataRow})`,
      result: teacher.summary.totalPayoutAmount,
    };
    sheet.getCell(firstDataRow, 14).value = teacher.summary.teacherTaxAmount;
    sheet.getCell(firstDataRow, 15).value = teacher.summary.finalTeacherPay;
    setValueStyle(mCell);
    setValueStyle(sheet.getCell(firstDataRow, 14));
    setValueStyle(sheet.getCell(firstDataRow, 15));
  }

  sheet.columns = Array.from({ length: lastCol }, (_, index) => ({
    width: index < 4 ? 18 : index === 12 || index === 14 ? 16 : 14,
  }));
}

function renderAssistantSheet(workbook: ExcelJS.Workbook, teacher: TeacherSettlement, sheetName?: string) {
  const resolvedName = sheetName ? uniqueWorksheetName(workbook, sheetName) : "조교지급액";
  const sheet = workbook.addWorksheet(resolvedName);
  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = `${teacher.teacherName} 조교`;
  sheet.getCell("A1").font = { bold: true, size: 16 };
  const headers = ["번호", "이름", "주민번호", "은행", "계좌번호", "급여", "공제액", "지급액"];
  headers.forEach((header, index) => {
    const cell = sheet.getCell(3, index + 1);
    cell.value = header;
    setHeaderStyle(cell);
  });

  teacher.assistants.forEach((assistant, index) => {
    const row = index + 4;
    const values = [
      index + 1,
      assistant.name,
      assistant.residentId,
      assistant.bankName,
      assistant.accountNumber,
      assistant.grossPay,
      assistant.taxAmount,
      assistant.netPay,
    ];
    values.forEach((value, valueIndex) => {
      const cell = sheet.getCell(row, valueIndex + 1);
      cell.value = value;
      setValueStyle(cell);
    });
  });
  sheet.columns = headers.map((_, index) => ({ width: index === 1 ? 18 : 16 }));
}

function renderAllTeachersSheet(workbook: ExcelJS.Workbook, settlement: TeacherSettlementMonth) {
  const sheet = workbook.addWorksheet("전체 정산");
  let row = 1;
  for (const teacher of settlement.teachers) {
    sheet.mergeCells(`A${row}:H${row}`);
    sheet.getCell(row, 1).value = payrollDocumentTitle(teacher.campusLabel, settlement.year, settlement.month);
    sheet.getCell(row, 1).font = { bold: true, size: 15 };
    row += 1;
    sheet.getCell(row, 1).value = teacher.teacherName;
    sheet.getCell(row, 1).font = { bold: true };
    row += 1;

    const headers = ["강좌명", "유형", "전월미납", "전월납부", "당월납부", "당월미납", "비율", "지급액"];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(row, index + 1);
      cell.value = header;
      setHeaderStyle(cell);
    });
    row += 1;

    for (const payout of teacher.payoutRows) {
      const values = [
        payout.courseName,
        payout.sheetKind === "material" ? "교재비" : payout.sheetKind === "arrears" ? "장기미납" : "강좌",
        payout.previousOutstandingAmount,
        payout.previousPaidAmount,
        payout.currentPaidAmount,
        payout.currentUnpaidAmount,
        payout.ratio ?? "",
        payout.payoutAmount,
      ];
      values.forEach((value, index) => {
        const cell = sheet.getCell(row, index + 1);
        cell.value = value;
        setValueStyle(cell);
      });
      row += 1;
    }
    for (const extra of teacher.extraPayoutLines ?? []) {
      const values = [extra.title, "기타", "", "", "", "", extra.ratio ?? "", extra.amount];
      values.forEach((value, index) => {
        const cell = sheet.getCell(row, index + 1);
        cell.value = value;
        setValueStyle(cell);
      });
      row += 1;
    }

    row += 1;
    const total = sheet.getCell(row, 1);
    total.value = `${teacher.teacherName} 최종지급액`;
    setHeaderStyle(total);
    const totalValue = sheet.getCell(row, 2);
    totalValue.value = teacher.summary.finalTeacherPay;
    setValueStyle(totalValue);
    row += 3;
  }
  sheet.columns = Array.from({ length: 8 }, (_, index) => ({ width: index === 0 ? 28 : 14 }));
}

function writeMetaSheet(workbook: ExcelJS.Workbook, teachers: TeacherSettlement[]) {
  const sheet = workbook.addWorksheet("__JEONGSAN_META");
  sheet.state = "veryHidden";
  sheet.getCell("A1").value = "row";
  sheet.getCell("B1").value = "payload";
  let rowNumber = 2;
  for (const teacher of teachers) {
    sheet.getCell(rowNumber, 1).value = makeId();
    sheet.getCell(rowNumber, 2).value = JSON.stringify({
      campusLabel: teacher.campusLabel,
      extraPayoutLines: teacher.extraPayoutLines ?? [],
    });
    rowNumber += 1;
    for (const payout of teacher.payoutRows) {
      sheet.getCell(rowNumber, 1).value = makeId();
      sheet.getCell(rowNumber, 2).value = JSON.stringify({
        teacherName: teacher.teacherName,
        teacherKey: teacher.teacherKey,
        courseName: payout.courseName,
        courseKey: payout.courseKey,
        ratio: payout.ratio,
        hours: payout.hours,
        note: payout.note,
      });
      rowNumber += 1;
    }
  }
}

export async function buildExportWorkbook(
  settlement: TeacherSettlementMonth,
  mode: "teacher" | "all" | "selected",
  teacherId?: string,
  teacherIds?: string[],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "jeongsan-builder";

  if (mode === "teacher") {
    const teacher = settlement.teachers.find((entry) => entry.id === teacherId);
    if (!teacher) {
      throw new Error("내보낼 강사를 찾지 못했습니다.");
    }
    renderTeacherPayrollSheet(workbook, teacher, settlement.year, settlement.month);
    renderTeacherDetailSheet(workbook, teacher, settlement.year, settlement.month);
    renderAssistantSheet(workbook, teacher);
    writeMetaSheet(workbook, [teacher]);
    return {
      workbook,
      fileName: `${shortYear(settlement.year)}년 ${settlement.month}월_${teacher.teacherName}_급여대장.xlsx`,
    };
  }

  if (mode === "selected") {
    const ids = teacherIds ?? [];
    const teachers = ids
      .map((id) => settlement.teachers.find((entry) => entry.id === id))
      .filter((entry): entry is TeacherSettlement => Boolean(entry));
    if (teachers.length === 0) {
      throw new Error("내보낼 강사를 한 명 이상 선택해 주세요.");
    }
    if (teachers.length === 1) {
      const teacher = teachers[0];
      renderTeacherPayrollSheet(workbook, teacher, settlement.year, settlement.month);
      renderTeacherDetailSheet(workbook, teacher, settlement.year, settlement.month);
      renderAssistantSheet(workbook, teacher);
      writeMetaSheet(workbook, [teacher]);
      return {
        workbook,
        fileName: `${shortYear(settlement.year)}년 ${settlement.month}월_${teacher.teacherName}_급여대장.xlsx`,
      };
    }
    const { year, month } = settlement;
    for (const teacher of teachers) {
      const label = teacher.teacherName.replace(/T$/u, "").trim().slice(0, 10) || "강사";
      renderTeacherPayrollSheet(
        workbook,
        teacher,
        year,
        month,
        `${payrollSheetTitle(year, month)}_${label}`,
      );
      renderTeacherDetailSheet(
        workbook,
        teacher,
        year,
        month,
        `${detailSheetTitle(year, month)}_${label}`,
      );
      renderAssistantSheet(workbook, teacher, `조교_${label}`);
    }
    writeMetaSheet(workbook, teachers);
    return {
      workbook,
      fileName: `${shortYear(settlement.year)}년 ${settlement.month}월_선택강사_${teachers.length}명_급여대장.xlsx`,
    };
  }

  renderAllTeachersSheet(workbook, settlement);
  writeMetaSheet(workbook, settlement.teachers);
  return {
    workbook,
    fileName: `${shortYear(settlement.year)}년 ${settlement.month}월_강사전체_급여대장.xlsx`,
  };
}
