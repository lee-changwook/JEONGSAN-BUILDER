'use client';

import { useState } from 'react';

type SubView = '조직 단위' | '강사별';
type OrgStatus = '검토중' | '승인 완료';
type ClassStatus = '이슈' | '정상';

interface Org {
  id: number;
  name: string;
  status: OrgStatus;
  classCount: number;
  openedAt: string;
}

interface ClassItem {
  id: string;
  name: string;
  status: ClassStatus;
  detail: { students: number; attendanceOk: number; attendanceMissing: number; paidOk: number; unpaid: number };
}

interface Comment {
  author: string;
  type: '이슈' | '작업' | '메모';
  date: string;
  body: string;
}

interface Instructor {
  id: number;
  name: string;
  classCount: number;
}

interface InstructorClass {
  id: string;
  name: string;
  schedule: string;
  revenue: number;
  ratio: number;
  hours: number;
  students: { name: string; sessions: number; paid: number; unpaid: number; pay: number }[];
}

const ORGS: Org[] = [
  { id: 1, name: '조직 A', status: '검토중', classCount: 12, openedAt: '2026-04-01' },
  { id: 2, name: '조직 B', status: '검토중', classCount: 8, openedAt: '2026-04-01' },
  { id: 3, name: '조직 C', status: '승인 완료', classCount: 6, openedAt: '2026-03-28' },
  { id: 4, name: '조직 D', status: '검토중', classCount: 10, openedAt: '2026-04-02' },
];

const CLASSES: ClassItem[] = [
  { id: 'c1', name: '수업명 A', status: '이슈', detail: { students: 12, attendanceOk: 9, attendanceMissing: 3, paidOk: 10, unpaid: 2 } },
  { id: 'c2', name: '수업명 B', status: '정상', detail: { students: 8, attendanceOk: 8, attendanceMissing: 0, paidOk: 8, unpaid: 0 } },
  { id: 'c3', name: '수업명 C', status: '이슈', detail: { students: 15, attendanceOk: 14, attendanceMissing: 1, paidOk: 12, unpaid: 3 } },
];

const COMMENTS: Comment[] = [
  { author: '김재진', type: '이슈', date: '2026-04-05', body: '출결 누락 3건 발견 — 수강생 홍길동, 김철수, 이영희' },
  { author: '이민성', type: '작업', date: '2026-04-05', body: '출결 누락 건 티키타에서 수정 완료' },
  { author: '김재진', type: '메모', date: '2026-04-06', body: '미납 금액 확인 필요 — 다음 검증 시 재확인' },
];

const INSTRUCTORS: Instructor[] = [
  { id: 1, name: '김명훈T', classCount: 7 },
  { id: 2, name: '강사 B', classCount: 3 },
  { id: 3, name: '강사 C', classCount: 5 },
];

const INSTRUCTOR_CLASSES: InstructorClass[] = [
  {
    id: 'ic1', name: '과합한성물리A', schedule: '토·화', revenue: 19984800, ratio: 0.6, hours: 24,
    students: [
      { name: '강서윤', sessions: 8, paid: 640000, unpaid: 0, pay: 617600 },
      { name: '강윤지', sessions: 8, paid: 640000, unpaid: 0, pay: 617600 },
      { name: '고준형', sessions: 8, paid: 640000, unpaid: 0, pay: 617600 },
      { name: '김다율', sessions: 8, paid: 640000, unpaid: 0, pay: 617600 },
    ],
  },
  {
    id: 'ic2', name: '과합한성물리B', schedule: '일·화', revenue: 5997680, ratio: 0.6, hours: 24,
    students: [
      { name: '고은서', sessions: 8, paid: 576000, unpaid: 0, pay: 555840 },
      { name: '고은찬', sessions: 8, paid: 576000, unpaid: 0, pay: 555840 },
      { name: '김동규', sessions: 8, paid: 640000, unpaid: 0, pay: 617600 },
    ],
  },
  {
    id: 'ic3', name: '과합물리특강', schedule: '월', revenue: 7830800, ratio: 0.6, hours: 12,
    students: [
      { name: '강윤지', sessions: 4, paid: 320000, unpaid: 0, pay: 308800 },
      { name: '고준형', sessions: 4, paid: 320000, unpaid: 0, pay: 308800 },
    ],
  },
  {
    id: 'ic4', name: '한성2물리', schedule: '월·금', revenue: 18393200, ratio: 0.7, hours: 21,
    students: [
      { name: '강서준', sessions: 4, paid: 320000, unpaid: 0, pay: 308800 },
      { name: '김나현', sessions: 7, paid: 560000, unpaid: 0, pay: 540400 },
      { name: '김도영', sessions: 6, paid: 480000, unpaid: 0, pay: 463200 },
    ],
  },
  {
    id: 'ic5', name: '한성2물리특강', schedule: '수', revenue: 2219500, ratio: 0.7, hours: 9,
    students: [
      { name: '김민서', sessions: 7, paid: 560000, unpaid: 0, pay: 540400 },
    ],
  },
  {
    id: 'ic6', name: '한성3물리문풀', schedule: '3회', revenue: 2238800, ratio: 0.7, hours: 9,
    students: [
      { name: '김서준', sessions: 7, paid: 560000, unpaid: 0, pay: 540400 },
    ],
  },
  {
    id: 'ic7', name: '한성3물리', schedule: '일·수', revenue: 7720000, ratio: 0.7, hours: 24,
    students: [
      { name: '김연조', sessions: 7, paid: 560000, unpaid: 0, pay: 540400 },
      { name: '김은서', sessions: 7, paid: 560000, unpaid: 0, pay: 540400 },
      { name: '한성3 (전월미납)', sessions: 0, paid: 617600, unpaid: 0, pay: 617600 },
    ],
  },
];

function formatMonth(year: number, month: number) {
  return `${year}년 ${String(month).padStart(2, '0')}월`;
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export default function MonthlySettlePage() {
  const [subView, setSubView] = useState<SubView>('조직 단위');
  const [ymState, setYmState] = useState({ year: 2026, month: 4 });

  // 조직 단위 state
  const [selectedOrgId, setSelectedOrgId] = useState<number>(ORGS[0].id);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // 강사별 state
  const [selectedInstructorId, setSelectedInstructorId] = useState<number>(INSTRUCTORS[0].id);
  const [expandedInstClasses, setExpandedInstClasses] = useState<Set<string>>(new Set());
  const [ratioOverrides, setRatioOverrides] = useState<Record<string, string>>({});

  function toggleInstClass(id: string) {
    setExpandedInstClasses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedOrg = ORGS.find(o => o.id === selectedOrgId)!;
  const issueCount = CLASSES.filter(c => c.status === '이슈').length;

  function toggleClass(id: string) {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleOrgSelect(id: number) {
    setSelectedOrgId(id);
    setExpandedClasses(new Set());
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 서브뷰 토글 + 월 선택 */}
      <div className="flex items-center gap-4 border-b-2 border-black px-4 py-2">
        <div className="flex items-center gap-1">
          <button
            className="border-2 border-black px-2 py-0.5 text-sm font-bold"
            onClick={() => setYmState(s => prevMonth(s.year, s.month))}
          >
            ‹
          </button>
          <span className="min-w-[90px] text-center text-sm font-bold">
            {formatMonth(ymState.year, ymState.month)}
          </span>
          <button
            className="border-2 border-black px-2 py-0.5 text-sm font-bold"
            onClick={() => setYmState(s => nextMonth(s.year, s.month))}
          >
            ›
          </button>
        </div>
        <div className="flex gap-0">
          {(['조직 단위', '강사별'] as SubView[]).map(v => (
            <button
              key={v}
              className={`px-4 py-1 text-sm ${
                subView === v
                  ? 'border-2 border-black bg-gray-800 text-white'
                  : 'border-2 border-black -ml-[2px]'
              }`}
              onClick={() => setSubView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {subView === '조직 단위' ? (
        /* 조직 단위: 정산안 검토/승인 */
        <div className="flex flex-1 overflow-hidden">
          {/* 좌측: 조직별 정산안 목록 */}
          <aside className="flex w-[300px] shrink-0 flex-col overflow-hidden border-r-2 border-black">
            <div className="border-b-2 border-black px-4 py-3">
              <div className="text-sm font-bold">조직별 정산안</div>
              <div className="text-xs text-gray-500">{formatMonth(ymState.year, ymState.month)} 검토 대상</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {ORGS.map(org => (
                <button
                  key={org.id}
                  className={`w-full border-b-2 border-black px-4 py-3 text-left ${
                    selectedOrgId === org.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleOrgSelect(org.id)}
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={org.status} />
                    <span className="text-sm font-bold">#{org.id} {org.name}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">수업 {org.classCount}개 · 요청일 {org.openedAt}</div>
                </button>
              ))}
            </div>
          </aside>

          {/* 우측: 정산안 상세 */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* 정산안 헤더 */}
            <div className="border-b-2 border-black px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold">
                  {selectedOrg.name} {formatMonth(ymState.year, ymState.month)} 정산안
                </span>
                <StatusBadge status={selectedOrg.status} />
              </div>
              <div className="mt-1 text-xs text-gray-500">
                #{selectedOrg.id} · 수업 {CLASSES.length}개 · 이슈 {issueCount}건 · 이번 정산 반영 기준안 검토
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* 수업 목록 */}
              <div className="px-6 py-4">
                <div className="mb-3 text-xs font-bold text-gray-500">수업 ({CLASSES.length})</div>
                <div>
                  {CLASSES.map(cls => {
                    const isExpanded = expandedClasses.has(cls.id);
                    return (
                      <div key={cls.id} className="border-2 border-black -mt-[2px]">
                        <button
                          className="flex w-full items-center justify-between bg-gray-50 px-4 py-2 text-left"
                          onClick={() => toggleClass(cls.id)}
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span>{isExpanded ? '▼' : '▶'}</span>
                            <span className="font-bold">{cls.name}</span>
                            {cls.status === '이슈' && <span className="text-xs text-gray-500">(출결/미납 이슈)</span>}
                          </div>
                          <span className={`border px-2 py-0.5 text-xs ${cls.status === '이슈' ? 'border-black font-bold' : 'border-gray-300 text-gray-500'}`}>
                            {cls.status}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="border-t-2 border-black">
                            <div className="grid grid-cols-2 gap-0 p-4 text-sm">
                              <div className="py-1">수강생</div><div className="py-1 font-bold">{cls.detail.students}명</div>
                              <div className="py-1">출결 정상</div><div className="py-1 font-bold">{cls.detail.attendanceOk}명</div>
                              <div className="py-1">출결 누락</div>
                              <div className={`py-1 font-bold ${cls.detail.attendanceMissing > 0 ? '' : 'text-gray-400'}`}>{cls.detail.attendanceMissing}명</div>
                              <div className="py-1">완납</div><div className="py-1 font-bold">{cls.detail.paidOk}명</div>
                              <div className="py-1">미납</div>
                              <div className={`py-1 font-bold ${cls.detail.unpaid > 0 ? '' : 'text-gray-400'}`}>{cls.detail.unpaid}명</div>
                            </div>
                            {/* 인라인 코멘트 */}
                            <div className="border-t border-gray-200 px-4 py-2">
                              <button className="text-xs text-gray-400 hover:text-black">
                                코멘트 남기기
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 구분선 */}
              <div className="border-t-2 border-black" />

              {/* 작업 이력 */}
              <div className="px-6 py-4">
                <div className="mb-3 text-xs font-bold text-gray-500">작업 이력</div>
                {COMMENTS.map((c, i) => (
                  <div key={i} className="border-2 border-black p-3 -mt-[2px]">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold">{c.author}</span>
                      <span className="border border-black px-1">{c.type}</span>
                      <span className="text-gray-400">{c.date}</span>
                    </div>
                    <div className="mt-1 text-sm">{c.body}</div>
                  </div>
                ))}
              </div>

              {/* 코멘트 입력 */}
              <div className="px-6 pb-4">
                <div className="border-2 border-black">
                  <div className="h-[70px] p-3 text-sm text-gray-400">코멘트 남기기...</div>
                  <div className="flex justify-end border-t-2 border-black p-2">
                    <button className="border-2 border-black px-3 py-1 text-sm font-bold">코멘트 남기기</button>
                  </div>
                </div>
              </div>

              {/* 승인 액션 */}
              <div className="px-6 pb-6">
                {selectedOrg.status === '검토중' ? (
                  <button className="w-full bg-gray-800 py-2 text-sm font-bold text-white">
                    이번 정산안으로 승인
                  </button>
                ) : (
                  <div className="border-2 border-gray-400 py-2 text-center text-sm text-gray-500">
                    승인 완료
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      ) : (
        /* 강사별: 강좌별 지급 내역 + 정산 합계 */
        <div className="flex flex-1 overflow-hidden">
          <aside className="flex w-[200px] shrink-0 flex-col overflow-hidden border-r-2 border-black">
            <div className="border-b-2 border-black px-4 py-2 text-xs text-gray-500">강사 선택</div>
            <div className="flex-1 overflow-y-auto">
              {INSTRUCTORS.map(inst => (
                <label key={inst.id} className="flex cursor-pointer items-start gap-2 border-b border-gray-200 px-4 py-3">
                  <input
                    type="radio"
                    name="settle-instructor"
                    checked={selectedInstructorId === inst.id}
                    onChange={() => { setSelectedInstructorId(inst.id); setExpandedInstClasses(new Set()); }}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-bold">{inst.name}</div>
                    <div className="text-xs text-gray-500">수업 {inst.classCount}개</div>
                  </div>
                </label>
              ))}
            </div>
          </aside>

          <main className="flex flex-1 flex-col overflow-hidden">
            <InstructorSettlePanel
              instructor={INSTRUCTORS.find(i => i.id === selectedInstructorId)!}
              classes={INSTRUCTOR_CLASSES}
              expandedClasses={expandedInstClasses}
              ratioOverrides={ratioOverrides}
              onToggle={toggleInstClass}
              onRatioChange={(id, val) => setRatioOverrides(prev => ({ ...prev, [id]: val }))}
              month={formatMonth(ymState.year, ymState.month)}
            />
          </main>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: OrgStatus }) {
  if (status === '승인 완료') return <span className="bg-gray-800 px-2 py-0.5 text-xs text-white">승인 완료</span>;
  return <span className="border-2 border-black px-2 py-0.5 text-xs font-bold">검토중</span>;
}

function fmt(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

interface ExtraItem {
  id: string;
  name: string;
  type: '강좌' | '고정지급';
  revenue: number;
  ratio: number;
}

interface TaItem {
  id: string;
  name: string;
  amount: number;
  taxable: boolean;
  classId: string | null; // null = 공통
}

function InstructorSettlePanel({
  instructor,
  classes,
  expandedClasses,
  ratioOverrides,
  onToggle,
  onRatioChange,
  month,
}: {
  instructor: Instructor;
  classes: InstructorClass[];
  expandedClasses: Set<string>;
  ratioOverrides: Record<string, string>;
  onToggle: (id: string) => void;
  onRatioChange: (id: string, val: string) => void;
  month: string;
}) {
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<{ name: string; type: '강좌' | '고정지급'; revenue: string; ratio: string }>({
    name: '', type: '고정지급', revenue: '', ratio: '1',
  });

  const [taItems, setTaItems] = useState<TaItem[]>([
    { id: 'ta-1', name: '박조교', amount: 500000, taxable: true, classId: 'ic1' },
    { id: 'ta-2', name: '이조교', amount: 400000, taxable: true, classId: 'ic4' },
    { id: 'ta-3', name: '공통조교A', amount: 300000, taxable: false, classId: null },
  ]);
  const [addingTaFor, setAddingTaFor] = useState<string | null>(null); // classId or 'common'
  const [taForm, setTaForm] = useState<{ name: string; amount: string; taxable: boolean }>({
    name: '', amount: '', taxable: true,
  });

  const classPayments = classes.map(cls => {
    const ratio = parseFloat(ratioOverrides[cls.id] ?? String(cls.ratio));
    const payment = Math.round(cls.revenue * (isNaN(ratio) ? cls.ratio : ratio));
    return { ...cls, effectiveRatio: isNaN(ratio) ? cls.ratio : ratio, payment };
  });

  const extraPayments = extraItems.map(item => {
    const payment = item.type === '고정지급'
      ? item.revenue
      : Math.round(item.revenue * item.ratio);
    return { ...item, payment };
  });

  const totalPayment =
    classPayments.reduce((s, c) => s + c.payment, 0) +
    extraPayments.reduce((s, e) => s + e.payment, 0);
  const tax = Math.round(totalPayment * 0.033);
  const netPayment = totalPayment - tax;

  const taPayments = taItems.map(ta => ({
    ...ta,
    netAmount: ta.taxable ? Math.round(ta.amount * (1 - 0.033)) : ta.amount,
  }));
  const totalTaPay = taPayments.reduce((s, t) => s + t.netAmount, 0);
  const instructorFinal = netPayment - totalTaPay;

  function handleAddItem() {
    const revenue = parseInt(addForm.revenue.replace(/,/g, ''), 10);
    if (!addForm.name || isNaN(revenue)) return;
    setExtraItems(prev => [...prev, {
      id: `extra-${Date.now()}`,
      name: addForm.name,
      type: addForm.type,
      revenue,
      ratio: parseFloat(addForm.ratio) || 1,
    }]);
    setAddForm({ name: '', type: '고정지급', revenue: '', ratio: '1' });
    setIsAdding(false);
  }

  function handleAddTa(classId: string | null) {
    const amount = parseInt(taForm.amount.replace(/,/g, ''), 10);
    if (!taForm.name || isNaN(amount)) return;
    setTaItems(prev => [...prev, {
      id: `ta-${Date.now()}`,
      name: taForm.name,
      amount,
      taxable: taForm.taxable,
      classId,
    }]);
    setTaForm({ name: '', amount: '', taxable: true });
    setAddingTaFor(null);
  }

  function removeTa(id: string) {
    setTaItems(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="border-b-2 border-black px-6 py-3">
        <div className="text-sm font-bold">{instructor.name} — {month} 급여대장</div>
      </div>

      {/* 강좌별 지급 내역 */}
      <div className="flex-1 overflow-y-auto">
        {/* 컬럼 헤더 */}
        <div className="grid grid-cols-[1fr_100px_50px_100px_100px] border-b-2 border-black bg-gray-100 px-4 py-2 text-xs text-gray-500">
          <div>강좌명</div>
          <div className="text-right">매출액</div>
          <div className="text-center">비율</div>
          <div className="text-right">시수</div>
          <div className="text-right">지급액</div>
        </div>

        {/* 정규 강좌 */}
        {classPayments.map(cls => {
          const isExpanded = expandedClasses.has(cls.id);
          return (
            <div key={cls.id} className="border-b border-gray-200">
              <div className="grid grid-cols-[1fr_100px_50px_100px_100px] items-center px-4 py-2">
                <button
                  className="flex items-center gap-1 text-left text-sm font-bold"
                  onClick={() => onToggle(cls.id)}
                >
                  <span className="text-xs text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                  <span>{cls.name}</span>
                  <span className="text-xs font-normal text-gray-400">{cls.schedule}</span>
                </button>
                <div className="text-right text-sm">{cls.revenue.toLocaleString()}</div>
                <div className="text-center">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={ratioOverrides[cls.id] ?? cls.ratio}
                    onChange={e => onRatioChange(cls.id, e.target.value)}
                    className="w-full border border-gray-300 px-1 text-center text-sm"
                  />
                </div>
                <div className="text-right text-sm text-gray-500">{cls.hours}회</div>
                <div className="text-right text-sm font-bold">{cls.payment.toLocaleString()}</div>
              </div>
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 px-6 pb-2">
                  {/* 학생 목록 */}
                  <div className="grid grid-cols-[1fr_60px_80px_80px_80px] py-1 text-xs text-gray-400">
                    <div>학생명</div><div className="text-center">실강회수</div>
                    <div className="text-right">납부액</div><div className="text-right">미납액</div><div className="text-right">PAY</div>
                  </div>
                  {cls.students.map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_60px_80px_80px_80px] py-0.5 text-xs">
                      <div>{s.name}</div>
                      <div className="text-center">{s.sessions}회</div>
                      <div className="text-right">{s.paid.toLocaleString()}</div>
                      <div className={`text-right ${s.unpaid > 0 ? 'font-bold' : 'text-gray-400'}`}>{s.unpaid.toLocaleString()}</div>
                      <div className="text-right">{s.pay.toLocaleString()}</div>
                    </div>
                  ))}
                  {/* 강좌별 조교 */}
                  <div className="mt-2 border-t border-dashed border-gray-300 pt-2">
                    <div className="mb-1 text-xs text-gray-400">조교</div>
                    {taItems.filter(t => t.classId === cls.id).map(ta => (
                      <div key={ta.id} className="flex items-center gap-2 py-0.5 text-xs">
                        <span className="flex-1">{ta.name}</span>
                        <span className="text-gray-500">{ta.amount.toLocaleString()}</span>
                        <label className="flex items-center gap-0.5 text-gray-400">
                          <input type="checkbox" checked={ta.taxable} onChange={() => setTaItems(prev => prev.map(t => t.id === ta.id ? { ...t, taxable: !t.taxable } : t))} className="h-3 w-3" />
                          3.3%
                        </label>
                        <button onClick={() => removeTa(ta.id)} className="text-gray-300 hover:text-black">×</button>
                      </div>
                    ))}
                    {addingTaFor === cls.id ? (
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          placeholder="이름"
                          value={taForm.name}
                          onChange={e => setTaForm(f => ({ ...f, name: e.target.value }))}
                          className="w-[80px] border border-black px-1 py-0.5 text-xs"
                        />
                        <input
                          placeholder="금액"
                          value={taForm.amount}
                          onChange={e => setTaForm(f => ({ ...f, amount: e.target.value }))}
                          className="w-[80px] border border-black px-1 py-0.5 text-xs"
                        />
                        <label className="flex items-center gap-0.5 text-xs text-gray-500">
                          <input type="checkbox" checked={taForm.taxable} onChange={() => setTaForm(f => ({ ...f, taxable: !f.taxable }))} className="h-3 w-3" />
                          3.3%
                        </label>
                        <button onClick={() => handleAddTa(cls.id)} className="border border-black px-1.5 py-0.5 text-xs font-bold">추가</button>
                        <button onClick={() => setAddingTaFor(null)} className="text-xs text-gray-400">취소</button>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingTaFor(cls.id); setTaForm({ name: '', amount: '', taxable: true }); }} className="mt-0.5 text-xs text-gray-400 hover:text-black">
                        + 조교 추가
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 추가 항목 */}
        {extraPayments.map(item => (
          <div key={item.id} className="grid grid-cols-[1fr_100px_50px_100px_100px] items-center border-b border-dashed border-gray-300 px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="border border-gray-400 px-1 text-xs text-gray-500">{item.type}</span>
              <span>{item.name}</span>
            </div>
            <div className="text-right text-sm text-gray-400">
              {item.type === '강좌' ? item.revenue.toLocaleString() : '—'}
            </div>
            <div className="text-center text-sm text-gray-400">
              {item.type === '강좌' ? item.ratio : '—'}
            </div>
            <div className="text-right text-sm text-gray-400">—</div>
            <div className="text-right text-sm font-bold">{item.payment.toLocaleString()}</div>
          </div>
        ))}

        {/* + 항목 추가 */}
        {!isAdding ? (
          <div className="border-b border-gray-200 px-4 py-2">
            <button
              className="text-sm text-gray-500 hover:text-black"
              onClick={() => setIsAdding(true)}
            >
              + 항목 추가
            </button>
          </div>
        ) : (
          <div className="border-b-2 border-black bg-gray-50 px-4 py-3">
            {/* 유형 토글 */}
            <div className="mb-2 flex gap-0">
              {(['고정지급', '강좌'] as const).map(t => (
                <button
                  key={t}
                  className={`px-3 py-1 text-xs ${addForm.type === t ? 'border-2 border-black bg-gray-800 text-white' : 'border-2 border-black -ml-[2px]'}`}
                  onClick={() => setAddForm(f => ({ ...f, type: t }))}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                placeholder="항목명 (예: 진단고사)"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                className="flex-1 border-2 border-black px-2 py-1 text-sm"
              />
              <input
                placeholder="금액"
                value={addForm.revenue}
                onChange={e => setAddForm(f => ({ ...f, revenue: e.target.value }))}
                className="w-[100px] border-2 border-black px-2 py-1 text-sm"
              />
              {addForm.type === '강좌' && (
                <input
                  placeholder="비율"
                  value={addForm.ratio}
                  onChange={e => setAddForm(f => ({ ...f, ratio: e.target.value }))}
                  className="w-[60px] border-2 border-black px-2 py-1 text-center text-sm"
                />
              )}
              <button
                className="border-2 border-black px-3 py-1 text-sm font-bold"
                onClick={handleAddItem}
              >
                추가
              </button>
              <button
                className="border-2 border-gray-400 px-3 py-1 text-sm text-gray-500"
                onClick={() => setIsAdding(false)}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 합계 섹션 */}
        <div className="border-t-2 border-black">
          <div className="grid grid-cols-[1fr_100px] px-4 py-2 text-sm">
            <div className="text-gray-500">총 지급액</div>
            <div className="text-right font-bold">{fmt(totalPayment)}</div>
          </div>
          <div className="grid grid-cols-[1fr_100px] border-t border-gray-200 px-4 py-2 text-sm">
            <div className="text-gray-500">세금공제 (3.3%)</div>
            <div className="text-right text-gray-500">− {fmt(tax)}</div>
          </div>
          <div className="grid grid-cols-[1fr_100px] border-t-2 border-black bg-gray-50 px-4 py-2 text-sm">
            <div className="font-bold">실 지급액</div>
            <div className="text-right font-bold">{fmt(netPayment)}</div>
          </div>
        </div>

        {/* 조교 배분 섹션 */}
        <div className="border-t-2 border-black px-4 py-3">
          <div className="mb-2 text-xs font-bold text-gray-500">조교 배분</div>

          {/* 강좌별 조교 목록 */}
          {taPayments.filter(t => t.classId !== null).map(ta => {
            const clsName = classes.find(c => c.id === ta.classId)?.name ?? '';
            return (
              <div key={ta.id} className="flex items-center gap-2 py-0.5 text-xs">
                <span className="flex-1">{ta.name}</span>
                <span className="border border-gray-300 px-1 text-gray-400">{clsName}</span>
                <span className="text-gray-500">{ta.amount.toLocaleString()}</span>
                {ta.taxable && <span className="text-gray-400">− {(ta.amount - ta.netAmount).toLocaleString()}</span>}
                <span className="font-bold">→ {ta.netAmount.toLocaleString()}</span>
                <button onClick={() => removeTa(ta.id)} className="text-gray-300 hover:text-black">×</button>
              </div>
            );
          })}

          {/* 공통 조교 */}
          <div className="mt-2 border-t border-dashed border-gray-300 pt-2">
            <div className="mb-1 text-xs text-gray-400">공통 조교</div>
            {taPayments.filter(t => t.classId === null).map(ta => (
              <div key={ta.id} className="flex items-center gap-2 py-0.5 text-xs">
                <span className="flex-1">{ta.name}</span>
                <span className="text-gray-500">{ta.amount.toLocaleString()}</span>
                {ta.taxable && <span className="text-gray-400">− {(ta.amount - ta.netAmount).toLocaleString()}</span>}
                <span className="font-bold">→ {ta.netAmount.toLocaleString()}</span>
                <button onClick={() => removeTa(ta.id)} className="text-gray-300 hover:text-black">×</button>
              </div>
            ))}
            {addingTaFor === 'common' ? (
              <div className="mt-1 flex items-center gap-1">
                <input
                  placeholder="이름"
                  value={taForm.name}
                  onChange={e => setTaForm(f => ({ ...f, name: e.target.value }))}
                  className="w-[80px] border border-black px-1 py-0.5 text-xs"
                />
                <input
                  placeholder="금액"
                  value={taForm.amount}
                  onChange={e => setTaForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-[80px] border border-black px-1 py-0.5 text-xs"
                />
                <label className="flex items-center gap-0.5 text-xs text-gray-500">
                  <input type="checkbox" checked={taForm.taxable} onChange={() => setTaForm(f => ({ ...f, taxable: !f.taxable }))} className="h-3 w-3" />
                  3.3%
                </label>
                <button onClick={() => handleAddTa(null)} className="border border-black px-1.5 py-0.5 text-xs font-bold">추가</button>
                <button onClick={() => setAddingTaFor(null)} className="text-xs text-gray-400">취소</button>
              </div>
            ) : (
              <button onClick={() => { setAddingTaFor('common'); setTaForm({ name: '', amount: '', taxable: true }); }} className="mt-0.5 text-xs text-gray-400 hover:text-black">
                + 공통 조교 추가
              </button>
            )}
          </div>
        </div>

        {/* 강사 최종 수령 */}
        <div className="border-t-2 border-black bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-[1fr_120px] text-sm">
            <div className="font-bold">강사 최종 수령</div>
            <div className="text-right font-bold">{fmt(instructorFinal)}</div>
          </div>
          {totalTaPay > 0 && (
            <div className="mt-0.5 text-right text-xs text-gray-400">
              조교 배분 합계 − {fmt(totalTaPay)}
            </div>
          )}
        </div>

        {/* 엑셀 export */}
        <div className="p-4">
          <div className="mb-1 text-right text-xs text-gray-400">강사 + 조교 항목 포함</div>
          <button className="w-full border-2 border-black py-2 text-sm font-bold">
            엑셀 export
          </button>
        </div>
      </div>
    </div>
  );
}
