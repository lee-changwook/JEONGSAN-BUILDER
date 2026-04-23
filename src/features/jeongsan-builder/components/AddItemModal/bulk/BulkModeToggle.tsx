import type { ModalMode } from "@/features/jeongsan-builder/components/AddItemModal/bulk/bulkState";

export function BulkModeToggle({
  mode,
  onChange,
}: {
  mode: ModalMode;
  onChange: (next: ModalMode) => void;
}) {
  const options: Array<{ id: ModalMode; label: string }> = [
    { id: "single", label: "단일 추가" },
    { id: "form", label: "일괄 (폼 입력)" },
    { id: "paste", label: "일괄 (붙여넣기)" },
  ];
  return (
    <div
      className="inline-flex shrink-0 items-center gap-0.5 rounded-[6px] p-0.5"
      style={{
        background: "var(--aca-gray-10)",
        border: "1px solid var(--aca-gray-100)",
      }}
    >
      {options.map((opt) => {
        const selected = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="cursor-pointer rounded-[4px] px-3 py-1.5 text-[12px] font-semibold transition-colors"
            style={{
              background: selected ? "var(--aca-white)" : "transparent",
              color: selected ? "var(--aca-black)" : "var(--aca-gray-500)",
              boxShadow: selected ? "var(--aca-shadow-card)" : undefined,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
