"use client";

import { Minus, Plus, Sparkles, Trash2, Upload } from "lucide-react";

import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  variant: "primary" | "neutral" | "danger";
  onClick: () => void;
  disabled?: boolean;
}

function ActionButton({
  icon,
  label,
  variant,
  onClick,
  disabled,
}: ActionButtonProps) {
  const paletteClass =
    variant === "primary"
      ? "border-none bg-[var(--aca-black)] text-[var(--aca-white)]"
      : variant === "danger"
        ? "border border-[var(--aca-red-40)] bg-[var(--aca-white)] text-[var(--aca-red-primary)]"
        : "border border-[var(--aca-gray-200)] bg-[var(--aca-white)] text-[var(--aca-gray-700)]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[38px] cursor-pointer items-center gap-1.5 rounded-md px-3.5 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${paletteClass}`}
    >
      {icon}
      {label}
    </button>
  );
}

export function SettlementItemActions() {
  const activeTeacherId = useBuilderStore((s) => s.activeTeacherId);
  const openAddItemModal = useBuilderStore((s) => s.openAddItemModal);
  const selectedRuleIdsMap = useBuilderStore((s) => s.selectedRuleIds);
  const removeRule = useBuilderStore((s) => s.removeRule);

  if (!activeTeacherId) return null;

  const selectedRuleIds =
    selectedRuleIdsMap[activeTeacherId] ?? new Set<string>();
  const selectedCount = selectedRuleIds.size;

  function handleRemoveSelected() {
    if (!activeTeacherId || selectedCount === 0) return;
    // 이번 프레임의 스냅샷을 배열로 고정한 뒤 순회하며 제거.
    // store가 불변 mutation으로 새 인스턴스를 교체하더라도 선택 id 리스트는 그대로 순회 가능.
    const ids = Array.from(selectedRuleIds);
    for (const id of ids) {
      removeRule(activeTeacherId, id);
    }
  }

  return (
    <div className="flex items-center gap-2 border-t border-[var(--aca-gray-100)] bg-[var(--aca-white)] px-5 py-4">
      <ActionButton
        icon={<Sparkles className="size-3.5" />}
        label="항목 추가"
        variant="primary"
        onClick={() => openAddItemModal("unspecified")}
      />
      <div className="mx-1 h-5 border-l border-[var(--aca-gray-100)]" />
      <ActionButton
        icon={<Upload className="size-3.5" />}
        label="수업 기반"
        variant="neutral"
        onClick={() => openAddItemModal("revenue")}
      />
      <ActionButton
        icon={<Plus className="size-3.5" />}
        label="지급"
        variant="neutral"
        onClick={() => openAddItemModal("plus")}
      />
      <ActionButton
        icon={<Minus className="size-3.5" />}
        label="차감"
        variant="neutral"
        onClick={() => openAddItemModal("minus")}
      />

      <div className="ml-auto flex items-center">
        <ActionButton
          icon={<Trash2 className="size-3.5" />}
          label={selectedCount > 0 ? `선택 항목 제거 (${selectedCount})` : "선택 항목 제거"}
          variant="danger"
          onClick={handleRemoveSelected}
          disabled={selectedCount === 0}
        />
      </div>
    </div>
  );
}
