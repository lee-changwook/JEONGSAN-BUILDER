"use client";

import { useEffect, useMemo } from "react";
import { ChevronRight } from "lucide-react";

import {
  MiniCheckbox,
  MiniDropdown,
  MiniInput,
} from "@/features/jeongsan-builder/components/MiniControls";
import { RoundTag, TypeBadge } from "@/features/jeongsan-builder/components/CenterPanel/TypeBadge";
import { useAuxDrag } from "@/features/jeongsan-builder/hooks/useAuxDrag";
import { MOCK_SETTLEMENT_ROWS } from "@/features/jeongsan-builder/mocks";
import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";
import type { SettlementItemRow } from "@/features/jeongsan-builder/types";
import { formatKRW } from "@/features/jeongsan-builder/utils/format";

function resolveRowBg(row: SettlementItemRow, selected: boolean): string {
  if (row.needsReview) return "var(--aca-bg-needs-review)";
  if (selected) return "#FBFAF4";
  return "var(--aca-white)";
}

interface RowProps {
  row: SettlementItemRow;
  index: number;
  selected: boolean;
  onToggle: () => void;
  aux: string;
  onAuxChange: (value: string) => void;
  tax: boolean;
  onTaxChange: (next: boolean) => void;
  auxHighlighted: boolean;
  onAuxMouseDown: (event: React.MouseEvent<HTMLInputElement>) => void;
  onAuxMouseEnter: () => void;
}

function ItemRow({
  row,
  index,
  selected,
  onToggle,
  aux,
  onAuxChange,
  tax,
  onTaxChange,
  auxHighlighted,
  onAuxMouseDown,
  onAuxMouseEnter,
}: RowProps) {
  return (
    <tr
      style={{
        background: resolveRowBg(row, selected),
        borderBottom: "1px solid var(--aca-gray-100)",
      }}
    >
      <td className="w-[34px] py-3 pr-2 pl-4 align-top">
        <MiniCheckbox checked={selected} onChange={onToggle} color="#2BB673" />
      </td>
      <td className="w-[50px] px-1.5 py-3 align-top">
        {row.code ? <RoundTag label={row.code} /> : null}
      </td>
      <td className="w-[44px] px-1.5 py-3 align-top">
        <TypeBadge kind={row.kind} />
      </td>
      <td className="min-w-[260px] px-2.5 py-3 align-top">
        <div
          className="text-[13.5px] font-semibold leading-[1.45]"
          style={{ color: "var(--aca-black)" }}
        >
          {row.name}
        </div>
        {row.detail && (
          <div
            className="mt-[3px] text-[11.5px] leading-[1.5]"
            style={{ color: "var(--aca-gray-500)" }}
          >
            {row.detail}
          </div>
        )}
        {row.sub && (
          <div
            className="mt-0.5 text-[11px]"
            style={{ color: "var(--aca-gray-400)" }}
          >
            {row.sub}
          </div>
        )}
      </td>
      <td className="w-[170px] px-1.5 py-3 align-top">
        {row.base.type === "dropdown" ? (
          <>
            <MiniDropdown
              label={row.base.options.find((o) => o.id === row.base.value)?.name ?? ""}
            />
            <div
              className="jb2-tnum mt-1 text-[11px]"
              style={{ color: "var(--aca-gray-400)" }}
            >
              = {row.base.computed}
            </div>
          </>
        ) : (
          <MiniInput value={row.base.value} />
        )}
      </td>
      <td className="w-[110px] px-1.5 py-3 align-top">
        <MiniDropdown
          label={row.op.options.find((o) => o.id === row.op.value)?.name ?? ""}
        />
      </td>
      <td
        className="w-[90px] px-1.5 py-3 align-top"
        onMouseEnter={onAuxMouseEnter}
        data-row-index={index}
      >
        <MiniInput
          value={aux}
          onChange={onAuxChange}
          highlighted={auxHighlighted}
          onMouseDown={onAuxMouseDown}
        />
      </td>
      <td className="w-[50px] px-1.5 py-3 text-center align-top">
        <MiniCheckbox checked={tax} onChange={onTaxChange} color="#2BB673" />
      </td>
      <td className="min-w-[150px] px-2.5 py-3 align-top">
        <span
          className="jb2-mono text-[11.5px]"
          style={{ color: "var(--aca-gray-600)" }}
        >
          {row.formula}
        </span>
      </td>
      <td className="min-w-[130px] py-3 pr-4 pl-2 text-right align-top">
        <div
          className="jb2-tnum whitespace-nowrap text-[13.5px] font-bold"
          style={{
            color:
              row.kind === "deduct" ? "var(--aca-red-primary)" : "var(--aca-black)",
          }}
        >
          {formatKRW(row.result)}
        </div>
        <button
          type="button"
          className="mt-1 inline-flex cursor-pointer items-center gap-0.5 border-none bg-transparent p-0 text-[11px]"
          style={{ color: "var(--aca-gray-400)" }}
        >
          상세
          <ChevronRight className="size-2.5" />
        </button>
      </td>
    </tr>
  );
}

const COLUMNS = [
  "",
  "#",
  "유형",
  "항목명 · 상세",
  "베이스값",
  "OPERATION",
  "보조값",
  "세금",
  "수식",
  "금액",
];

export function SettlementItemTable() {
  const selectedRows = useBuilderStore((s) => s.selectedRows);
  const toggleRow = useBuilderStore((s) => s.toggleRow);
  const auxValues = useBuilderStore((s) => s.auxValues);
  const taxFlags = useBuilderStore((s) => s.taxFlags);
  const setAux = useBuilderStore((s) => s.setAux);
  const setTax = useBuilderStore((s) => s.setTax);
  const initAux = useBuilderStore((s) => s.initAuxFromDefaults);
  const initTax = useBuilderStore((s) => s.initTaxFromDefaults);

  const auxDrag = useAuxDrag();

  const defaultAux = useMemo(() => {
    const acc: Record<number, string> = {};
    MOCK_SETTLEMENT_ROWS.forEach((row, i) => {
      acc[i] = row.aux;
    });
    return acc;
  }, []);

  const defaultTax = useMemo(() => {
    const acc: Record<number, boolean> = {};
    MOCK_SETTLEMENT_ROWS.forEach((row, i) => {
      acc[i] = row.tax;
    });
    return acc;
  }, []);

  useEffect(() => {
    initAux(defaultAux);
    initTax(defaultTax);
  }, [initAux, initTax, defaultAux, defaultTax]);

  return (
    <div
      className="flex-1 overflow-auto"
      style={{ background: "var(--aca-white)" }}
    >
      <table className="jb2-tnum w-full border-separate border-spacing-0">
        <thead>
          <tr
            className="sticky top-0 z-[1]"
            style={{
              background: "#F7F5EE",
              borderBottom: "1px solid var(--aca-gray-100)",
            }}
          >
            {COLUMNS.map((h, i) => (
              <th
                key={h || `col-${i}`}
                className="px-2 py-2.5 text-[11px] font-semibold tracking-[0.2px]"
                style={{
                  color: "var(--aca-gray-500)",
                  textAlign: i >= 9 ? "right" : i === 7 ? "center" : "left",
                  paddingLeft: i === 0 ? 16 : 8,
                  paddingRight: i === 9 ? 16 : 8,
                  borderBottom: "1px solid var(--aca-gray-200)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_SETTLEMENT_ROWS.map((row, i) => {
            const aux = auxValues[i] ?? row.aux;
            const tax = taxFlags[i] ?? row.tax;
            return (
              <ItemRow
                key={`${row.kind}-${row.name}-${i}`}
                row={row}
                index={i}
                selected={selectedRows.has(i)}
                onToggle={() => toggleRow(i)}
                aux={aux}
                onAuxChange={(value) => setAux(i, value)}
                tax={tax}
                onTaxChange={(next) => setTax(i, next)}
                auxHighlighted={auxDrag.isHighlighted(i)}
                onAuxMouseDown={(event) =>
                  auxDrag.beginDrag(i, aux, event.shiftKey)
                }
                onAuxMouseEnter={() => auxDrag.hoverDrag(i)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
