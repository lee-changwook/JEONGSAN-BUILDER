import type { CategoryId } from "@/features/jeongsan-builder/calculator";
import {
  generateFormRowId,
  type BulkFormRow,
  type BulkState,
} from "@/features/jeongsan-builder/components/AddItemModal/bulk/bulkState";

/**
 * 일괄 추가의 폼 입력 모드. 행 단위로 이름+금액을 직접 입력한다.
 * 마지막 빈 행에 입력이 시작되면 자동으로 새 빈 행을 추가.
 */
export function BulkFormInput({
  cat,
  state,
  onChange,
}: {
  cat: Exclude<CategoryId, "revenue">;
  state: BulkState;
  onChange: (patch: Partial<BulkState>) => void;
}) {
  function updateRow(id: string, patch: Partial<BulkFormRow>) {
    const next = state.formRows.map((r) =>
      r.id === id ? { ...r, ...patch } : r,
    );
    // 마지막 행에 이름 또는 금액이 입력되면 빈 행을 추가해 자동 확장.
    const last = next[next.length - 1];
    if (last && (last.name.trim() || last.amount.trim())) {
      next.push({ id: generateFormRowId(), name: "", amount: "" });
    }
    onChange({ formRows: next });
  }

  function removeRow(id: string) {
    const filtered = state.formRows.filter((r) => r.id !== id);
    if (filtered.length === 0) {
      filtered.push({ id: generateFormRowId(), name: "", amount: "" });
    }
    onChange({ formRows: filtered });
  }

  function addEmptyRow() {
    onChange({
      formRows: [
        ...state.formRows,
        { id: generateFormRowId(), name: "", amount: "" },
      ],
    });
  }

  const validCount = state.formRows.filter((r) => {
    const trimmed = r.name.trim();
    const parsed = Number(r.amount.replace(/[,\s원₩]/g, ""));
    return trimmed.length > 0 && Number.isFinite(parsed) && parsed !== 0;
  }).length;

  return (
    <div className="flex flex-col gap-2">
      <div>
        <div
          className="text-[12px] font-semibold"
          style={{ color: "var(--aca-gray-600)" }}
        >
          행 단위 입력
        </div>
        <div
          className="mt-0.5 text-[11px]"
          style={{ color: "var(--aca-gray-500)" }}
        >
          항목명과 금액을 직접 입력. 마지막 행에 입력 시 자동으로 행이 추가됩니다.
        </div>
      </div>

      <div
        className="overflow-hidden rounded-[4px]"
        style={{ border: "1px solid var(--aca-gray-200)" }}
      >
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr
              style={{
                background: "var(--aca-gray-10)",
                color: "var(--aca-gray-500)",
              }}
            >
              <th className="w-8 px-2 py-1.5 text-left font-semibold">#</th>
              <th className="px-2 py-1.5 text-left font-semibold">항목명</th>
              <th className="w-[140px] px-2 py-1.5 text-right font-semibold">
                금액
              </th>
              <th className="w-8 px-1 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {state.formRows.map((r, i) => {
              const parsed = Number(r.amount.replace(/[,\s원₩]/g, ""));
              const amountValid =
                r.amount.trim().length > 0 &&
                Number.isFinite(parsed) &&
                parsed !== 0;
              return (
                <tr
                  key={r.id}
                  style={{ borderTop: "1px solid var(--aca-gray-100)" }}
                >
                  <td
                    className="px-2 py-1.5"
                    style={{ color: "var(--aca-gray-400)" }}
                  >
                    {i + 1}
                  </td>
                  <td className="px-1 py-1">
                    <input
                      value={r.name}
                      onChange={(e) =>
                        updateRow(r.id, { name: e.target.value })
                      }
                      placeholder={cat === "plus" ? "예: 기본급" : "예: 교재비"}
                      className="w-full border-none bg-transparent px-1.5 py-1 text-[13px] outline-none"
                      style={{
                        fontFamily: "inherit",
                        color: "var(--aca-black)",
                      }}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      value={r.amount}
                      onChange={(e) =>
                        updateRow(r.id, { amount: e.target.value })
                      }
                      placeholder="0"
                      inputMode="numeric"
                      className="jb2-tnum w-full border-none bg-transparent px-1.5 py-1 text-right text-[13px] outline-none"
                      style={{
                        fontFamily: "inherit",
                        color: amountValid
                          ? cat === "minus"
                            ? "var(--aca-red-primary)"
                            : "var(--aca-black)"
                          : "var(--aca-gray-400)",
                      }}
                    />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(r.id)}
                      className="cursor-pointer rounded p-0.5 text-[14px] leading-none"
                      style={{ color: "var(--aca-gray-400)" }}
                      aria-label="행 삭제"
                      title="행 삭제"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addEmptyRow}
          className="cursor-pointer rounded-[4px] px-2.5 py-1 text-[11px] font-semibold"
          style={{
            background: "var(--aca-white)",
            color: "var(--aca-gray-600)",
            border: "1px solid var(--aca-gray-200)",
          }}
        >
          + 행 추가
        </button>
        <span className="text-[11px]" style={{ color: "var(--aca-gray-500)" }}>
          유효 항목 <strong>{validCount}</strong>개
        </span>
      </div>
    </div>
  );
}
