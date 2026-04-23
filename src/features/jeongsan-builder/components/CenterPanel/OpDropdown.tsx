import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Check, ChevronDown } from "lucide-react";

import type { OpId } from "@/features/jeongsan-builder/calculator";
import { OP_OPTIONS } from "@/features/jeongsan-builder/components/AddItemModal/formOptions";

/**
 * op(수식) 드롭다운. base-ui Popover 기반.
 *   - 트리거: 현재 op의 lucide 아이콘 + 라벨 + chevron
 *   - 팝업: 각 옵션 `체크 | Icon | label | hint` 4열
 *
 * 롤백 방법: SettlementItemTable에서 `<OpDropdown ... />`을 `<OpIconPicker ... />`
 * 또는 기존 MiniDropdown으로 되돌리면 된다.
 */
export function OpDropdown({
  value,
  onChange,
}: {
  value: OpId;
  onChange: (next: OpId) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = OP_OPTIONS.find((o) => o.id === value) ?? OP_OPTIONS[1];
  const CurrentIcon = current.Icon;

  function pick(id: OpId) {
    onChange(id);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={(props) => (
          <button
            {...props}
            type="button"
            className="flex h-7 w-full cursor-pointer items-center justify-between gap-1.5 rounded-[4px] border border-[var(--aca-gray-200)] bg-[var(--aca-white)] px-2 text-xs text-[var(--aca-black)]"
            aria-label="수식 선택"
            title={current.hint}
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <CurrentIcon className="size-3.5 shrink-0 text-[var(--aca-gray-600)]" aria-hidden />
              <span className="truncate">{current.label}</span>
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-[var(--aca-gray-500)]" />
          </button>
        )}
      />
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={4}
          side="bottom"
          align="start"
          className="z-50"
        >
          <Popover.Popup
            className="jb2-scope z-50 w-[260px] rounded-md border border-[var(--aca-gray-200)] bg-[var(--aca-white)] py-1 text-[var(--aca-black)] shadow-[var(--aca-shadow-popover)] outline-none"
            // Portal이라 이벤트가 React 트리를 따라 wrapper까지 bubble해 selection을
            // clear시킬 수 있음. 팝업 내부 이벤트는 여기서 중단.
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {OP_OPTIONS.map((opt) => {
              const selected = opt.id === value;
              const Icon = opt.Icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => pick(opt.id)}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left ${
                    selected
                      ? "bg-[var(--aca-blue-10)]"
                      : "hover:bg-[var(--aca-gray-10)]"
                  }`}
                >
                  <span className="inline-flex size-3.5 shrink-0 items-center justify-center">
                    {selected ? (
                      <Check
                        className="size-3.5 text-[var(--aca-blue-primary)]"
                        strokeWidth={3}
                      />
                    ) : null}
                  </span>
                  <Icon
                    className="size-3.5 shrink-0 text-[var(--aca-gray-600)]"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold">
                      {opt.label}
                    </span>
                    <span className="block truncate text-[10.5px] text-[var(--aca-gray-500)]">
                      {opt.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
