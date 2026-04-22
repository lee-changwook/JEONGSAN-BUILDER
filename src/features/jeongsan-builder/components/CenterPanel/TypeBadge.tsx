import type { CategoryId } from "@/features/jeongsan-builder/calculator";

export function TypeBadge({ cat }: { cat: CategoryId }) {
  if (cat === "revenue") {
    return (
      <span
        className="inline-flex h-[22px] min-w-[42px] items-center justify-center rounded px-1.5 text-[11px] font-bold tracking-[0.4px]"
        style={{
          background: "var(--aca-revenue-bg)",
          color: "var(--aca-revenue-fg)",
        }}
      >
        수업
      </span>
    );
  }
  if (cat === "plus") {
    return (
      <span
        className="inline-flex h-[22px] min-w-[42px] items-center justify-center rounded px-1.5 text-[11px] font-bold tracking-[0.4px]"
        style={{
          background: "var(--aca-blue-100)",
          color: "var(--aca-blue-primary)",
        }}
      >
        +지급
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-[22px] min-w-[42px] items-center justify-center rounded px-1.5 text-[11px] font-bold tracking-[0.4px]"
      style={{
        background: "var(--aca-red-10)",
        color: "var(--aca-red-primary)",
      }}
    >
      −차감
    </span>
  );
}

export function RoundTag({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded px-[7px] py-0.5 text-[10.5px] font-bold tracking-[0.3px]"
      style={{
        background: "var(--aca-gray-700)",
        color: "var(--aca-white)",
      }}
    >
      {label}
    </span>
  );
}
