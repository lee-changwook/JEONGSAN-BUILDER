'use client';

import { useState } from 'react';

import {
  ALL_OPS,
  type BaseId,
  CATEGORIES,
  type CategoryId,
  type ClassItem,
  type OpId,
  type RuleItem,
  baseValueFromAgg,
  classCatalog,
  computeClassAggregate,
  computeRule,
  findClass,
  formatCurrency,
  opDef,
} from '@/app/jeongsan-builder-co-fi/data';

// ---- Types ----

export type AddableRule = Omit<RuleItem, 'id' | 'rule' | 'result'>;

interface Props {
  tid: string;
  presetCategory?: CategoryId | null;
  onClose: () => void;
  onConfirm: (items: AddableRule[]) => void;
}

// ---- Main Modal ----

export default function AddItemModal({ tid, presetCategory, onClose, onConfirm }: Props) {
  const [category, setCategory] = useState<CategoryId | null>(presetCategory ?? null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-[92%] max-w-[820px] flex-col overflow-hidden rounded-xl border-2 border-black bg-white shadow-[6px_6px_0_black]"
        onClick={e => e.stopPropagation()}
      >
        {/* Head */}
        <div className="flex items-center gap-3 border-b-2 border-black bg-[#faf6ea] px-5 py-3">
          <h3 className="m-0 flex-1 text-2xl" style={{ fontFamily: '"Nanum Pen Script", sans-serif' }}>
            정산 항목 추가
          </h3>
          <button onClick={onClose} className="border-none bg-transparent text-xl text-gray-400 hover:text-[#d14b3d]">
            x
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!category ? (
            <CategoryPicker onPick={setCategory} />
          ) : category === 'revenue' ? (
            <RevenueFlow
              tid={tid}
              onBack={() => setCategory(null)}
              onConfirm={item => onConfirm([item])}
            />
          ) : (
            <PlusMinusFlow
              cat={category}
              onBack={() => setCategory(null)}
              onConfirm={items => onConfirm(items)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Category Picker ----

function CategoryPicker({ onPick }: { onPick: (cat: CategoryId) => void }) {
  return (
    <>
      <StepLabel num={1} title="카테고리 선택" />
      <div className="grid grid-cols-1 gap-2.5">
        {Object.values(CATEGORIES).map(c => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-black bg-white p-3 text-left transition-all hover:bg-[#fffbe4] hover:shadow-[2px_2px_0_black] hover:-translate-x-px hover:-translate-y-px"
            style={{ borderLeft: `8px solid ${c.badgeBg}` }}
          >
            <span
              className="inline-grid h-10 w-10 place-items-center rounded-full border-2 border-black text-lg font-bold"
              style={{ background: c.badgeBg, fontFamily: 'Caveat, cursive' }}
            >
              {c.badge}
            </span>
            <div className="flex-1">
              <div className="text-[16px] font-bold" style={{ fontFamily: '"Gaegu", sans-serif' }}>
                {c.name}
              </div>
              <div className="mt-0.5 font-mono text-[12px] leading-snug text-gray-500">{c.desc}</div>
              {!c.needsClass && (
                <div className="mt-1 font-mono text-[11px] text-[#2e5a9c]">
                  수기 입력 + Excel 붙여넣기로 여러 건 동시 추가 가능
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// ================================================================
// Revenue Flow (수업 기반)
// ================================================================

function RevenueFlow({
  tid, onBack, onConfirm,
}: {
  tid: string;
  onBack: () => void;
  onConfirm: (item: AddableRule) => void;
}) {
  const [classIds, setClassIds] = useState<string[]>([]);
  const [base, setBase] = useState<BaseId | null>(null);
  const [op, setOp] = useState<OpId | null>(null);
  const [value, setValue] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [taxable, setTaxable] = useState<boolean>(true);
  const [classSearch, setClassSearch] = useState<string>('');

  const cat = CATEGORIES.revenue;
  const opInfo = op ? opDef(op) : null;
  const auxNeeded = opInfo?.needsAux ?? false;
  const agg = computeClassAggregate(tid, classIds);

  const filteredClasses = (classCatalog[tid] ?? []).filter(
    c => !classSearch || c.name.toLowerCase().includes(classSearch.toLowerCase()),
  );

  const isReady = classIds.length > 0 && base && op && (!auxNeeded || value !== '');

  const auxVal = parseFloat(value) || 0;
  let preview: { baseVal: number; result: number; formula: string } | null = null;
  if (base && op) {
    const baseVal = baseValueFromAgg(base, agg);
    const { result } = computeRule(tid, { classIds, base, op, value: auxVal, cat: 'revenue', customBase: 0 });
    const formulas: Record<OpId, string> = {
      rate: `${baseVal.toLocaleString()} x ${value || 0}`,
      fixed: `${baseVal.toLocaleString()}`,
      multiply: `${baseVal.toLocaleString()} x ${auxVal.toLocaleString()}`,
      add: `${baseVal.toLocaleString()} + ${auxVal.toLocaleString()}`,
      custom: 'MAX(base x 0.6, 1.3M) + IF(학생수>=20, 500K) - 미납 x 10%',
    };
    preview = { baseVal, result, formula: formulas[op] };
  }

  const handleConfirm = () => {
    if (!isReady || !base || !op) return;
    const selClasses = classIds.map(cid => findClass(tid, cid)).filter(Boolean) as ClassItem[];
    const autoName =
      name ||
      (selClasses.length === 1
        ? selClasses[0].name
        : selClasses.length > 1
          ? `${selClasses.length}개 수업`
          : '수업 항목');
    onConfirm({
      cat: 'revenue',
      name: autoName,
      classIds: [...classIds],
      base,
      op,
      value: auxNeeded ? auxVal : 0,
      customBase: 0,
      taxable,
    });
  };

  return (
    <div>
      <BackCategoryBar label={cat.name} onBack={onBack} />

      {/* Class selection */}
      <StepLabel num={2} title="수업 선택" extra="다중 가능" />
      <div className={`mb-3 rounded-lg border-2 p-3 ${classIds.length > 0 ? 'border-black bg-[#fffbe4]' : 'border-dashed border-[#d8d2bf] bg-white'}`}>
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            placeholder="수업명 검색..."
            value={classSearch}
            onChange={e => setClassSearch(e.target.value)}
            className="flex-1 rounded-md border-2 border-black px-2.5 py-1.5 text-[13px] focus:bg-[#fffbe4] focus:outline-none"
          />
          <button
            onClick={() => setClassIds((classCatalog[tid] ?? []).map(c => c.id))}
            className="rounded border border-dashed border-gray-400 bg-white px-2 py-0.5 text-xs font-bold text-gray-500 hover:border-black hover:text-black"
          >
            전체
          </button>
          <button
            onClick={() => setClassIds([])}
            className="rounded border border-dashed border-gray-400 bg-white px-2 py-0.5 text-xs font-bold text-gray-500 hover:border-black hover:text-black"
          >
            해제
          </button>
        </div>
        <div className="max-h-[200px] overflow-y-auto rounded-md border border-[#d8d2bf] bg-white">
          {filteredClasses.map(c => {
            const sel = classIds.includes(c.id);
            return (
              <div
                key={c.id}
                className={`grid cursor-pointer items-center gap-2 border-b border-gray-100 px-2.5 py-1.5 font-mono last:border-b-0 hover:bg-[#fffbe4] ${sel ? 'bg-[#fff3a8]' : ''}`}
                style={{ gridTemplateColumns: '24px 1fr auto' }}
                onClick={() => {
                  setClassIds(sel ? classIds.filter(id => id !== c.id) : [...classIds, c.id]);
                }}
              >
                <input type="checkbox" checked={sel} readOnly className="scale-110" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold" style={{ fontFamily: '"Gaegu", sans-serif' }}>
                      {c.name}
                    </span>
                    {c.section && (
                      <span className="rounded bg-[#efe9d7] px-1 text-[10px] font-mono">{c.section}</span>
                    )}
                  </div>
                  {c.description && (
                    <div className="font-mono text-[10px] text-gray-600">{c.description}</div>
                  )}
                  <div className="mt-px font-mono text-[10px] text-gray-500">
                    {c.students}명 &middot; {c.hours}h &middot; 순매출 {'\u20A9'}{c.revenueNet.toLocaleString()}
                    {c.unpaid > 0 && <> &middot; 미납 {'\u20A9'}{c.unpaid.toLocaleString()}</>}
                  </div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  {'\u20A9'}{(c.revenueNet / 1000000).toFixed(1)}M
                </div>
              </div>
            );
          })}
        </div>
        {classIds.length > 0 && (
          <div className="mt-2 rounded-md bg-[#efe9d7] px-3 py-2 font-mono text-xs">
            <div className="mb-1 flex flex-wrap gap-1">
              {classIds.map(cid => {
                const cl = findClass(tid, cid);
                return cl ? (
                  <span key={cid} className="inline-flex items-center gap-1 rounded-full border border-black bg-white px-2 py-px text-[11px]">
                    {cl.name}
                    <span
                      className="ml-0.5 cursor-pointer text-gray-400"
                      onClick={() => setClassIds(classIds.filter(id => id !== cid))}
                    >
                      x
                    </span>
                  </span>
                ) : null;
              })}
            </div>
            <div className="text-[11px] text-gray-600">
              선택 합계: {agg.students}명 &middot; {agg.hours}h &middot; 순매출 {formatCurrency(agg.revenueNet)} &middot; 미납 {formatCurrency(agg.unpaid)}
            </div>
          </div>
        )}
      </div>

      {/* Base value */}
      {classIds.length > 0 && (
        <>
          <StepLabel num={3} title="베이스값 선택" />
          <div className={`mb-3 rounded-lg border-2 p-3 ${base ? 'border-black bg-[#fffbe4]' : 'border-dashed border-[#d8d2bf] bg-white'}`}>
            <div className="grid grid-cols-2 gap-2">
              {cat.baseOptions.map(b => {
                const sv = baseValueFromAgg(b.id, agg);
                const display = b.unit === '원' ? formatCurrency(sv) : `${sv.toLocaleString()}${b.unit}`;
                return (
                  <div
                    key={b.id}
                    className={`flex cursor-pointer items-center justify-between rounded-md border p-2 font-mono ${base === b.id ? 'border-2 border-black bg-[#fff3a8]' : 'border-[#d8d2bf] bg-white hover:border-black hover:bg-[#fffbe4]'}`}
                    onClick={() => setBase(b.id)}
                  >
                    <div>
                      <div className="text-[13px] font-bold" style={{ fontFamily: '"Gaegu", sans-serif' }}>
                        {b.name}
                      </div>
                      <div className="font-mono text-[11px] text-gray-500">{b.desc}</div>
                    </div>
                    <div className="font-mono text-xs font-bold">{display}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Operation */}
      {base && (
        <>
          <StepLabel num={4} title="Operation" />
          <div className={`mb-3 rounded-lg border-2 p-3 ${op ? 'border-black bg-[#fffbe4]' : 'border-dashed border-[#d8d2bf] bg-white'}`}>
            <div className="grid grid-cols-4 gap-2">
              {ALL_OPS.map(o => (
                <div
                  key={o.id}
                  className={`cursor-pointer rounded-md border p-2 text-center font-mono text-[11px] ${op === o.id ? 'border-2 border-black bg-[#fff3a8]' : 'border-[#d8d2bf] bg-white hover:border-black hover:bg-[#fffbe4]'}`}
                  onClick={() => { setOp(o.id); setValue(''); }}
                >
                  <span className="mb-0.5 block text-[13px] font-bold" style={{ fontFamily: '"Gaegu", sans-serif' }}>
                    {o.name}
                  </span>
                  <span>{o.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Value + name */}
      {op && (
        <>
          <StepLabel num={5} title={auxNeeded ? '값 + 이름' : '이름'} />
          <div className="mb-3 rounded-lg border-2 border-black bg-[#fffbe4] p-3">
            <div className="grid grid-cols-2 gap-2.5">
              {auxNeeded && (
                <label className="flex flex-col gap-1 text-xs text-gray-500">
                  {opInfo!.auxLabel}
                  <input
                    type="number"
                    step="any"
                    value={value}
                    placeholder={opInfo!.auxHint}
                    onChange={e => setValue(e.target.value)}
                    className="rounded-md border-2 border-black px-2.5 py-2 font-mono text-[13px] focus:bg-[#fffbe4] focus:outline-none"
                  />
                  <span className="mt-0.5 text-[11px] text-gray-400">{opInfo!.auxHint}</span>
                </label>
              )}
              <label className={`flex flex-col gap-1 text-xs text-gray-500 ${auxNeeded ? '' : 'col-span-2'}`}>
                항목 이름 <span className="font-normal text-gray-400">(비워두면 자동 생성)</span>
                <input
                  type="text"
                  value={name}
                  placeholder="예: 물리A 수업료"
                  onChange={e => setName(e.target.value)}
                  className="rounded-md border-2 border-black px-2.5 py-2 font-mono text-[13px] focus:bg-[#fffbe4] focus:outline-none"
                />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-gray-600 font-mono">
              <input type="checkbox" checked={taxable} onChange={e => setTaxable(e.target.checked)} />
              <span>세금(3.3%) 공제 대상 포함</span>
            </label>
          </div>
        </>
      )}

      {/* Preview */}
      {preview && op && (
        <div className="rounded-lg border-2 border-black bg-[#efe9d7] p-3 font-mono text-xs">
          <div className="mb-1 text-[11px] text-gray-500">수식 미리보기</div>
          <div className="mb-1 font-bold">{preview.formula}</div>
          <div className="text-lg font-bold text-[#2f6a4e]">{formatCurrency(preview.result)}</div>
        </div>
      )}

      {/* Footer */}
      <ModalFooter
        status={
          !classIds.length ? '수업을 선택해주세요' :
          !base ? '베이스값을 선택해주세요' :
          !op ? 'Operation을 선택해주세요' :
          auxNeeded && !value ? `${opInfo!.auxLabel}을 입력해주세요` :
          '추가 준비 완료'
        }
        ready={!!isReady}
        onCancel={onBack}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

// ================================================================
// Plus/Minus Flow
// ================================================================

function PlusMinusFlow({
  cat, onBack, onConfirm,
}: {
  cat: CategoryId;
  onBack: () => void;
  onConfirm: (items: AddableRule[]) => void;
}) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const catDef = CATEGORIES[cat];

  return (
    <div>
      <BackCategoryBar label={catDef.name} onBack={onBack} />

      <StepLabel num={2} title="입력 방식" />
      <div className="mb-3 grid grid-cols-2 gap-2">
        <ModeCard
          active={mode === 'single'}
          onClick={() => setMode('single')}
          title="단일 추가"
          desc="한 항목을 직접 입력"
        />
        <ModeCard
          active={mode === 'bulk'}
          onClick={() => setMode('bulk')}
          title="여러 건 추가 (Excel 붙여넣기)"
          desc="이름/금액을 한번에 붙여넣거나 행 단위로 입력"
        />
      </div>

      {mode === 'single' ? (
        <SingleForm cat={cat} onBack={onBack} onConfirm={items => onConfirm(items)} />
      ) : (
        <BulkForm cat={cat} onBack={onBack} onConfirm={items => onConfirm(items)} />
      )}
    </div>
  );
}

function ModeCard({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-lg border-2 p-3 text-left transition-all ${
        active
          ? 'border-black bg-[#fff3a8] shadow-[3px_3px_0_black] -translate-x-0.5 -translate-y-0.5'
          : 'border-[#d8d2bf] bg-white hover:border-black hover:bg-[#fffbe4]'
      }`}
    >
      <div className="text-[14px] font-bold" style={{ fontFamily: '"Gaegu", sans-serif' }}>
        {title}
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-gray-500">{desc}</div>
    </button>
  );
}

// ---- Single Form ----

function SingleForm({
  cat, onBack, onConfirm,
}: {
  cat: CategoryId;
  onBack: () => void;
  onConfirm: (items: AddableRule[]) => void;
}) {
  const catDef = CATEGORIES[cat];
  const [customBase, setCustomBase] = useState<string>('');
  const [op, setOp] = useState<OpId>('fixed');
  const [value, setValue] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [taxable, setTaxable] = useState<boolean>(catDef.defaultTaxable);

  const opInfo = opDef(op)!;
  const auxNeeded = opInfo.needsAux;
  const baseNum = parseFloat(customBase) || 0;
  const auxNum = parseFloat(value) || 0;

  const isReady = customBase !== '' && name.trim() !== '' && (!auxNeeded || value !== '');

  const { result } = computeRule('', {
    classIds: [], base: 'revenueNet', op, value: auxNum, cat, customBase: baseNum,
  });
  const formulaMap: Record<OpId, string> = {
    rate: `${baseNum.toLocaleString()} x ${value || 0}`,
    fixed: `${baseNum.toLocaleString()}`,
    multiply: `${baseNum.toLocaleString()} x ${auxNum.toLocaleString()}`,
    add: `${baseNum.toLocaleString()} + ${auxNum.toLocaleString()}`,
    custom: 'MAX(base x 0.6, 1.3M) + IF(학생수>=20, 500K) - 미납 x 10%',
  };

  const handleConfirm = () => {
    if (!isReady) return;
    onConfirm([{
      cat,
      name: name.trim(),
      classIds: [],
      base: 'revenueNet',
      op,
      value: auxNeeded ? auxNum : 0,
      customBase: baseNum,
      taxable,
      description: description.trim() || undefined,
    }]);
  };

  return (
    <>
      <StepLabel num={3} title="기본 금액 (수기 입력)" />
      <div className="mb-3 rounded-lg border-2 border-black bg-[#fffbe4] p-3">
        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            기본 금액 (베이스값)
            <input
              type="number"
              step="any"
              value={customBase}
              placeholder="예: 500000"
              onChange={e => setCustomBase(e.target.value)}
              className="rounded-md border-2 border-black px-2.5 py-2 font-mono text-[13px] focus:bg-[#fffbe4] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            항목 이름
            <input
              type="text"
              value={name}
              placeholder="예: 부장 수당"
              onChange={e => setName(e.target.value)}
              className="rounded-md border-2 border-black px-2.5 py-2 font-mono text-[13px] focus:bg-[#fffbe4] focus:outline-none"
            />
          </label>
        </div>
        <label className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
          설명 <span className="font-normal text-gray-400">(선택)</span>
          <input
            type="text"
            value={description}
            placeholder="예: 월 고정 지급"
            onChange={e => setDescription(e.target.value)}
            className="rounded-md border-2 border-black px-2.5 py-1.5 font-mono text-[12px] focus:bg-[#fffbe4] focus:outline-none"
          />
        </label>
      </div>

      <StepLabel num={4} title="Operation" />
      <div className="mb-3 rounded-lg border-2 border-black bg-[#fffbe4] p-3">
        <div className="grid grid-cols-4 gap-2">
          {ALL_OPS.map(o => (
            <div
              key={o.id}
              className={`cursor-pointer rounded-md border p-2 text-center font-mono text-[11px] ${op === o.id ? 'border-2 border-black bg-[#fff3a8]' : 'border-[#d8d2bf] bg-white hover:border-black hover:bg-[#fffbe4]'}`}
              onClick={() => { setOp(o.id); setValue(''); }}
            >
              <span className="mb-0.5 block text-[13px] font-bold" style={{ fontFamily: '"Gaegu", sans-serif' }}>
                {o.name}
              </span>
              <span>{o.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {auxNeeded && (
        <>
          <StepLabel num={5} title="보조값" />
          <div className="mb-3 rounded-lg border-2 border-black bg-[#fffbe4] p-3">
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              {opInfo.auxLabel}
              <input
                type="number"
                step="any"
                value={value}
                placeholder={opInfo.auxHint}
                onChange={e => setValue(e.target.value)}
                className="rounded-md border-2 border-black px-2.5 py-2 font-mono text-[13px] focus:bg-[#fffbe4] focus:outline-none"
              />
              <span className="mt-0.5 text-[11px] text-gray-400">{opInfo.auxHint}</span>
            </label>
          </div>
        </>
      )}

      <div className="mb-3 rounded-lg border-2 border-dashed border-[#d8d2bf] bg-white p-3">
        <label className="flex items-center gap-2 text-xs text-gray-600 font-mono">
          <input type="checkbox" checked={taxable} onChange={e => setTaxable(e.target.checked)} />
          <span>세금(3.3%) 공제 대상 포함</span>
        </label>
      </div>

      {customBase !== '' && (
        <div className="rounded-lg border-2 border-black bg-[#efe9d7] p-3 font-mono text-xs">
          <div className="mb-1 text-[11px] text-gray-500">수식 미리보기</div>
          <div className="mb-1 font-bold">{formulaMap[op]}</div>
          <div className={`text-lg font-bold ${result < 0 ? 'text-[#d14b3d]' : 'text-[#2f6a4e]'}`}>
            {formatCurrency(result)}
          </div>
        </div>
      )}

      <ModalFooter
        status={
          customBase === '' ? '기본 금액을 입력해주세요' :
          name.trim() === '' ? '항목 이름을 입력해주세요' :
          auxNeeded && value === '' ? `${opInfo.auxLabel}을 입력해주세요` :
          '추가 준비 완료'
        }
        ready={isReady}
        onCancel={onBack}
        onConfirm={handleConfirm}
      />
    </>
  );
}

// ---- Bulk Form ----

interface BulkRow {
  name: string;
  amount: number;
}

function parseBulkText(text: string): BulkRow[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      let parts = line.split('\t').map(p => p.trim()).filter(Boolean);
      if (parts.length < 2) {
        parts = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
      }
      if (parts.length < 2) {
        parts = line.split(/,\s*/).map(p => p.trim()).filter(Boolean);
      }
      if (parts.length < 2) {
        const num = parseNumStr(line);
        if (num !== null) return { name: '항목', amount: num };
        return { name: line, amount: 0 };
      }
      const nameStr = parts.slice(0, -1).join(' ');
      const amt = parseNumStr(parts[parts.length - 1]) ?? 0;
      return { name: nameStr, amount: amt };
    });
}

function parseNumStr(s: string): number | null {
  const cleaned = s.replace(/[,₩\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function BulkForm({
  cat, onBack, onConfirm,
}: {
  cat: CategoryId;
  onBack: () => void;
  onConfirm: (items: AddableRule[]) => void;
}) {
  const catDef = CATEGORIES[cat];
  const [text, setText] = useState<string>('');
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [op, setOp] = useState<OpId>('fixed');
  const [value, setValue] = useState<string>('');
  const [taxable, setTaxable] = useState<boolean>(catDef.defaultTaxable);
  const opInfo = opDef(op)!;
  const auxNeeded = opInfo.needsAux;
  const auxNum = parseFloat(value) || 0;

  const handleParse = () => {
    const parsed = parseBulkText(text);
    setRows(parsed);
  };

  const handleAddEmptyRow = () => {
    setRows([...rows, { name: '', amount: 0 }]);
  };

  const isReady = rows.length > 0 && rows.every(r => r.name.trim() !== '') && (!auxNeeded || value !== '');

  const handleConfirm = () => {
    if (!isReady) return;
    const items: AddableRule[] = rows.map(r => ({
      cat,
      name: r.name.trim(),
      classIds: [],
      base: 'revenueNet',
      op,
      value: auxNeeded ? auxNum : 0,
      customBase: r.amount,
      taxable,
    }));
    onConfirm(items);
  };

  return (
    <>
      <StepLabel num={3} title="Excel 붙여넣기 또는 직접 입력" />
      <div className="mb-3 rounded-lg border-2 border-black bg-[#fffbe4] p-3">
        <div className="mb-2 font-mono text-[11px] text-gray-600">
          형식: <span className="bg-white px-1 font-semibold">항목명[TAB]금액</span> (한 줄당 하나). Excel에서 복사해서 붙여넣으세요.
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onPaste={e => {
            const pasted = e.clipboardData.getData('text');
            if (pasted) {
              const next = (text + (text ? '\n' : '') + pasted).trim();
              setText(next);
              setRows(parseBulkText(next));
              e.preventDefault();
            }
          }}
          placeholder={"부장 수당\t500000\n진단고사 운영\t1000000\n격려금\t12500000"}
          rows={6}
          className="w-full rounded-md border-2 border-black p-2 font-mono text-[12px] focus:bg-white focus:outline-none"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleParse}
            className="rounded border border-black bg-[#fff3a8] px-3 py-1 text-xs font-bold"
          >
            파싱
          </button>
          <button
            onClick={() => { setText(''); setRows([]); }}
            className="rounded border border-dashed border-gray-400 bg-white px-3 py-1 text-xs font-bold text-gray-500"
          >
            지우기
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <StepLabel num={4} title={`${rows.length}개 항목 미리보기 (개별 수정 가능)`} />
          <div className="mb-3 max-h-[280px] overflow-y-auto rounded-lg border-2 border-black bg-white">
            <table className="w-full font-mono text-[11px]">
              <thead className="sticky top-0 bg-[#efe9d7]">
                <tr>
                  <th className="p-1.5 text-left text-[10px] uppercase text-gray-500">#</th>
                  <th className="p-1.5 text-left text-[10px] uppercase text-gray-500">이름</th>
                  <th className="p-1.5 text-right text-[10px] uppercase text-gray-500">금액</th>
                  <th className="w-8 p-1.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-none">
                    <td className="p-1.5 text-gray-400">{i + 1}</td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={r.name}
                        onChange={e => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                        placeholder="이름"
                        className="w-full rounded border border-[#d8d2bf] bg-white p-1 font-mono text-[11px] focus:border-black focus:bg-[#fffbe4] focus:outline-none"
                      />
                    </td>
                    <td className="p-1 text-right">
                      <input
                        type="number"
                        step="any"
                        value={r.amount}
                        onChange={e => setRows(rows.map((x, j) => (j === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x)))}
                        className="w-full rounded border border-[#d8d2bf] bg-white p-1 text-right font-mono text-[11px] focus:border-black focus:bg-[#fffbe4] focus:outline-none"
                      />
                    </td>
                    <td className="p-1 text-center">
                      <button
                        onClick={() => setRows(rows.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-[#d14b3d]"
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mb-3 flex gap-2">
            <button
              onClick={handleAddEmptyRow}
              className="rounded border border-dashed border-gray-400 bg-white px-2.5 py-1 text-xs font-bold text-gray-500 hover:border-black hover:text-black"
            >
              + 빈 행 추가
            </button>
          </div>

          <StepLabel num={5} title="공통 설정 (모든 항목에 일괄 적용)" />
          <div className="mb-3 rounded-lg border-2 border-black bg-[#fffbe4] p-3">
            <div className="mb-2 font-mono text-[11px] text-gray-600">Operation</div>
            <div className="mb-2 grid grid-cols-4 gap-2">
              {ALL_OPS.map(o => (
                <div
                  key={o.id}
                  className={`cursor-pointer rounded-md border p-2 text-center font-mono text-[11px] ${op === o.id ? 'border-2 border-black bg-[#fff3a8]' : 'border-[#d8d2bf] bg-white hover:border-black'}`}
                  onClick={() => { setOp(o.id); setValue(''); }}
                >
                  <span className="block text-[13px] font-bold" style={{ fontFamily: '"Gaegu", sans-serif' }}>
                    {o.name}
                  </span>
                  <span>{o.desc}</span>
                </div>
              ))}
            </div>
            {auxNeeded && (
              <label className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
                {opInfo.auxLabel}
                <input
                  type="number"
                  step="any"
                  value={value}
                  placeholder={opInfo.auxHint}
                  onChange={e => setValue(e.target.value)}
                  className="rounded-md border-2 border-black px-2.5 py-1.5 font-mono text-[13px] focus:bg-[#fffbe4] focus:outline-none"
                />
                <span className="text-[11px] text-gray-400">{opInfo.auxHint}</span>
              </label>
            )}
            <label className="mt-2 flex items-center gap-2 text-xs text-gray-600 font-mono">
              <input type="checkbox" checked={taxable} onChange={e => setTaxable(e.target.checked)} />
              <span>세금(3.3%) 공제 대상 포함</span>
            </label>
          </div>
        </>
      )}

      <ModalFooter
        status={
          rows.length === 0 ? '붙여넣기 또는 행 추가 후 파싱하세요' :
          rows.some(r => !r.name.trim()) ? '모든 항목의 이름을 입력해주세요' :
          auxNeeded && value === '' ? `${opInfo.auxLabel}을 입력해주세요` :
          `${rows.length}개 항목 추가 준비 완료`
        }
        ready={isReady}
        onCancel={onBack}
        onConfirm={handleConfirm}
        confirmLabel={rows.length > 0 ? `+ ${rows.length}개 항목 추가` : '+ 항목 추가'}
      />
    </>
  );
}

// ================================================================
// Shared small components
// ================================================================

function StepLabel({ num, title, extra }: { num: number; title: string; extra?: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-lg font-bold text-gray-600" style={{ fontFamily: 'Caveat, cursive' }}>
      <span
        className="inline-grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-black bg-[#fff3a8] text-sm"
        style={{ fontFamily: 'Caveat, cursive' }}
      >
        {num}
      </span>
      <span style={{ fontFamily: '"Gaegu", sans-serif' }}>{title}</span>
      {extra && <span className="text-[13px] text-[#d14b3d]">{extra}</span>}
    </div>
  );
}

function BackCategoryBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-dashed border-[#d8d2bf] bg-white px-3 py-2">
      <button
        onClick={onBack}
        className="rounded border border-black bg-white px-2 py-0.5 font-mono text-[11px] font-bold hover:bg-[#fffbe4]"
      >
        &larr; 카테고리 변경
      </button>
      <span className="font-mono text-[12px] text-gray-600">
        현재: <span className="font-bold">{label}</span>
      </span>
    </div>
  );
}

function ModalFooter({
  status, ready, onCancel, onConfirm, confirmLabel = '+ 항목 추가',
}: {
  status: string;
  ready: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  return (
    <div className="mt-3 -mx-5 border-t-2 border-black bg-[#faf6ea] px-5 py-3 flex items-center gap-2">
      <div className="flex-1 text-xs text-gray-600 font-mono">{status}</div>
      <button
        onClick={onCancel}
        className="rounded-full border-2 border-black bg-white px-3 py-1 text-sm font-bold shadow-[2px_2px_0_black] hover:shadow-[3px_3px_0_black]"
      >
        취소
      </button>
      <button
        onClick={onConfirm}
        disabled={!ready}
        className="rounded-full border-2 border-black bg-[#1a1a1a] px-3 py-1 text-sm font-bold text-[#faf6ea] shadow-[2px_2px_0_black] hover:shadow-[3px_3px_0_black] disabled:opacity-40"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
