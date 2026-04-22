import type { SettlementItemKind } from "@/features/jeongsan-builder/types";

export function TypeBadge({ kind }: { kind: SettlementItemKind }) {
  if (kind === "revenue") {
    return (
      <span
        className="inline-flex h-[22px] min-w-8 items-center justify-center rounded px-1.5 text-[11px] font-bold tracking-[0.4px]"
        style={{
          background: "var(--aca-revenue-bg)",
          color: "var(--aca-revenue-fg)",
        }}
      >
        R
      </span>
    );
  }
  if (kind === "pay") {
    return (
      <span
        className="inline-flex size-[22px] items-center justify-center rounded text-sm font-bold"
        style={{
          background: "var(--aca-blue-100)",
          color: "var(--aca-blue-primary)",
        }}
      >
        +
      </span>
    );
  }
  return (
    <span
      className="inline-flex size-[22px] items-center justify-center rounded text-sm font-bold"
      style={{
        background: "var(--aca-red-10)",
        color: "var(--aca-red-primary)",
      }}
    >
      −
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
