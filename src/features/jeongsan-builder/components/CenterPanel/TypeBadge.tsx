import type { CategoryId } from "@/features/jeongsan-builder/calculator";

export function TypeBadge({
  cat,
  bochungbiOnly,
}: {
  cat: CategoryId;
  /** revenue 룰이 보충비 수업에만 연결돼 있으면 "보충비" 라벨로 렌더. */
  bochungbiOnly?: boolean;
}) {
  if (cat === "revenue") {
    if (bochungbiOnly) {
      return (
        <span className="inline-flex h-[22px] min-w-[42px] items-center justify-center rounded bg-[var(--aca-green-light)] px-1.5 text-[11px] font-bold tracking-[0.4px] text-[var(--aca-green)]">
          보충비
        </span>
      );
    }
    return (
      <span className="inline-flex h-[22px] min-w-[42px] items-center justify-center rounded bg-[var(--aca-revenue-bg)] px-1.5 text-[11px] font-bold tracking-[0.4px] text-[var(--aca-revenue-fg)]">
        수업
      </span>
    );
  }
  if (cat === "plus") {
    return (
      <span className="inline-flex h-[22px] min-w-[42px] items-center justify-center rounded bg-[var(--aca-blue-100)] px-1.5 text-[11px] font-bold tracking-[0.4px] text-[var(--aca-blue-primary)]">
        +지급
      </span>
    );
  }
  return (
    <span className="inline-flex h-[22px] min-w-[42px] items-center justify-center rounded bg-[var(--aca-red-10)] px-1.5 text-[11px] font-bold tracking-[0.4px] text-[var(--aca-red-primary)]">
      −차감
    </span>
  );
}

export function RoundTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center rounded bg-[var(--aca-gray-700)] px-[7px] py-0.5 text-[10.5px] font-bold tracking-[0.3px] text-[var(--aca-white)]">
      {label}
    </span>
  );
}
