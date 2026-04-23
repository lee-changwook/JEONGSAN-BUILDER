import {
  formatKRW,
  type CategoryId,
} from "@/features/jeongsan-builder/calculator";
import { MiniCheckbox } from "@/features/jeongsan-builder/components/MiniControls";
import {
  parseBulkText,
  type BulkState,
} from "@/features/jeongsan-builder/components/AddItemModal/bulk/bulkState";

/**
 * 일괄 추가의 붙여넣기 모드. 스프레드시트에서 복사한 TSV/CSV 텍스트를
 * 붙여넣으면 한 줄씩 파싱해 미리보기 테이블로 검증한다.
 */
export function BulkPasteInput({
  cat,
  state,
  onChange,
}: {
  cat: Exclude<CategoryId, "revenue">;
  state: BulkState;
  onChange: (patch: Partial<BulkState>) => void;
}) {
  const rows = parseBulkText(state.raw);
  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div
          className="text-[12px] font-semibold"
          style={{ color: "var(--aca-gray-600)" }}
        >
          스프레드시트에서 붙여넣기
        </div>
        <div
          className="mt-0.5 text-[11px]"
          style={{ color: "var(--aca-gray-500)" }}
        >
          한 줄 = 한 항목. 컬럼: 항목명 · 금액. TAB 또는 쉼표 구분 허용.
        </div>
      </div>

      <textarea
        value={state.raw}
        onChange={(e) => onChange({ raw: e.target.value })}
        placeholder={
          cat === "plus"
            ? "기본급\t2000000\n초과근무수당\t350000\n부장수당\t150000"
            : "교재비\t45000\n조교비\t200000"
        }
        className="jb2-mono min-h-[140px] w-full resize-y rounded-[4px] p-2.5 text-[12px] leading-[1.5] outline-none"
        style={{
          background: "var(--aca-white)",
          border: "1px solid var(--aca-gray-200)",
          color: "var(--aca-black)",
          whiteSpace: "pre",
        }}
        spellCheck={false}
      />

      <label className="flex cursor-pointer items-center gap-2">
        <MiniCheckbox
          checked={state.defaultTaxable}
          onChange={(next) => onChange({ defaultTaxable: next })}
          color="#2BB673"
          ariaLabel="세금 공제 대상 기본값"
        />
        <span className="text-[12px]" style={{ color: "var(--aca-gray-700)" }}>
          모든 일괄 항목을 세금 공제 대상에 포함
        </span>
      </label>

      {rows.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div
            className="flex items-center justify-between text-[11px]"
            style={{ color: "var(--aca-gray-500)" }}
          >
            <span>
              파싱된 항목 <strong>{validCount}</strong>개
              {invalidCount > 0 && (
                <span style={{ color: "var(--aca-red-primary)" }}>
                  {" "}· 무시 {invalidCount}개
                </span>
              )}
            </span>
          </div>
          <div
            className="max-h-[180px] overflow-y-auto rounded-[4px]"
            style={{ border: "1px solid var(--aca-gray-100)" }}
          >
            <table className="jb2-tnum w-full border-collapse text-[12px]">
              <thead>
                <tr
                  style={{
                    background: "var(--aca-gray-10)",
                    color: "var(--aca-gray-500)",
                  }}
                >
                  <th className="w-8 px-2 py-1.5 text-left font-semibold">#</th>
                  <th className="px-2 py-1.5 text-left font-semibold">
                    항목명
                  </th>
                  <th className="w-[110px] px-2 py-1.5 text-right font-semibold">
                    금액
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${i}-${r.raw}`}
                    style={{
                      background: r.valid
                        ? "var(--aca-white)"
                        : "var(--aca-red-10)",
                      borderTop: "1px solid var(--aca-gray-100)",
                    }}
                  >
                    <td
                      className="px-2 py-1.5"
                      style={{ color: "var(--aca-gray-400)" }}
                    >
                      {i + 1}
                    </td>
                    <td
                      className="px-2 py-1.5 truncate"
                      style={{
                        color: r.valid
                          ? "var(--aca-black)"
                          : "var(--aca-red-primary)",
                        maxWidth: 260,
                      }}
                    >
                      {r.name || (
                        <span style={{ color: "var(--aca-gray-400)" }}>
                          (이름 없음)
                        </span>
                      )}
                    </td>
                    <td
                      className="jb2-tnum px-2 py-1.5 text-right font-semibold"
                      style={{
                        color:
                          cat === "minus"
                            ? "var(--aca-red-primary)"
                            : "var(--aca-black)",
                      }}
                    >
                      {r.valid ? formatKRW(r.amount) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
