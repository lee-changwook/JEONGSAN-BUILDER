"use client";

import type { ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";

import {
  formatKRW,
  isSyntheticClassId,
  type ClassItem,
  type LinkedMinapHoesuRow,
  type SettlementCalculator,
} from "@/features/jeongsan-builder/calculator";
import type {
  PayDocumentBlock,
  PayDocumentRow,
} from "@/features/jeongsan-builder/parser";

interface CourseDetailPopoverProps {
  teacherId: string;
  classIds: string[];
  calculator: SettlementCalculator;
  children: ReactNode;
}

/**
 * "상세" 버튼 클릭 시 팝오버로 강좌 상세 정보를 표시한다.
 * 실제 수업은 블록 기반 정보를 노출하고, synthetic(미납회수 전용) 수업은
 * 연결된 미납회수 내역만 표시한다. 두 경우 모두 하단에 연결 미납회수 rows를 덧붙인다.
 */
export function CourseDetailPopover({
  teacherId,
  classIds,
  calculator,
  children,
}: CourseDetailPopoverProps) {
  const classes = classIds
    .map((cid) => calculator.getClass(teacherId, cid))
    .filter((c): c is ClassItem => Boolean(c));

  return (
    <Popover.Root>
      <Popover.Trigger
        render={(props) => (
          <button
            type="button"
            {...props}
            className="inline-flex cursor-pointer items-center gap-0.5 border-none bg-transparent p-0 text-[11px]"
            style={{ color: "var(--aca-gray-400)" }}
          >
            {children}
          </button>
        )}
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} side="top" align="end" className="z-50">
          <Popover.Popup
            className="jb2-scope z-50 max-h-[70vh] w-[720px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md p-4 text-[13px] outline-none"
            style={{
              background: "var(--aca-white)",
              border: "1px solid var(--aca-gray-200)",
              boxShadow: "var(--aca-shadow-popover)",
              color: "var(--aca-black)",
            }}
          >
            {classes.length === 0 ? (
              <div className="py-6 text-center text-xs" style={{ color: "var(--aca-gray-400)" }}>
                선택된 수업이 없습니다.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {classes.map((cls) => (
                  <ClassSection
                    key={cls.id}
                    cls={cls}
                    calculator={calculator}
                  />
                ))}
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ClassSection({
  cls,
  calculator,
}: {
  cls: ClassItem;
  calculator: SettlementCalculator;
}) {
  const linkedRows = calculator.getLinkedMinapHoesuRows(cls.id);
  const isSynthetic = isSyntheticClassId(cls.id);
  const block = isSynthetic ? null : calculator.getBlock(cls.id);

  return (
    <section className="flex flex-col gap-3">
      {block ? (
        <BlockSection block={block} />
      ) : (
        <SyntheticClassHeader cls={cls} />
      )}
      {linkedRows.length > 0 && <LinkedMinapHoesuSection rows={linkedRows} />}
    </section>
  );
}

function SyntheticClassHeader({ cls }: { cls: ClassItem }) {
  return (
    <header>
      <div
        className="flex items-center gap-1.5 text-[13.5px] font-bold"
        style={{ color: "var(--aca-black)" }}
      >
        <span>{cls.name}</span>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style={{
            background: "var(--aca-yellow-10)",
            color: "var(--aca-yellow-primary)",
          }}
          title="수업 블록이 없고 미납회수 데이터에서 참조된 수업"
        >
          미납회수 전용
        </span>
      </div>
      <div
        className="mt-0.5 text-[11px]"
        style={{ color: "var(--aca-gray-500)" }}
      >
        당월 매출 블록 없음 · 전월 미납 회수 잔액{" "}
        <span
          className="jb2-tnum font-semibold"
          style={{ color: "var(--aca-red-primary)" }}
        >
          {formatKRW(cls.hoesu.minapTotal)}
        </span>
      </div>
    </header>
  );
}

function BlockSection({ block }: { block: PayDocumentBlock }) {
  const totalRevenue = block.totals.nabipTotal;
  const studentRows = block.rows.filter(
    (row) => row.sugangsaengName.value.trim().length > 0,
  );

  return (
    <div>
      <header className="mb-2">
        <div className="text-[13.5px] font-bold" style={{ color: "var(--aca-black)" }}>
          {block.sueopName}
          {block.boonbanName && (
            <span
              className="ml-1 text-[11px] font-medium"
              style={{ color: "var(--aca-gray-500)" }}
            >
              · {block.boonbanName}
            </span>
          )}
          {block.statusText && (
            <span
              className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                background: "var(--aca-gray-50)",
                color: "var(--aca-gray-600)",
              }}
            >
              {block.statusText}
            </span>
          )}
        </div>
        {block.scheduleText && (
          <div
            className="mt-0.5 text-[11px]"
            style={{ color: "var(--aca-gray-500)" }}
          >
            회차: {block.scheduleText}
          </div>
        )}
      </header>

      <div
        className="mb-3 grid grid-cols-4 gap-0 overflow-hidden rounded"
        style={{
          background: "var(--aca-gray-10)",
          border: "1px solid var(--aca-gray-100)",
        }}
      >
        <MetricTile label="총 매출" value={formatKRW(totalRevenue)} />
        <MetricTile
          label="시수"
          value={block.unitPriceText ?? "—"}
          valueSmall
        />
        <MetricTile label="학생 수" value={`${studentRows.length}명`} />
        <MetricTile
          label="실강회수 합"
          value={`${block.totals.quantityTotal}회`}
        />
      </div>

      <StudentTable rows={studentRows} sheetName={block.sheetName} />
    </div>
  );
}

/**
 * 수업에 연결된 전월 미납회수(minap_hoesu) student row 목록을 테이블로 표시.
 */
function LinkedMinapHoesuSection({ rows }: { rows: LinkedMinapHoesuRow[] }) {
  const hoesuTotal = rows.reduce((s, r) => s + r.row.hoesuAmount.value, 0);
  const minapTotal = rows.reduce((s, r) => s + r.row.minapAmount.value, 0);
  const payTotal = rows.reduce((s, r) => s + r.row.payAmount.value, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div
          className="text-[12px] font-semibold"
          style={{ color: "var(--aca-gray-600)" }}
        >
          전월 미납회수 내역{" "}
          <span
            className="ml-1 text-[11px] font-normal"
            style={{ color: "var(--aca-gray-500)" }}
          >
            · {rows.length}건
          </span>
        </div>
        <div
          className="jb2-tnum text-[11px]"
          style={{ color: "var(--aca-gray-500)" }}
        >
          회수 {formatKRW(hoesuTotal)} · 미회수{" "}
          <span style={{ color: "var(--aca-red-primary)" }}>
            {formatKRW(minapTotal)}
          </span>{" "}
          · PAY{" "}
          <span style={{ color: "var(--aca-blue-primary)" }}>
            {formatKRW(payTotal)}
          </span>
        </div>
      </div>
      <div
        className="overflow-hidden rounded"
        style={{ border: "1px solid var(--aca-gray-100)" }}
      >
        <table className="jb2-tnum w-full text-left text-[11.5px]">
          <colgroup>
            <col style={{ minWidth: 110 }} />
            <col style={{ minWidth: 140 }} />
            <col style={{ minWidth: 90 }} />
            <col style={{ minWidth: 90 }} />
            <col style={{ minWidth: 90 }} />
            <col style={{ minWidth: 110 }} />
          </colgroup>
          <thead>
            <tr style={{ background: "var(--aca-gray-10)" }}>
              <Th>학생명</Th>
              <Th>연결 수업명 (원문)</Th>
              <Th align="right">회수</Th>
              <Th align="right">미회수</Th>
              <Th align="right">PAY</Th>
              <Th>출처</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, sourceBlock }) => {
              const source = row.sugangsaengName.cell
                ? `${sourceBlock.sheetName}:${row.sugangsaengName.cell.address}`
                : sourceBlock.sheetName;
              return (
                <tr
                  key={row.id}
                  style={{ borderBottom: "1px solid var(--aca-gray-100)" }}
                >
                  <Td>{row.sugangsaengName.value}</Td>
                  <Td>
                    <span style={{ color: "var(--aca-gray-600)" }}>
                      {row.linkedSueopName.value || "—"}
                    </span>
                  </Td>
                  <Td align="right">
                    {row.hoesuAmount.value === 0
                      ? "-"
                      : formatKRW(row.hoesuAmount.value)}
                  </Td>
                  <Td align="right">
                    <span
                      style={{
                        color:
                          row.minapAmount.value === 0
                            ? "var(--aca-gray-400)"
                            : "var(--aca-red-primary)",
                      }}
                    >
                      {row.minapAmount.value === 0
                        ? "-"
                        : formatKRW(row.minapAmount.value)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span
                      style={{
                        color:
                          row.payAmount.value === 0
                            ? "var(--aca-gray-400)"
                            : "var(--aca-blue-primary)",
                      }}
                    >
                      {formatKRW(row.payAmount.value)}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className="jb2-mono text-[10.5px]"
                      style={{ color: "var(--aca-gray-500)" }}
                    >
                      {source}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  valueSmall,
}: {
  label: string;
  value: string;
  valueSmall?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 px-3 py-2"
      style={{ borderRight: "1px solid var(--aca-gray-100)" }}
    >
      <div className="text-[10px]" style={{ color: "var(--aca-gray-500)" }}>
        {label}
      </div>
      <div
        className="jb2-tnum truncate font-semibold"
        style={{
          fontSize: valueSmall ? 11 : 13,
          color: "var(--aca-black)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StudentTable({
  rows,
  sheetName,
}: {
  rows: PayDocumentRow[];
  sheetName: string;
}) {
  if (rows.length === 0) {
    return (
      <div
        className="py-3 text-center text-[11px]"
        style={{ color: "var(--aca-gray-400)" }}
      >
        학생 행이 없습니다.
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded"
      style={{ border: "1px solid var(--aca-gray-100)" }}
    >
      <table className="jb2-tnum w-full text-left text-[11.5px]">
        <colgroup>
          <col style={{ minWidth: 110 }} />
          <col style={{ minWidth: 70 }} />
          <col style={{ minWidth: 100 }} />
          <col style={{ minWidth: 100 }} />
          <col style={{ minWidth: 80 }} />
          <col style={{ minWidth: 100 }} />
          <col style={{ minWidth: 110 }} />
        </colgroup>
        <thead>
          <tr style={{ background: "var(--aca-gray-10)" }}>
            <Th>학생명</Th>
            <Th align="right">실강/콘</Th>
            <Th align="right">납부액</Th>
            <Th align="right">미납액</Th>
            <Th>납입방법</Th>
            <Th align="right">PAY</Th>
            <Th>출처</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <StudentRow key={row.id} row={row} sheetName={sheetName} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align,
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className="px-2 py-1.5 font-semibold"
      style={{
        color: "var(--aca-gray-600)",
        textAlign: align ?? "left",
        borderBottom: "1px solid var(--aca-gray-100)",
      }}
    >
      {children}
    </th>
  );
}

function StudentRow({
  row,
  sheetName,
}: {
  row: PayDocumentRow;
  sheetName: string;
}) {
  const quantityLabel =
    row.rowKind === "sueop_student"
      ? row.silgangCountLabel.value
      : row.rowKind === "bochungbi_student"
        ? row.konCountLabel.value
        : "-";
  const nabipAmount =
    row.rowKind === "minap_hoesu_student" ? null : row.nabipAmount.value;
  const minapAmount = row.minapAmount.value;
  const gyeoljeSudan =
    row.rowKind === "minap_hoesu_student" ? "-" : row.gyeoljeSudan.value || "-";
  const payAmount = row.payAmount.value;
  const cell = row.sugangsaengName.cell;
  const source = cell ? `${sheetName}:${cell.address}` : sheetName;

  return (
    <tr style={{ borderBottom: "1px solid var(--aca-gray-100)" }}>
      <Td>{row.sugangsaengName.value}</Td>
      <Td align="right">{quantityLabel}</Td>
      <Td align="right">{nabipAmount === null ? "-" : formatKRW(nabipAmount)}</Td>
      <Td align="right">{minapAmount === 0 ? "-" : formatKRW(minapAmount)}</Td>
      <Td>{gyeoljeSudan}</Td>
      <Td align="right">{formatKRW(payAmount)}</Td>
      <Td>
        <span
          className="jb2-mono text-[10.5px]"
          style={{ color: "var(--aca-gray-500)" }}
        >
          {source}
        </span>
      </Td>
    </tr>
  );
}

function Td({
  children,
  align,
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className="whitespace-nowrap px-2 py-1.5"
      style={{
        color: "var(--aca-black)",
        textAlign: align ?? "left",
      }}
    >
      {children}
    </td>
  );
}
