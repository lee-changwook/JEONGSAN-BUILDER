'use client';

import { Fragment, useMemo, useRef, useState } from 'react';

import {
  ALL_OPS,
  type BaseId,
  CATEGORIES,
  type CategoryId,
  type ClassItem,
  type OpId,
  REVENUE_BASES,
  type RuleItem,
  computeCustom,
  computeRule,
  findClass,
  formatCurrency,
  formulaStr,
  opDef,
} from '@/app/jeongsan-builder-co-fi/data';

type CellCol = 'customBase' | 'value';
const CELL_COLS: CellCol[] = ['customBase', 'value'];

interface RuleTableProps {
  tid: string;
  rules: RuleItem[];
  selectedIds: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  onRuleUpdate: (ruleId: string, patch: Partial<RuleItem>) => void;
  onBulkRuleUpdate: (ruleIds: string[], patch: Partial<RuleItem>) => void;
  onMultiUpdate: (updates: Array<{ ruleId: string; patch: Partial<RuleItem> }>) => void;
  onDelete: (ruleId: string) => void;
}

const CAT_ROW_BG: Record<CategoryId, { normal: string; hover: string; selected: string }> = {
  revenue: { normal: 'bg-[#fffdf0]', hover: 'hover:bg-[#fffae0]', selected: 'bg-[#fff3a8]' },
  plus: { normal: 'bg-[#f3faf5]', hover: 'hover:bg-[#e6f5ec]', selected: 'bg-[#c8ecd4]' },
  minus: { normal: 'bg-[#fdf3f2]', hover: 'hover:bg-[#fae8e6]', selected: 'bg-[#f4c9c5]' },
};

export default function RuleTable({
  tid,
  rules,
  selectedIds,
  onSelectionChange,
  onRuleUpdate,
  onBulkRuleUpdate,
  onMultiUpdate,
  onDelete,
}: RuleTableProps) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const dragRef = useRef<{ startId: string; startCol: CellCol } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const lastAnchorRef = useRef<string | null>(null);

  const draggableCells = useMemo(() => {
    const map = new Map<string, Set<CellCol>>();
    for (const r of rules) {
      const cols = new Set<CellCol>();
      if (r.cat !== 'revenue') cols.add('customBase');
      const o = opDef(r.op);
      if (o?.needsAux) cols.add('value');
      map.set(r.id, cols);
    }
    return map;
  }, [rules]);

  const ruleIndex = useMemo(() => {
    const m = new Map<string, number>();
    rules.forEach((r, i) => m.set(r.id, i));
    return m;
  }, [rules]);

  const getCellFromEvent = (e: React.MouseEvent | MouseEvent): { id: string; col: CellCol } | null => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-cell-id][data-cell-col]');
    if (!cell) return null;
    const id = cell.dataset.cellId;
    const col = cell.dataset.cellCol as CellCol | undefined;
    if (!id || !col) return null;
    return { id, col };
  };

  const computeRect = (startId: string, startCol: CellCol, endId: string, endCol: CellCol): Set<string> => {
    const startIdx = ruleIndex.get(startId);
    const endIdx = ruleIndex.get(endId);
    if (startIdx === undefined || endIdx === undefined) return new Set();
    const [rFrom, rTo] = [startIdx, endIdx].sort((a, b) => a - b);
    const startColIdx = CELL_COLS.indexOf(startCol);
    const endColIdx = CELL_COLS.indexOf(endCol);
    const [cFrom, cTo] = [startColIdx, endColIdx].sort((a, b) => a - b);
    const next = new Set<string>();
    for (let r = rFrom; r <= rTo; r++) {
      const rule = rules[r];
      const allowed = draggableCells.get(rule.id) ?? new Set();
      for (let c = cFrom; c <= cTo; c++) {
        const colName = CELL_COLS[c];
        if (allowed.has(colName)) next.add(`${rule.id}|${colName}`);
      }
    }
    return next;
  };

  const handleWrapperMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const cell = getCellFromEvent(e);
    if (!cell) {
      // Click elsewhere — clear cell selection
      if (selectedCells.size > 0) setSelectedCells(new Set());
      return;
    }
    dragRef.current = { startId: cell.id, startCol: cell.col };
    setSelectedCells(new Set([`${cell.id}|${cell.col}`]));
  };

  const handleWrapperMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    const next = computeRect(dragRef.current.startId, dragRef.current.startCol, cell.id, cell.col);
    setSelectedCells(next);
    if (wrapperRef.current) wrapperRef.current.style.cursor = 'cell';
  };

  const handleWrapperMouseUp = () => {
    dragRef.current = null;
    if (wrapperRef.current) wrapperRef.current.style.cursor = '';
  };

  const commitCellValue = (ruleId: string, col: CellCol, newVal: number) => {
    const key = `${ruleId}|${col}`;
    if (selectedCells.has(key) && selectedCells.size > 1) {
      const updates: Array<{ ruleId: string; patch: Partial<RuleItem> }> = [];
      for (const k of selectedCells) {
        const [rId, c] = k.split('|') as [string, CellCol];
        const patch: Partial<RuleItem> = {};
        if (c === 'customBase') patch.customBase = newVal;
        else if (c === 'value') patch.value = newVal;
        updates.push({ ruleId: rId, patch });
      }
      onMultiUpdate(updates);
    } else {
      const patch: Partial<RuleItem> = col === 'customBase' ? { customBase: newVal } : { value: newVal };
      onRuleUpdate(ruleId, patch);
    }
  };

  // ---- Row-level (non-cell) bulk commit for op, base, taxable ----
  const applyIds = (ruleId: string): string[] => {
    if (selectedIds.has(ruleId) && selectedIds.size > 1) return [...selectedIds];
    return [ruleId];
  };

  const commitRowPatch = (ruleId: string, patch: Partial<RuleItem>) => {
    const ids = applyIds(ruleId);
    if (ids.length > 1) onBulkRuleUpdate(ids, patch);
    else onRuleUpdate(ruleId, patch);
  };

  const handleCheckboxToggle = (ruleId: string, shiftKey: boolean) => {
    if (shiftKey && lastAnchorRef.current) {
      const ids = rules.map(r => r.id);
      const a = ids.indexOf(lastAnchorRef.current);
      const b = ids.indexOf(ruleId);
      const [from, to] = a < b ? [a, b] : [b, a];
      const next = new Set(selectedIds);
      ids.slice(from, to + 1).forEach(id => next.add(id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      if (next.has(ruleId)) next.delete(ruleId);
      else next.add(ruleId);
      onSelectionChange(next);
    }
    lastAnchorRef.current = ruleId;
  };

  const toggleAll = (checked: boolean) => {
    if (checked) onSelectionChange(new Set(rules.map(r => r.id)));
    else onSelectionChange(new Set());
  };

  return (
    <div
      ref={wrapperRef}
      className="select-none"
      onMouseDown={handleWrapperMouseDown}
      onMouseMove={handleWrapperMouseMove}
      onMouseUp={handleWrapperMouseUp}
      onMouseLeave={handleWrapperMouseUp}
    >
      <table className="w-full border-collapse font-mono text-[11px]">
        <thead>
          <tr className="bg-[#fafaf6] text-left text-[9px] font-bold uppercase tracking-wider text-gray-500">
            <th className="w-8 p-1.5 text-center">
              <input
                type="checkbox"
                checked={rules.length > 0 && rules.every(r => selectedIds.has(r.id))}
                onChange={e => toggleAll(e.target.checked)}
              />
            </th>
            <th className="w-10 p-1.5">#</th>
            <th className="w-9 p-1.5">유형</th>
            <th className="min-w-[220px] p-1.5">항목명 · 상세</th>
            <th className="w-[150px] p-1.5">베이스값</th>
            <th className="w-[110px] p-1.5">Operation</th>
            <th className="w-[90px] p-1.5 text-right">보조값</th>
            <th className="w-[50px] p-1.5 text-center">세금</th>
            <th className="min-w-[160px] p-1.5 text-gray-400">수식</th>
            <th className="w-[130px] p-1.5 text-right">금액</th>
            <th className="w-8 p-1.5" />
          </tr>
        </thead>
        <tbody>
          {rules.map(rule => (
            <Fragment key={rule.id}>
              <RuleRow
                tid={tid}
                rule={rule}
                selected={selectedIds.has(rule.id)}
                selectedCells={selectedCells}
                onCheckboxToggle={shiftKey => handleCheckboxToggle(rule.id, shiftKey)}
                onRowPatch={patch => commitRowPatch(rule.id, patch)}
                onNamePatch={patch => onRuleUpdate(rule.id, patch)}
                onCellValue={(col, n) => commitCellValue(rule.id, col, n)}
                onDelete={() => onDelete(rule.id)}
              />
              {rule.op === 'custom' && (
                <CustomBreakdownRow tid={tid} rule={rule} />
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ================================================================
// Row
// ================================================================

interface RowProps {
  tid: string;
  rule: RuleItem;
  selected: boolean;
  selectedCells: Set<string>;
  onCheckboxToggle: (shiftKey: boolean) => void;
  onRowPatch: (patch: Partial<RuleItem>) => void;
  onNamePatch: (patch: Partial<RuleItem>) => void;
  onCellValue: (col: CellCol, n: number) => void;
  onDelete: () => void;
}

const CELL_SELECTED_STYLE = 'shadow-[inset_0_0_0_2px_#4d6be5] !bg-white';

function RuleRow({
  tid, rule, selected, selectedCells, onCheckboxToggle, onRowPatch, onNamePatch, onCellValue, onDelete,
}: RowProps) {
  const { baseVal } = computeRule(tid, rule);
  const cat = CATEGORIES[rule.cat];
  const classes = (rule.classIds ?? []).map(cid => findClass(tid, cid)).filter(Boolean) as ClassItem[];
  const isNeg = rule.result < 0;
  const bg = CAT_ROW_BG[rule.cat];
  const opInfo = opDef(rule.op);
  const auxDisabled = !opInfo?.needsAux;

  const customBaseCellSelected = selectedCells.has(`${rule.id}|customBase`);
  const valueCellSelected = selectedCells.has(`${rule.id}|value`);

  return (
    <tr
      className={`border-b border-gray-100 align-top ${selected ? bg.selected : `${bg.normal} ${bg.hover}`}`}
    >
      <td className="w-8 p-1.5 text-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => { /* handled in onClick below to capture shift */ }}
          onClick={e => { e.stopPropagation(); onCheckboxToggle((e as React.MouseEvent).shiftKey); }}
          onMouseDown={e => e.stopPropagation()}
        />
      </td>
      <td className="p-1.5">
        <span className="inline-block rounded-full border border-black bg-white px-1.5 py-px text-xs font-bold" style={{ fontFamily: 'Caveat, cursive' }}>
          {rule.rule}
        </span>
      </td>
      <td className="p-1.5">
        <span
          className="inline-block rounded px-1.5 py-px text-xs font-bold"
          style={{ background: cat.badgeBg, border: '1px solid rgba(0,0,0,0.1)', fontFamily: 'Caveat, cursive' }}
        >
          {cat.badge}
        </span>
      </td>

      {/* 항목명 · 상세 */}
      <td className="min-w-[220px] p-1.5">
        <input
          type="text"
          value={rule.name}
          onChange={e => onNamePatch({ name: e.target.value })}
          onMouseDown={e => e.stopPropagation()}
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-bold hover:border-[#d8d2bf] focus:border-black focus:bg-white focus:outline-none"
          style={{ fontFamily: '"Gaegu", sans-serif' }}
        />
        {rule.cat === 'revenue' && classes.length > 0 && (
          <div className="mt-0.5 space-y-0.5 px-1">
            {classes.map(c => (
              <div key={c.id} className="font-mono text-[10px] text-gray-600 leading-snug">
                <span className="font-bold">{c.name}</span>
                {c.section && <span className="ml-1 rounded bg-[#efe9d7] px-1 text-[9px]">{c.section}</span>}
                <span className="ml-1">
                  &middot; {c.students}명 &middot; {c.hours}h &middot; 순매출 {'\u20A9'}{c.revenueNet.toLocaleString()}
                  {c.unpaid > 0 && <> &middot; <span className="text-[#d14b3d]">미납 {'\u20A9'}{c.unpaid.toLocaleString()}</span></>}
                </span>
                {c.description && (
                  <div className="pl-3 text-[9px] italic text-gray-500">{c.description}</div>
                )}
              </div>
            ))}
            {classes.length > 1 && (
              <div className="pt-0.5 font-mono text-[9px] text-gray-500 border-t border-dashed border-gray-300">
                소계: {classes.reduce((s, c) => s + c.students, 0)}명 &middot;{' '}
                {classes.reduce((s, c) => s + c.hours, 0)}h &middot;{' '}
                {'\u20A9'}{classes.reduce((s, c) => s + c.revenueNet, 0).toLocaleString()}
              </div>
            )}
          </div>
        )}
        {rule.cat !== 'revenue' && rule.description && (
          <div className="mt-0.5 px-1 font-mono text-[10px] italic text-gray-500">{rule.description}</div>
        )}
      </td>

      {/* 베이스값 */}
      {rule.cat === 'revenue' ? (
        <td className="w-[150px] p-1" onMouseDown={e => e.stopPropagation()}>
          <select
            className="w-full rounded border border-[#d8d2bf] bg-white p-1 font-mono text-[10px] hover:border-black hover:bg-[#fffbe4] focus:border-black focus:bg-[#fffbe4] focus:outline-none"
            value={rule.base}
            onChange={e => onRowPatch({ base: e.target.value as BaseId })}
          >
            {REVENUE_BASES.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <div className="mt-0.5 px-0.5 text-right font-mono text-[10px] font-semibold text-gray-600">
            = {baseVal.toLocaleString()}
          </div>
        </td>
      ) : (
        <td
          data-cell-id={rule.id}
          data-cell-col="customBase"
          className={`w-[150px] p-1 ${customBaseCellSelected ? CELL_SELECTED_STYLE : ''}`}
        >
          <input
            type="number"
            step="any"
            className="w-full rounded border border-[#d8d2bf] bg-white p-1 text-right font-mono text-[11px] hover:border-black focus:border-black focus:bg-[#fffbe4] focus:outline-none"
            value={rule.customBase}
            onChange={e => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) onCellValue('customBase', n);
            }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
          <div className="mt-0.5 px-0.5 text-right font-mono text-[9px] text-gray-500">수기 입력</div>
        </td>
      )}

      {/* Operation */}
      <td className="w-[110px] p-1" onMouseDown={e => e.stopPropagation()}>
        <select
          className="w-full rounded border border-[#d8d2bf] bg-white p-1 font-mono text-[11px] hover:border-black hover:bg-[#fffbe4] focus:border-black focus:bg-[#fffbe4] focus:outline-none"
          value={rule.op}
          onChange={e => onRowPatch({ op: e.target.value as OpId })}
        >
          {ALL_OPS.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </td>

      {/* 보조값 */}
      {auxDisabled ? (
        <td className="w-[90px] p-1 text-right">
          <span className="inline-block w-full py-1 text-center font-mono text-[11px] text-gray-300">—</span>
        </td>
      ) : (
        <td
          data-cell-id={rule.id}
          data-cell-col="value"
          className={`w-[90px] p-1 text-right ${valueCellSelected ? CELL_SELECTED_STYLE : ''}`}
        >
          <input
            type="number"
            step="any"
            className="w-full rounded border border-[#d8d2bf] bg-white p-1 text-right font-mono text-[11px] hover:border-black focus:border-black focus:bg-[#fffbe4] focus:outline-none"
            value={rule.value}
            onChange={e => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) onCellValue('value', n);
            }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
        </td>
      )}

      {/* 세금 */}
      <td className="w-[50px] p-1.5 text-center" onMouseDown={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={rule.taxable}
          onChange={e => onRowPatch({ taxable: e.target.checked })}
          className="scale-110 cursor-pointer"
        />
      </td>

      {/* 수식 */}
      <td className="min-w-[160px] p-1.5 font-mono text-[10px] text-gray-500">
        {formulaStr(tid, rule)}
      </td>

      {/* 금액 */}
      <td className={`w-[130px] p-1.5 text-right font-mono text-xs font-bold ${isNeg ? 'text-[#d14b3d]' : 'text-[#2f6a4e]'}`}>
        {formatCurrency(rule.result)}
        {!rule.taxable && (
          <span className="mt-0.5 block text-[9px] font-normal text-gray-400">비과세</span>
        )}
      </td>

      {/* Delete */}
      <td className="w-8 p-1.5 text-center" onMouseDown={e => e.stopPropagation()}>
        <button
          className="text-gray-400 hover:text-[#d14b3d]"
          onClick={e => { e.stopPropagation(); onDelete(); }}
        >
          x
        </button>
      </td>
    </tr>
  );
}

// ================================================================
// Custom op breakdown row (demo)
// ================================================================

function CustomBreakdownRow({ tid, rule }: { tid: string; rule: RuleItem }) {
  const { steps, result } = computeCustom(tid, rule);
  const finalResult = rule.cat === 'minus' && result > 0 ? -result : result;
  return (
    <tr className="border-b-2 border-dashed border-[#4d6be5]/30 bg-[#eaf1fb]">
      <td colSpan={11} className="px-3 py-2">
        <div className="rounded-md border border-[#4d6be5] bg-white p-2.5">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="inline-block rounded bg-[#4d6be5] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
              style={{ fontFamily: 'Caveat, cursive' }}
            >
              Custom Op · 데모
            </span>
            <span className="font-mono text-[10px] text-gray-500">
              Base, 조건, MAX/IF를 조합한 하드코딩 예시 (추후 편집 UI 제공 예정)
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {steps.map((s, i) => (
              <div
                key={i}
                className="rounded border border-[#d8d2bf] bg-[#fafaf6] p-1.5 font-mono text-[10px]"
              >
                <div className="font-bold text-gray-700">{s.label}</div>
                <div className="mt-0.5 truncate text-gray-500" title={s.formula}>{s.formula}</div>
                <div className="mt-0.5 text-right font-bold text-[#2f6a4e]">
                  = {s.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-end gap-2 border-t border-dashed border-gray-300 pt-1.5 font-mono text-[11px]">
            <span className="text-gray-600">최종 = (3) + (4) − (5)</span>
            <span className={`text-sm font-bold ${finalResult < 0 ? 'text-[#d14b3d]' : 'text-[#2f6a4e]'}`}>
              = {formatCurrency(finalResult)}
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}
