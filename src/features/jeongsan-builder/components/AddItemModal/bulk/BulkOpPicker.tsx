import type { OpId } from "@/features/jeongsan-builder/calculator";
import { OP_OPTIONS } from "@/features/jeongsan-builder/components/AddItemModal/formOptions";

/**
 * bulk 모드에서 모든 행에 공통 적용되는 연산 + 보조값 선택 UI.
 */
export function BulkOpPicker({
  op,
  auxValue,
  onChange,
}: {
  op: OpId;
  auxValue: string;
  onChange: (patch: { op?: OpId; auxValue?: string }) => void;
}) {
  const current = OP_OPTIONS.find((o) => o.id === op);
  return (
    <div className="flex flex-col gap-2">
      <div
        className="text-[12px] font-semibold"
        style={{ color: "var(--aca-gray-600)" }}
      >
        수식 (모든 항목 공통 적용)
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OP_OPTIONS.map((opt) => {
          const selected = op === opt.id;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ op: opt.id })}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[12px] font-semibold"
              style={{
                background: selected ? "var(--aca-black)" : "var(--aca-white)",
                color: selected ? "var(--aca-white)" : "var(--aca-gray-700)",
                border: `1px solid ${selected ? "var(--aca-black)" : "var(--aca-gray-200)"}`,
              }}
              title={opt.hint}
            >
              <Icon className="size-3.5" aria-hidden />
              {opt.label}
            </button>
          );
        })}
      </div>
      {current?.needsAux && (
        <div className="flex flex-col gap-1">
          <label
            className="text-[11px] font-medium"
            style={{ color: "var(--aca-gray-500)" }}
          >
            {current.auxLabel}
          </label>
          <div
            className="flex h-8 items-center rounded-[4px] px-2.5"
            style={{
              background: "var(--aca-white)",
              border: "1px solid var(--aca-gray-200)",
            }}
          >
            <input
              value={auxValue}
              onChange={(e) => onChange({ auxValue: e.target.value })}
              placeholder={current.auxPlaceholder}
              inputMode="decimal"
              className="w-full border-none bg-transparent text-[13px] outline-none"
              style={{ fontFamily: "inherit", color: "var(--aca-black)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
