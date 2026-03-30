import ExcelJS from 'exceljs';

export interface ParsedStudent {
  name: string;
  school: string;
  grade: string;
  parentPhone: string;
  previousUnpaid: number;
}

export interface ParsedCourseMeta {
  sessionCount: number | null;
  sessionFee: number | null;
  gyojaeBi: number | null;
}

export interface ExcelParseResult {
  students: ParsedStudent[];
  sessionDates: string[];
  courseMeta: ParsedCourseMeta;
}

function cellString(value: ExcelJS.CellValue | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if ('richText' in value) return value.richText.map((e) => e.text).join('');
  if ('text' in value) return value.text ?? '';
  if ('formula' in value) return value.result ? String(value.result) : '';
  return '';
}

function parseNumber(raw: string): number {
  return Number(raw.replace(/[^0-9.-]/g, '')) || 0;
}

function extractLast4Digits(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length >= 4) return digits.slice(-4);
  return digits;
}

function splitSchoolGrade(raw: string): { school: string; grade: string } {
  const trimmed = raw.trim();
  const slashIdx = trimmed.lastIndexOf('/');
  if (slashIdx >= 0) {
    return {
      school: trimmed.slice(0, slashIdx).trim(),
      grade: trimmed.slice(slashIdx + 1).trim(),
    };
  }
  return { school: trimmed, grade: '' };
}

function extractCourseMeta(rawTitle: string): ParsedCourseMeta {
  let sessionCount: number | null = null;
  let sessionFee: number | null = null;
  let gyojaeBi: number | null = null;

  const countMatch = rawTitle.match(/\*(\d+)회/);
  if (countMatch) sessionCount = Number(countMatch[1]);

  const feeMatch = rawTitle.match(/\*1회\s*([\d,]+)원/);
  if (feeMatch) sessionFee = Number(feeMatch[1].replace(/,/g, ''));

  const gyojaeMatch = rawTitle.match(/교재비?\s*([\d,]+)원/);
  if (gyojaeMatch) gyojaeBi = Number(gyojaeMatch[1].replace(/,/g, ''));

  return { sessionCount, sessionFee, gyojaeBi };
}

function detectMonth(ws: ExcelJS.Worksheet): number {
  const row5 = ws.getRow(5);
  for (let col = 9; col <= ws.columnCount; col += 1) {
    const val = cellString(row5.getCell(col).value).trim();
    const monthMatch = val.match(/(\d{1,2})월/);
    if (monthMatch) return Number(monthMatch[1]);
  }
  return new Date().getMonth() + 1;
}

function detectYear(ws: ExcelJS.Worksheet): number {
  const row3 = cellString(ws.getCell('A3').value).trim();
  const yearMatch = row3.match(/(\d{4})/);
  if (yearMatch) return Number(yearMatch[1]);

  const row4 = cellString(ws.getCell('A4').value).trim();
  const yearMatch2 = row4.match(/(\d{4})/);
  if (yearMatch2) return Number(yearMatch2[1]);

  return new Date().getFullYear();
}

export async function parseStudentsFromExcel(file: File): Promise<ExcelParseResult> {
  const emptyResult: ExcelParseResult = { students: [], sessionDates: [], courseMeta: { sessionCount: null, sessionFee: null, gyojaeBi: null } };

  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  if (!ws) return emptyResult;

  const year = detectYear(ws);
  const month = detectMonth(ws);

  const headerRow = ws.getRow(6);
  let nameColIdx = -1;
  let schoolGradeColIdx = -1;
  let schoolColIdx = -1;
  let gradeColIdx = -1;
  let phoneColIdx = -1;
  let paidUnpaidColIdx = -1;
  let firstDateCol = -1;

  for (let col = 1; col <= ws.columnCount; col += 1) {
    const val = cellString(headerRow.getCell(col).value).trim();
    if (!val) continue;

    if (val === '이름' || val === '성명' || val === '수강생명' || val === '학생명' || val === '학생이름') {
      nameColIdx = col;
    }
    if (val === '학교/학년' || val === '학교 / 학년') {
      schoolGradeColIdx = col;
    }
    if (val === '학교' || val === '학교명') {
      schoolColIdx = col;
    }
    if (val === '학년') {
      gradeColIdx = col;
    }
    if (/부모연락처|연락처|학부모\s*연락처|전화번호|휴대폰|보호자연락처/.test(val)) {
      phoneColIdx = col;
    }
    if (/납입액|미납액|납입/.test(val)) {
      paidUnpaidColIdx = col;
    }
  }

  const sessionDates: string[] = [];
  for (let col = 9; col <= ws.columnCount; col += 1) {
    const label = cellString(headerRow.getCell(col).value).trim();
    if (!label) continue;

    const dayNum = label.match(/(\d{1,2})/);
    if (dayNum) {
      const d = dayNum[1].padStart(2, '0');
      const m = String(month).padStart(2, '0');
      const dateStr = `${year}-${m}-${d}`;

      if (firstDateCol < 0) firstDateCol = col;
      sessionDates.push(dateStr);
    }
  }

  if (nameColIdx < 0) nameColIdx = 3;

  const students: ParsedStudent[] = [];

  for (let rowIdx = 8; rowIdx <= ws.rowCount; rowIdx += 1) {
    const row = ws.getRow(rowIdx);
    const nameVal = cellString(row.getCell(nameColIdx).value).trim().replace(/%$/g, '');
    if (!nameVal) continue;

    let schoolVal = '';
    let gradeVal = '';

    if (schoolGradeColIdx > 0) {
      const combined = cellString(row.getCell(schoolGradeColIdx).value).trim();
      const split = splitSchoolGrade(combined);
      schoolVal = split.school;
      gradeVal = split.grade;
    } else {
      if (schoolColIdx > 0) schoolVal = cellString(row.getCell(schoolColIdx).value).trim();
      if (gradeColIdx > 0) gradeVal = cellString(row.getCell(gradeColIdx).value).trim();
    }

    let phoneVal = '';
    if (phoneColIdx > 0) {
      const rawPhone = cellString(row.getCell(phoneColIdx).value).trim();
      const firstPhone = rawPhone.split(',')[0].trim();
      phoneVal = extractLast4Digits(firstPhone);
    }

    let previousUnpaid = 0;
    if (paidUnpaidColIdx > 0) {
      const rawVal = cellString(row.getCell(paidUnpaidColIdx).value).trim();
      const slashIdx = rawVal.indexOf('/');
      if (slashIdx >= 0) {
        previousUnpaid = parseNumber(rawVal.slice(slashIdx + 1));
      }
    }

    students.push({
      name: nameVal,
      school: schoolVal,
      grade: gradeVal,
      parentPhone: phoneVal,
      previousUnpaid,
    });
  }

  const headerRaw = cellString(ws.getCell('A1').value).trim();
  const courseMeta = extractCourseMeta(headerRaw);

  if (courseMeta.sessionCount === null && sessionDates.length > 0) {
    courseMeta.sessionCount = sessionDates.length;
  }

  if (courseMeta.sessionFee === null && paidUnpaidColIdx > 0 && sessionDates.length > 0) {
    for (let rowIdx = 8; rowIdx <= ws.rowCount; rowIdx += 1) {
      const row = ws.getRow(rowIdx);
      const nameVal = cellString(row.getCell(nameColIdx).value).trim();
      if (!nameVal) continue;

      const rawVal = cellString(row.getCell(paidUnpaidColIdx).value).trim();
      const slashIdx = rawVal.indexOf('/');
      const paidAmount = slashIdx >= 0 ? parseNumber(rawVal.slice(0, slashIdx)) : parseNumber(rawVal);
      const unpaidAmount = slashIdx >= 0 ? parseNumber(rawVal.slice(slashIdx + 1)) : 0;

      if (paidAmount > 0 && unpaidAmount === 0) {
        let attendCount = 0;
        for (let col = firstDateCol; col < firstDateCol + sessionDates.length; col += 1) {
          const marker = cellString(row.getCell(col).value).trim();
          if (marker === '출' || marker === '지') attendCount += 1;
        }
        if (attendCount > 0) {
          courseMeta.sessionFee = Math.round(paidAmount / attendCount);
          break;
        }
      }
    }
  }

  return { students, sessionDates, courseMeta };
}
