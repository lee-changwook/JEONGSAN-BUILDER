import type { CategoryId, OpId } from "@/features/jeongsan-builder/calculator";

/**
 * 스프레드시트(엑셀/구글시트)에서 복사한 TSV(탭 구분) 또는 CSV 텍스트를 파싱한 결과.
 *   - 한 줄 = 한 항목
 *   - 첫 번째 컬럼: 항목명 (필수)
 *   - 두 번째 컬럼: 금액 (콤마/원 접미 허용, 필수)
 * 과세 여부는 컬럼으로 받지 않고, 상위 폼의 기본값을 모든 행에 일괄 적용.
 */
export interface BulkRow {
  name: string;
  amount: number;
  valid: boolean;
  raw: string;
}

/**
 * 문자열을 BulkRow 리스트로 파싱한다. 분리자는 TAB → 쉼표 → 2칸 이상 공백 순.
 */
export function parseBulkText(raw: string): BulkRow[] {
  const lines = raw.split(/\r?\n/);
  return lines
    .map((line) => line.replace(/﻿/g, "")) // BOM 제거
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      let cols: string[];
      if (line.includes("\t")) cols = line.split("\t");
      else if (line.includes(",")) cols = line.split(",");
      else cols = line.split(/\s{2,}/);
      const name = (cols[0] ?? "").trim();
      const amountText = (cols[1] ?? "").trim();

      const normalizedAmount = amountText.replace(/[,\s원₩]/g, "");
      const amount = Number(normalizedAmount);
      const valid = name.length > 0 && Number.isFinite(amount) && amount !== 0;
      return {
        name,
        amount: Number.isFinite(amount) ? amount : 0,
        valid,
        raw: line,
      };
    });
}

export type BulkSubMode = "paste" | "form";

export interface BulkFormRow {
  id: string;
  name: string;
  amount: string;
}

export interface BulkState {
  /** 붙여넣기 탭의 원문 */
  raw: string;
  /** 폼 입력 탭의 편집 가능한 행 목록 */
  formRows: BulkFormRow[];
  /** 모든 bulk 행에 공통 적용할 연산 */
  op: OpId;
  /** op가 aux를 요구할 때의 보조값 (예: rate=0.1, multiply=45000, add=-10000) */
  auxValue: string;
  /** 모든 bulk 행의 과세 공제 여부 기본값 */
  defaultTaxable: boolean;
}

export type ModalMode = "single" | BulkSubMode;

export function generateFormRowId(): string {
  return `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createInitialBulk(cat: CategoryId): BulkState {
  return {
    raw: "",
    formRows: [
      { id: generateFormRowId(), name: "", amount: "" },
      { id: generateFormRowId(), name: "", amount: "" },
      { id: generateFormRowId(), name: "", amount: "" },
    ],
    op: "fixed",
    auxValue: "0",
    defaultTaxable: cat !== "minus",
  };
}

/**
 * bulk.formRows 중 유효 행(이름+숫자금액)만 추려서 name/amount로 정규화.
 */
export function collectFormRows(
  formRows: BulkFormRow[],
): Array<{ name: string; amount: number }> {
  return formRows
    .map((r) => {
      const name = r.name.trim();
      const amount = Number(r.amount.replace(/[,\s원₩]/g, ""));
      return { name, amount };
    })
    .filter(
      (r) => r.name.length > 0 && Number.isFinite(r.amount) && r.amount !== 0,
    );
}
