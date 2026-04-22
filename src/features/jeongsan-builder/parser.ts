/**
 * 정산 빌더 전용 페이 문서 파서.
 *
 * 복사 출처: src/app/jeongsan-builder-schema/pay-document-parser.ts (2026-04-22 기준).
 * schema 페이지의 원본 parser는 스펙 데모용이고, 이 파일은 `/jeongsan-builder` 페이지에서
 * 사용하는 독립 parser다. 두 파일은 각자 관리되며, 원본에 버그 수정이 반영되더라도
 * 이 파일은 수동 동기화 필요.
 *
 * 타입은 `@/app/jeongsan-builder-schema/schema`를 그대로 참조한다 (단일 소스).
 */

import * as XLSX from "xlsx";
import type {
  FieldTrace,
  PayDocumentBlock,
  PayDocumentBlockKind,
  PayDocumentBlockTotals,
  PayDocumentParseResult,
  PayDocumentRow,
  PayDocumentSheetKind,
} from "@/app/jeongsan-builder-schema/schema";

export type {
  FieldTrace,
  PayDocumentBlock,
  PayDocumentBlockKind,
  PayDocumentBlockTotals,
  PayDocumentParseResult,
  PayDocumentRow,
  PayDocumentSheetKind,
} from "@/app/jeongsan-builder-schema/schema";

type SheetMatrix = unknown[][];

const ALLOWED_EXTENSIONS = [".xlsx", ".xls"] as const;

function text(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(text(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function cellAddress(rowIndex: number, columnIndex: number) {
  return XLSX.utils.encode_cell({ r: rowIndex - 1, c: columnIndex - 1 });
}

function traced<T>(
  value: T,
  sheetName: string,
  rowIndex: number,
  columnIndex: number,
  sourceLabel?: string,
): FieldTrace<T> {
  return {
    value,
    source: "excel",
    sourceLabel,
    cell: {
      sheetName,
      rowIndex,
      columnIndex,
      address: cellAddress(rowIndex, columnIndex),
    },
  };
}

/**
 * 엑셀 헤더의 분반 표기 규약:
 *   - `|`로 분리된 파트 중 `분반: {분반명}` 형식이 반드시 들어간다.
 *   - `분반: A반`, `분반 : 심화반`, `분반:수학A` 등 콜론/공백 변형을 허용.
 * 이 함수는 해당 파트에서 분반명만 추출한다. 매칭 실패 시 null.
 */
const BOONBAN_PART_PATTERN = /^분반\s*:\s*(.+)$/;

function extractBoonbanName(part: string): string | null {
  const match = part.match(BOONBAN_PART_PATTERN);
  return match ? match[1].trim() || null : null;
}

function parseTitle(titleText: string) {
  const parts = titleText
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  const sueopName = parts[0]?.replace(/\s+보충$/g, "").trim() || titleText;

  // 분반: "분반: {분반명}" 파트를 우선 탐지. 없으면 bochungbi 시트 fallback("보충").
  let boonbanName: string | null = null;
  for (const part of parts) {
    const extracted = extractBoonbanName(part);
    if (extracted) {
      boonbanName = extracted;
      break;
    }
  }
  if (!boonbanName && titleText.includes("보충")) {
    boonbanName = "보충";
  }

  const scheduleText = titleText.match(/\((\d{1,2}\/[^)]*)\)/)?.[1] ?? null;
  const statusText = titleText.match(/\((종강|진행중|폐강)\)/)?.[1] ?? null;
  const unitPriceText = titleText.match(/회당\s*[\d,]+원/)?.[0] ?? null;

  return { sueopName, boonbanName, scheduleText, statusText, unitPriceText };
}

function parseUsageCount(label: string) {
  if (!label) {
    return null;
  }
  const numbers = label.match(/\d+(?:\.\d+)?/g);
  if (!numbers) {
    return null;
  }
  return numbers.reduce((sum, value) => sum + Number(value), 0);
}

function emptyTotals(): PayDocumentBlockTotals {
  return {
    quantityTotal: 0,
    harinTotal: 0,
    nabipTotal: 0,
    minapTotal: 0,
    hoesuTotal: 0,
    payTotal: 0,
  };
}

function addTotals(
  left: PayDocumentBlockTotals,
  right: PayDocumentBlockTotals,
): PayDocumentBlockTotals {
  return {
    quantityTotal: left.quantityTotal + right.quantityTotal,
    harinTotal: left.harinTotal + right.harinTotal,
    nabipTotal: left.nabipTotal + right.nabipTotal,
    minapTotal: left.minapTotal + right.minapTotal,
    hoesuTotal: left.hoesuTotal + right.hoesuTotal,
    payTotal: left.payTotal + right.payTotal,
  };
}

function summarizeRows(rows: PayDocumentRow[]): PayDocumentBlockTotals {
  return rows.reduce((totals, row) => {
    if (row.rowKind === "minap_hoesu_student") {
      return {
        ...totals,
        minapTotal: totals.minapTotal + row.minapAmount.value,
        hoesuTotal: totals.hoesuTotal + row.hoesuAmount.value,
        payTotal: totals.payTotal + row.payAmount.value,
      };
    }

    const quantityValue =
      row.rowKind === "sueop_student" ? row.silgangCountValue : row.konCountValue;

    return {
      ...totals,
      quantityTotal: totals.quantityTotal + (quantityValue ?? 0),
      harinTotal: totals.harinTotal + row.harinAmount.value,
      nabipTotal: totals.nabipTotal + row.nabipAmount.value,
      minapTotal: totals.minapTotal + row.minapAmount.value,
      payTotal: totals.payTotal + row.payAmount.value,
    };
  }, emptyTotals());
}

function findJojikName(matrix: SheetMatrix, headerRowIndex: number) {
  for (let rowIndex = headerRowIndex - 3; rowIndex >= 1; rowIndex -= 1) {
    const value = text(matrix[rowIndex - 1]?.[0]);
    const nextFirstCell = text(matrix[rowIndex]?.[0]);
    if (value && nextFirstCell === "강사") {
      return { value, rowIndex, columnIndex: 1 };
    }
  }
  return { value: "", rowIndex: Math.max(1, headerRowIndex - 2), columnIndex: 1 };
}

function isTeacherNameCandidate(value: string, jojikName: string) {
  return Boolean(
    value &&
      value !== "강사" &&
      value !== jojikName &&
      !value.includes("TOTAL") &&
      !value.includes("소계"),
  );
}

function findTeacherName(
  sheetName: string,
  matrix: SheetMatrix,
  teacherRowIndex: number,
  studentColumnIndex: number,
  jojikName: string,
) {
  const exactValue = text(matrix[teacherRowIndex - 1]?.[studentColumnIndex - 1]);
  if (isTeacherNameCandidate(exactValue, jojikName)) {
    return traced(exactValue, sheetName, teacherRowIndex, studentColumnIndex, "강사 행");
  }

  for (let columnIndex = studentColumnIndex - 1; columnIndex >= 2; columnIndex -= 1) {
    const leftValue = text(matrix[teacherRowIndex - 1]?.[columnIndex - 1]);
    if (isTeacherNameCandidate(leftValue, jojikName)) {
      return traced(
        leftValue,
        sheetName,
        teacherRowIndex,
        columnIndex,
        "강사 행 좌측 값으로 보정",
      );
    }
  }

  for (
    let columnIndex = studentColumnIndex + 1;
    columnIndex <= (matrix[teacherRowIndex - 1]?.length ?? 0);
    columnIndex += 1
  ) {
    const rightValue = text(matrix[teacherRowIndex - 1]?.[columnIndex - 1]);
    if (isTeacherNameCandidate(rightValue, jojikName)) {
      return traced(
        rightValue,
        sheetName,
        teacherRowIndex,
        columnIndex,
        "강사 행 우측 값으로 보정",
      );
    }
  }

  return traced(exactValue, sheetName, teacherRowIndex, studentColumnIndex, "강사 행 원본");
}

function parseRegularRows(
  sheetName: string,
  sheetKind: PayDocumentSheetKind,
  matrix: SheetMatrix,
  headerRowIndex: number,
  studentColumnIndex: number,
) {
  const rows: PayDocumentRow[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex <= matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex - 1] ?? [];
    const studentText = text(row[studentColumnIndex - 1]);

    if (studentText.includes("TOTAL") || studentText === "강사" || studentText === "학생명") {
      break;
    }

    if (!studentText) {
      continue;
    }

    const quantityLabel = text(row[studentColumnIndex]);
    const harinAmount = numberValue(row[studentColumnIndex + 1]);
    const nabipAmount = numberValue(row[studentColumnIndex + 2]);
    const minapAmount = numberValue(row[studentColumnIndex + 3]);
    const gyeoljeSudan = text(row[studentColumnIndex + 4]);
    const payAmount = numberValue(row[studentColumnIndex + 5]);
    const base = {
      id: `${sheetName}-${headerRowIndex}-${studentColumnIndex}-${rowIndex}`,
      rowNumber: rowIndex,
      sugangsaengName: traced(studentText, sheetName, rowIndex, studentColumnIndex),
      harinAmount: traced(harinAmount, sheetName, rowIndex, studentColumnIndex + 2),
      nabipAmount: traced(nabipAmount, sheetName, rowIndex, studentColumnIndex + 3),
      minapAmount: traced(minapAmount, sheetName, rowIndex, studentColumnIndex + 4),
      gyeoljeSudan: traced(gyeoljeSudan, sheetName, rowIndex, studentColumnIndex + 5),
      payAmount: traced(payAmount, sheetName, rowIndex, studentColumnIndex + 6),
    };

    if (sheetKind === "bochungbi") {
      rows.push({
        ...base,
        rowKind: "bochungbi_student",
        konCountLabel: traced(quantityLabel, sheetName, rowIndex, studentColumnIndex + 1),
        konCountValue: parseUsageCount(quantityLabel),
      });
      continue;
    }

    rows.push({
      ...base,
      rowKind: "sueop_student",
      silgangCountLabel: traced(quantityLabel, sheetName, rowIndex, studentColumnIndex + 1),
      silgangCountValue: parseUsageCount(quantityLabel),
    });
  }

  return rows;
}

function parseArrearsRows(
  sheetName: string,
  matrix: SheetMatrix,
  headerRowIndex: number,
  studentColumnIndex: number,
) {
  const rows: PayDocumentRow[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex <= matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex - 1] ?? [];
    const studentText = text(row[studentColumnIndex - 1]);

    if (studentText.includes("TOTAL") || studentText === "강사" || studentText === "수강생") {
      break;
    }

    if (!studentText) {
      continue;
    }

    const linkedCourseName = text(row[studentColumnIndex]);
    const recoveredAmount = numberValue(row[studentColumnIndex + 1]);
    const remainingUnpaidAmount = numberValue(row[studentColumnIndex + 2]);
    const payAmount = numberValue(row[studentColumnIndex + 3]);

    rows.push({
      id: `${sheetName}-minap-hoesu-${headerRowIndex}-${studentColumnIndex}-${rowIndex}`,
      rowKind: "minap_hoesu_student",
      rowNumber: rowIndex,
      sugangsaengName: traced(studentText, sheetName, rowIndex, studentColumnIndex),
      linkedSueopName: traced(
        linkedCourseName,
        sheetName,
        rowIndex,
        studentColumnIndex + 1,
        "연결 수업",
      ),
      hoesuAmount: traced(
        recoveredAmount,
        sheetName,
        rowIndex,
        studentColumnIndex + 2,
        "회수금액",
      ),
      minapAmount: traced(
        remainingUnpaidAmount,
        sheetName,
        rowIndex,
        studentColumnIndex + 3,
        "미납금액",
      ),
      payAmount: traced(payAmount, sheetName, rowIndex, studentColumnIndex + 4, "PAY"),
      note: linkedCourseName ? `연결 수업: ${linkedCourseName}` : undefined,
    });
  }

  return rows;
}

function parseRegularBlock(
  sheetName: string,
  sheetKind: PayDocumentSheetKind,
  matrix: SheetMatrix,
  headerRowIndex: number,
  studentColumnIndex: number,
) {
  const titleText = text(matrix[headerRowIndex - 2]?.[studentColumnIndex - 1]);
  if (!titleText || titleText.includes("TOTAL")) {
    return null;
  }

  const jojik = findJojikName(matrix, headerRowIndex);
  const teacherName = findTeacherName(
    sheetName,
    matrix,
    headerRowIndex - 2,
    studentColumnIndex,
    jojik.value,
  );
  const rows = parseRegularRows(sheetName, sheetKind, matrix, headerRowIndex, studentColumnIndex);
  if (rows.length === 0) {
    return null;
  }

  const kind: PayDocumentBlockKind = sheetKind === "bochungbi" ? "bochungbi" : "sueop";

  return {
    id: `${sheetName}-${headerRowIndex}-${studentColumnIndex}`,
    kind,
    sheetName,
    sheetKind,
    jojikName: traced(jojik.value, sheetName, jojik.rowIndex, jojik.columnIndex, "조직/관"),
    teacherName,
    monthLabel: text(matrix[headerRowIndex - 2]?.[studentColumnIndex - 2]) || "",
    titleText: traced(titleText, sheetName, headerRowIndex - 1, studentColumnIndex),
    ...parseTitle(titleText),
    rows,
    totals: summarizeRows(rows),
  } satisfies PayDocumentBlock;
}

function parseArrearsBlock(
  sheetName: string,
  matrix: SheetMatrix,
  headerRowIndex: number,
  studentColumnIndex: number,
) {
  const titleText =
    text(matrix[headerRowIndex - 2]?.[studentColumnIndex - 1]) || "미납회수금";
  const jojik = findJojikName(matrix, headerRowIndex);
  const teacherName = findTeacherName(
    sheetName,
    matrix,
    headerRowIndex - 2,
    studentColumnIndex,
    jojik.value,
  );
  const rows = parseArrearsRows(sheetName, matrix, headerRowIndex, studentColumnIndex);
  if (rows.length === 0) {
    return null;
  }

  return {
    id: `${sheetName}-minap-hoesu-${headerRowIndex}-${studentColumnIndex}`,
    kind: "minap_hoesu",
    sheetName,
    sheetKind: "sueop_minap",
    jojikName: traced(jojik.value, sheetName, jojik.rowIndex, jojik.columnIndex, "조직/관"),
    teacherName,
    monthLabel: text(matrix[headerRowIndex - 2]?.[studentColumnIndex - 2]) || "",
    titleText: traced(titleText, sheetName, headerRowIndex - 1, studentColumnIndex),
    sueopName: titleText,
    boonbanName: null,
    scheduleText: null,
    statusText: null,
    unitPriceText: null,
    rows,
    totals: summarizeRows(rows),
  } satisfies PayDocumentBlock;
}

function parseSheet(sheetName: string, matrix: SheetMatrix) {
  const sheetKind: PayDocumentSheetKind = sheetName.includes("보충")
    ? "bochungbi"
    : "sueop_minap";
  const blocks: PayDocumentBlock[] = [];

  for (let rowIndex = 1; rowIndex <= matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex - 1] ?? [];
    for (let columnIndex = 1; columnIndex <= row.length; columnIndex += 1) {
      const header = text(row[columnIndex - 1]);
      if (header === "학생명") {
        const block = parseRegularBlock(
          sheetName,
          sheetKind,
          matrix,
          rowIndex,
          columnIndex,
        );
        if (block) {
          blocks.push(block);
        }
      }

      if (header === "수강생") {
        const block = parseArrearsBlock(sheetName, matrix, rowIndex, columnIndex);
        if (block) {
          blocks.push(block);
        }
      }
    }
  }

  return {
    name: sheetName,
    kind: sheetKind,
    blocks,
    totals: blocks.reduce((totals, block) => addTotals(totals, block.totals), emptyTotals()),
  };
}

function parseYearMonth(fileName: string) {
  const matched = fileName.match(/(20\d{2})[-_.년\s]*(\d{1,2})/);
  return {
    year: matched ? Number(matched[1]) : new Date().getFullYear(),
    month: matched ? Number(matched[2]) : new Date().getMonth() + 1,
  };
}

function sueopTeacherKey(jojikName: string, sueopName: string) {
  return `${jojikName.trim()}::${sueopName.trim()}`;
}

function resolveTeacherNames(result: PayDocumentParseResult): PayDocumentParseResult {
  const teacherByCourse = new Map<string, FieldTrace<string>>();

  for (const sheet of result.sheets) {
    for (const block of sheet.blocks) {
      if (
        block.kind === "sueop" &&
        isTeacherNameCandidate(block.teacherName.value, block.jojikName.value)
      ) {
        teacherByCourse.set(
          sueopTeacherKey(block.jojikName.value, block.sueopName),
          block.teacherName,
        );
      }
    }
  }

  return {
    ...result,
    sheets: result.sheets.map((sheet) => ({
      ...sheet,
      blocks: sheet.blocks.map((block) => {
        if (isTeacherNameCandidate(block.teacherName.value, block.jojikName.value)) {
          return block;
        }

        const matchedTeacher = teacherByCourse.get(
          sueopTeacherKey(block.jojikName.value, block.sueopName),
        );
        if (!matchedTeacher) {
          return block;
        }

        return {
          ...block,
          teacherName: {
            value: matchedTeacher.value,
            source: "computed",
            sourceLabel: "문서 그룹/강좌명으로 수업 시트 강사명 매칭",
            cell: matchedTeacher.cell,
          },
        };
      }),
    })),
  };
}

function hasAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * 이미 ArrayBuffer/Uint8Array/Buffer를 들고 있는 호출부용 저수준 API.
 * UI 컴포넌트는 {@link parsePayDocument}를 우선 사용한다.
 */
export function parsePayDocumentBuffer(
  sourceFileName: string,
  workbookInput: ArrayBuffer | Uint8Array,
): PayDocumentParseResult {
  if (!hasAllowedExtension(sourceFileName)) {
    throw new Error("페이 문서는 .xlsx 또는 .xls 형식이어야 합니다.");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(workbookInput, { type: "array", cellDates: true });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "알 수 없는 오류";
    throw new Error(`페이 문서를 읽을 수 없습니다: ${message}`);
  }

  const { year, month } = parseYearMonth(sourceFileName);

  return resolveTeacherNames({
    sourceFileName,
    year,
    month,
    sheets: workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        raw: true,
        defval: "",
      });
      return parseSheet(sheetName, matrix);
    }),
  });
}

/**
 * 브라우저의 File 객체를 그대로 받아 파싱 결과를 반환한다.
 * - 확장자 검증 (.xlsx / .xls 이외 거부)
 * - arrayBuffer 변환 포함
 * - XLSX.read 실패 시 사용자 친화 메시지로 감싸 throw
 */
export async function parsePayDocument(file: File): Promise<PayDocumentParseResult> {
  if (!hasAllowedExtension(file.name)) {
    throw new Error("페이 문서는 .xlsx 또는 .xls 형식이어야 합니다.");
  }

  const buffer = await file.arrayBuffer();
  return parsePayDocumentBuffer(file.name, buffer);
}
