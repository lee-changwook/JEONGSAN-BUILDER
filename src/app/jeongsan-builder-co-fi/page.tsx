'use client';

import { useCallback, useMemo, useState } from 'react';

import AddItemModal, { type AddableRule } from '@/app/jeongsan-builder-co-fi/AddItemModal';
import RuleTable from '@/app/jeongsan-builder-co-fi/RuleTable';
import {
  type CategoryId,
  type RuleItem,
  computeRule,
  formatCurrency,
  initialRuleData,
  teachers,
} from '@/app/jeongsan-builder-co-fi/data';

const TAX_RATE = 0.033;

function cloneRules(): Record<string, RuleItem[]> {
  return JSON.parse(JSON.stringify(initialRuleData));
}

export default function JeongsanBuilderCoFiPage() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('T001');
  const [ruleData, setRuleData] = useState<Record<string, RuleItem[]>>(cloneRules);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalPresetCat, setModalPresetCat] = useState<CategoryId | null>(null);

  const selectedTeacher = useMemo(
    () => teachers.find(t => t.id === selectedTeacherId) ?? null,
    [selectedTeacherId],
  );

  const rules = useMemo(() => {
    const r = ruleData[selectedTeacherId] ?? [];
    return r.map(rule => ({ ...rule, result: computeRule(selectedTeacherId, rule).result }));
  }, [selectedTeacherId, ruleData]);

  const { gross, deduct, total, taxBase, tax, net, taxableNote } = useMemo(() => {
    const g = rules.filter(r => r.cat !== 'minus').reduce((s, r) => s + r.result, 0);
    const d = rules.filter(r => r.cat === 'minus').reduce((s, r) => s + r.result, 0);
    const t = g + d;
    const txBase = rules.filter(r => r.taxable).reduce((s, r) => s + r.result, 0);
    const tx = Math.round(txBase * TAX_RATE);
    const taxableCount = rules.filter(r => r.taxable).length;
    return {
      gross: g,
      deduct: d,
      total: t,
      taxBase: txBase,
      tax: tx,
      net: t - tx,
      taxableNote: `${taxableCount}/${rules.length}건 과세`,
    };
  }, [rules]);

  const updateRules = useCallback(
    (tid: string, fn: (prev: RuleItem[]) => RuleItem[]) => {
      setRuleData(prev => ({ ...prev, [tid]: fn(prev[tid] ?? []) }));
    },
    [],
  );

  const handleSelectTeacher = (tid: string) => {
    setSelectedTeacherId(tid);
    setSelectedRuleIds(new Set());
  };

  const handleRuleUpdate = (ruleId: string, patch: Partial<RuleItem>) => {
    updateRules(selectedTeacherId, prev =>
      prev.map(r => (r.id === ruleId ? { ...r, ...patch } : r)),
    );
  };

  const handleBulkRuleUpdate = (ruleIds: string[], patch: Partial<RuleItem>) => {
    const idSet = new Set(ruleIds);
    updateRules(selectedTeacherId, prev =>
      prev.map(r => (idSet.has(r.id) ? { ...r, ...patch } : r)),
    );
  };

  const handleMultiUpdate = (updates: Array<{ ruleId: string; patch: Partial<RuleItem> }>) => {
    const patchById = new Map(updates.map(u => [u.ruleId, u.patch]));
    updateRules(selectedTeacherId, prev =>
      prev.map(r => (patchById.has(r.id) ? { ...r, ...patchById.get(r.id)! } : r)),
    );
  };

  const handleDelete = (ruleId: string) => {
    updateRules(selectedTeacherId, prev => prev.filter(r => r.id !== ruleId));
    setSelectedRuleIds(prev => {
      const next = new Set(prev);
      next.delete(ruleId);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedRuleIds.size === 0) return;
    updateRules(selectedTeacherId, prev => prev.filter(r => !selectedRuleIds.has(r.id)));
    setSelectedRuleIds(new Set());
  };

  const handleBulkDuplicate = () => {
    updateRules(selectedTeacherId, prev => {
      const toAdd = prev
        .filter(r => selectedRuleIds.has(r.id))
        .map(r => ({
          ...JSON.parse(JSON.stringify(r)),
          id: 'r' + Date.now() + Math.random(),
          rule: 'R' + (prev.length + 1),
          name: r.name + ' (복사)',
        }));
      return [...prev, ...toAdd];
    });
    setSelectedRuleIds(new Set());
  };

  const handleBulkToggleTax = (nextTaxable: boolean) => {
    handleBulkRuleUpdate([...selectedRuleIds], { taxable: nextTaxable });
  };

  const handleConfirmAdd = (items: AddableRule[]) => {
    updateRules(selectedTeacherId, prev => {
      const base = prev.length;
      const newRules: RuleItem[] = items.map((item, i) => ({
        ...item,
        id: 'r' + Date.now() + '_' + i,
        rule: 'R' + (base + i + 1),
        result: 0,
      }));
      return [...prev, ...newRules];
    });
    setModalOpen(false);
  };

  const openAddModal = (presetCat?: CategoryId) => {
    setModalPresetCat(presetCat ?? null);
    setModalOpen(true);
  };

  return (
    <div className="mx-auto h-full max-w-[1900px] p-5" style={{ fontFamily: '"Gaegu", "Nanum Pen Script", system-ui, sans-serif' }}>
      {/* Top bar */}
      <div className="mb-3 flex items-center gap-4">
        <h1 className="m-0 text-3xl font-bold" style={{ fontFamily: '"Nanum Pen Script", sans-serif' }}>
          월간 정산
        </h1>
        <span className="rounded-full border-2 border-black bg-white px-3 py-1 font-mono text-sm text-gray-500">
          2025년 2월
        </span>
        <div className="flex-1" />
        <button className="rounded-full border-2 border-black bg-white px-3 py-1 text-sm font-bold shadow-[2px_2px_0_black]">
          Import CSV
        </button>
        <button className="rounded-full border-2 border-black bg-white px-3 py-1 text-sm font-bold shadow-[2px_2px_0_black]">
          Export Excel
        </button>
        <button className="rounded-full border-2 border-black bg-[#1a1a1a] px-3 py-1 text-sm font-bold text-[#faf6ea] shadow-[2px_2px_0_black]">
          전체 발송 (12명)
        </button>
      </div>

      {/* Info bar */}
      <div className="mb-3 flex rounded-lg border-2 border-black bg-white px-4 py-2 shadow-[3px_3px_0_black]">
        <InfoStat label="강사" value="12명" />
        <InfoStat label="정산액 (Gross)" value={formatCurrency(512450320)} pos />
        <InfoStat label="원천세 (3.3%)" value={formatCurrency(16900860)} />
        <InfoStat label="실지급액" value={formatCurrency(495549460)} pos />
        <InfoStat label="미확정" value="3명" warn last />
      </div>

      {/* Main layout */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '190px 1fr', height: 'calc(100vh - 260px)' }}>
        {/* Sidebar */}
        <div className="flex flex-col overflow-hidden rounded-lg border-2 border-black bg-white shadow-[3px_3px_0_black]">
          <div
            className="flex items-center justify-between border-b-2 border-black bg-[#efe9d7] px-3 py-2 text-lg font-bold"
            style={{ fontFamily: '"Nanum Pen Script", sans-serif' }}
          >
            <span>강사</span>
            <span className="font-mono text-xs text-gray-500">12</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {teachers.map(t => (
              <div
                key={t.id}
                className={`flex cursor-pointer items-center gap-1.5 border-b border-gray-100 px-3 py-2 transition-colors hover:bg-[#fffbf3] ${selectedTeacherId === t.id ? 'bg-[#fff3a8] shadow-[inset_3px_0_0_#1a1a1a]' : ''}`}
                onClick={() => handleSelectTeacher(t.id)}
              >
                <div
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: t.status === 'done' ? '#2f6a4e' : '#f0a000' }}
                />
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-tight">{t.name}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-gray-500">
                    {t.dept} &middot; {'\u20A9'}{(t.net / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {!selectedTeacher ? (
          <div className="grid place-items-center rounded-lg border-2 border-black bg-white shadow-[4px_4px_0_black]">
            <div className="text-center">
              <div className="text-2xl text-gray-400" style={{ fontFamily: '"Nanum Pen Script", sans-serif' }}>
                &larr; 강사를 선택해주세요
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden rounded-lg border-2 border-black bg-white shadow-[4px_4px_0_black]">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b-2 border-black bg-[#faf6ea] px-4 py-3">
              <div>
                <h2 className="m-0 text-2xl leading-tight" style={{ fontFamily: '"Nanum Pen Script", sans-serif' }}>
                  {selectedTeacher.name}
                </h2>
                <div className="mt-0.5 font-mono text-xs text-gray-500">
                  {selectedTeacher.dept} &middot; {selectedTeacher.classroom}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-bold shadow-[2px_2px_0_black]">
                  히스토리
                </button>
                <button className="rounded-full border-2 border-black bg-[#fff3a8] px-3 py-1 text-xs font-bold shadow-[2px_2px_0_black]">
                  임시저장
                </button>
                <button className="rounded-full border-2 border-black bg-[#1a1a1a] px-3 py-1 text-xs font-bold text-[#faf6ea] shadow-[2px_2px_0_black]">
                  확정 &middot; 발송
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-6 border-b-2 border-black bg-[#efe9d7]">
              <SummaryItem label="항목" value={`${rules.length}개`} sub={taxableNote} />
              <SummaryItem label="지급 합계" value={formatCurrency(gross)} pos />
              <SummaryItem label="차감 합계" value={formatCurrency(deduct)} neg />
              <SummaryItem label="정산액 (Gross)" value={formatCurrency(total)} pos />
              <SummaryItem label={`원천세 (3.3%)`} value={formatCurrency(tax)} sub={`과세 ${formatCurrency(taxBase)}`} />
              <SummaryItem label="실지급 (Net)" value={formatCurrency(net)} pos large />
            </div>

            {/* Bulk bar */}
            {selectedRuleIds.size > 0 && (
              <div className="flex items-center gap-2 border-t-2 border-black bg-[#fff3a8] px-4 py-2 animate-in slide-in-from-top-2">
                <span className="text-lg" style={{ fontFamily: '"Nanum Pen Script", sans-serif' }}>
                  {selectedRuleIds.size}개 선택됨
                </span>
                <span className="font-mono text-[11px] text-gray-600">
                  값 수정 시 선택된 모든 행에 일괄 적용
                </span>
                <button
                  onClick={() => handleBulkToggleTax(true)}
                  className="rounded border border-dashed border-gray-400 bg-white px-2 py-0.5 text-xs font-bold text-gray-500 hover:border-black hover:text-black"
                >
                  과세 ON
                </button>
                <button
                  onClick={() => handleBulkToggleTax(false)}
                  className="rounded border border-dashed border-gray-400 bg-white px-2 py-0.5 text-xs font-bold text-gray-500 hover:border-black hover:text-black"
                >
                  과세 OFF
                </button>
                <button
                  onClick={handleBulkDuplicate}
                  className="rounded border border-dashed border-gray-400 bg-white px-2 py-0.5 text-xs font-bold text-gray-500 hover:border-black hover:text-black"
                >
                  복제
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleBulkDelete}
                  className="rounded border border-dashed border-[#d14b3d] bg-white px-2 py-0.5 text-xs font-bold text-[#d14b3d] hover:bg-[#fae3e0]"
                >
                  삭제
                </button>
                <button
                  onClick={() => setSelectedRuleIds(new Set())}
                  className="rounded border border-dashed border-gray-400 bg-white px-2 py-0.5 text-xs font-bold text-gray-500 hover:border-black hover:text-black"
                >
                  해제
                </button>
              </div>
            )}

            {/* Rule table */}
            <div className="flex-1 overflow-y-auto px-0.5 pb-0.5">
              <div className="px-3 py-1 font-mono text-[10px] text-gray-500">
                💡 숫자 셀(베이스값/보조값)을 드래그해서 범위 선택 · 한 셀에 입력하면 선택된 모든 셀에 일괄 적용 (엑셀처럼)
              </div>
              <RuleTable
                tid={selectedTeacherId}
                rules={rules}
                selectedIds={selectedRuleIds}
                onSelectionChange={setSelectedRuleIds}
                onRuleUpdate={handleRuleUpdate}
                onBulkRuleUpdate={handleBulkRuleUpdate}
                onMultiUpdate={handleMultiUpdate}
                onDelete={handleDelete}
              />
              <div className="flex gap-2 px-3 py-2">
                <button
                  onClick={() => openAddModal()}
                  className="rounded border border-solid border-black bg-[#fff3a8] px-2.5 py-0.5 text-xs font-bold text-black"
                >
                  + 항목 추가
                </button>
                <button
                  onClick={() => openAddModal('revenue')}
                  className="rounded border border-dashed border-gray-400 bg-white px-2.5 py-0.5 text-xs font-bold text-gray-500 hover:border-black hover:text-black hover:bg-[#fffbe4]"
                >
                  + 수업 기반
                </button>
                <button
                  onClick={() => openAddModal('plus')}
                  className="rounded border border-dashed border-gray-400 bg-white px-2.5 py-0.5 text-xs font-bold text-gray-500 hover:border-black hover:text-black hover:bg-[#fffbe4]"
                >
                  + 지급
                </button>
                <button
                  onClick={() => openAddModal('minus')}
                  className="rounded border border-dashed border-gray-400 bg-white px-2.5 py-0.5 text-xs font-bold text-gray-500 hover:border-black hover:text-black hover:bg-[#fffbe4]"
                >
                  + 차감
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <AddItemModal
          tid={selectedTeacherId}
          presetCategory={modalPresetCat}
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirmAdd}
        />
      )}
    </div>
  );
}

// ---- Sub-components ----

function InfoStat({ label, value, pos, warn, last }: { label: string; value: string; pos?: boolean; warn?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-baseline gap-1.5 px-4 py-0.5 ${last ? '' : 'border-r border-gray-200'}`}>
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`font-mono text-sm font-semibold ${pos ? 'text-[#2f6a4e]' : ''} ${warn ? 'text-[#f0a000]' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function SummaryItem({
  label, value, pos, neg, large, sub,
}: {
  label: string;
  value: string;
  pos?: boolean;
  neg?: boolean;
  large?: boolean;
  sub?: string;
}) {
  return (
    <div className="border-r border-gray-200 px-3.5 py-2.5 last:border-r-0">
      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</div>
      <div
        className={`mt-0.5 font-mono font-bold ${large ? 'text-[17px]' : 'text-[15px]'} ${pos ? 'text-[#2f6a4e]' : ''} ${neg ? 'text-[#d14b3d]' : ''}`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[9px] text-gray-500">{sub}</div>}
    </div>
  );
}
