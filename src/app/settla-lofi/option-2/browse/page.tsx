'use client';

import { useState } from 'react';

type SubView = '조직 단위' | '강사별';
type ClassStatus = '이슈' | '정상';

interface Org {
  id: number;
  name: string;
  classCount: number;
  issueCount: number;
}

interface StudentRow {
  name: string;
  attendanceOk: boolean;
  paid: number;
  unpaid: number;
}

interface ClassItem {
  id: string;
  orgId: number;
  name: string;
  status: ClassStatus;
  detail: {
    totalRevenue: number;
    unpaidAmount: number;
    students: StudentRow[];
  };
}

interface Instructor {
  id: number;
  name: string;
  classCount: number;
}

interface InstructorViewClass {
  id: string;
  name: string;
  schedule: string;
  settledPay: number;
  students: { name: string; attendanceOk: boolean; paid: number; unpaid: number }[];
}

const ORGS: Org[] = [
  { id: 1, name: '조직 A', classCount: 12, issueCount: 3 },
  { id: 2, name: '조직 B', classCount: 8, issueCount: 0 },
  { id: 3, name: '조직 C', classCount: 6, issueCount: 1 },
  { id: 4, name: '조직 D', classCount: 10, issueCount: 2 },
];

const CLASSES: ClassItem[] = [
  {
    id: 'c1', orgId: 1, name: '수업명 A', status: '이슈',
    detail: {
      totalRevenue: 7680000, unpaidAmount: 1280000,
      students: [
        { name: '홍길동', attendanceOk: false, paid: 640000, unpaid: 0 },
        { name: '김철수', attendanceOk: false, paid: 640000, unpaid: 0 },
        { name: '이영희', attendanceOk: false, paid: 0, unpaid: 640000 },
        { name: '박민준', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '최지은', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '정수현', attendanceOk: true, paid: 640000, unpaid: 640000 },
      ],
    },
  },
  {
    id: 'c2', orgId: 1, name: '수업명 B', status: '정상',
    detail: {
      totalRevenue: 5120000, unpaidAmount: 0,
      students: [
        { name: '강서준', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '윤지호', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '임나영', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '한동현', attendanceOk: true, paid: 640000, unpaid: 0 },
      ],
    },
  },
  {
    id: 'c3', orgId: 2, name: '수업명 C', status: '정상',
    detail: {
      totalRevenue: 9600000, unpaidAmount: 640000,
      students: [
        { name: '고은서', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '김동규', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '나현주', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '문지원', attendanceOk: true, paid: 0, unpaid: 640000 },
        { name: '배성민', attendanceOk: true, paid: 640000, unpaid: 0 },
      ],
    },
  },
  {
    id: 'c4', orgId: 3, name: '수업명 D', status: '이슈',
    detail: {
      totalRevenue: 6400000, unpaidAmount: 1280000,
      students: [
        { name: '서다은', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '오준혁', attendanceOk: false, paid: 0, unpaid: 640000 },
        { name: '장유진', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '채민서', attendanceOk: true, paid: 0, unpaid: 640000 },
      ],
    },
  },
];

const INSTRUCTORS: Instructor[] = [
  { id: 1, name: '김명훈T', classCount: 5 },
  { id: 2, name: '강사 B', classCount: 3 },
  { id: 3, name: '강사 C', classCount: 4 },
];

const INSTRUCTOR_VIEW_CLASSES: Record<number, InstructorViewClass[]> = {
  1: [
    // 납입 1,920,000 × 0.6 = 1,152,000
    { id: 'iv1', name: '과합한성물리A', schedule: '토·화', settledPay: 1152000,
      students: [
        { name: '강서윤', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '강윤지', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '고준형', attendanceOk: false, paid: 640000, unpaid: 0 },
        { name: '김다율', attendanceOk: true, paid: 0, unpaid: 640000 },
      ],
    },
    // 납입 1,792,000 × 0.6 = 1,075,200
    { id: 'iv2', name: '과합한성물리B', schedule: '일·화', settledPay: 1075200,
      students: [
        { name: '고은서', attendanceOk: true, paid: 576000, unpaid: 0 },
        { name: '고은찬', attendanceOk: true, paid: 576000, unpaid: 0 },
        { name: '김동규', attendanceOk: true, paid: 640000, unpaid: 0 },
      ],
    },
    // 납입 1,360,000 × 0.7 = 952,000
    { id: 'iv3', name: '한성2물리', schedule: '월·금', settledPay: 952000,
      students: [
        { name: '강서준', attendanceOk: true, paid: 320000, unpaid: 0 },
        { name: '김나현', attendanceOk: true, paid: 560000, unpaid: 0 },
        { name: '김도영', attendanceOk: false, paid: 480000, unpaid: 0 },
      ],
    },
    // 납입 1,737,600 × 0.7 = 1,216,320
    { id: 'iv4', name: '한성3물리', schedule: '일·수', settledPay: 1216320,
      students: [
        { name: '김연조', attendanceOk: true, paid: 560000, unpaid: 0 },
        { name: '김은서', attendanceOk: true, paid: 560000, unpaid: 0 },
        { name: '전월미납 학생', attendanceOk: true, paid: 617600, unpaid: 0 },
      ],
    },
    // 납입 640,000 × 0.6 = 384,000
    { id: 'iv5', name: '과합물리특강', schedule: '월', settledPay: 384000,
      students: [
        { name: '강윤지', attendanceOk: true, paid: 320000, unpaid: 0 },
        { name: '고준형', attendanceOk: true, paid: 320000, unpaid: 0 },
      ],
    },
  ],
  2: [
    // 납입 480,000 × 0.6 = 288,000
    { id: 'iv6', name: '수업명 X', schedule: '화·목', settledPay: 288000,
      students: [
        { name: '학생 A', attendanceOk: true, paid: 480000, unpaid: 0 },
        { name: '학생 B', attendanceOk: false, paid: 0, unpaid: 480000 },
      ],
    },
    // 납입 960,000 × 0.6 = 576,000
    { id: 'iv7', name: '수업명 Y', schedule: '월·수', settledPay: 576000,
      students: [
        { name: '학생 C', attendanceOk: true, paid: 480000, unpaid: 0 },
        { name: '학생 D', attendanceOk: true, paid: 480000, unpaid: 0 },
      ],
    },
    // 납입 320,000 × 0.6 = 192,000
    { id: 'iv8', name: '수업명 Z', schedule: '금', settledPay: 192000,
      students: [
        { name: '학생 E', attendanceOk: true, paid: 320000, unpaid: 0 },
      ],
    },
  ],
  3: [
    // 납입 1,280,000 × 0.65 = 832,000
    { id: 'iv9', name: '수업명 P', schedule: '토', settledPay: 832000,
      students: [
        { name: '학생 F', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '학생 G', attendanceOk: true, paid: 640000, unpaid: 0 },
        { name: '학생 H', attendanceOk: false, paid: 0, unpaid: 640000 },
      ],
    },
    // 납입 1,120,000 × 0.65 = 728,000
    { id: 'iv10', name: '수업명 Q', schedule: '화·목', settledPay: 728000,
      students: [
        { name: '학생 I', attendanceOk: true, paid: 560000, unpaid: 0 },
        { name: '학생 J', attendanceOk: true, paid: 560000, unpaid: 0 },
      ],
    },
    // 납입 480,000 × 0.65 = 312,000
    { id: 'iv11', name: '수업명 R', schedule: '수', settledPay: 312000,
      students: [
        { name: '학생 K', attendanceOk: true, paid: 480000, unpaid: 0 },
      ],
    },
    // 납입 320,000 × 0.65 = 208,000
    { id: 'iv12', name: '수업명 S', schedule: '월', settledPay: 208000,
      students: [
        { name: '학생 L', attendanceOk: true, paid: 320000, unpaid: 0 },
      ],
    },
  ],
};

function formatMonth(year: number, month: number) {
  return `${year}년 ${String(month).padStart(2, '0')}월`;
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export default function BrowsePage() {
  const [subView, setSubView] = useState<SubView>('조직 단위');
  const [ymState, setYmState] = useState({ year: 2026, month: 4 });

  // 조직 단위
  const [checkedOrgIds, setCheckedOrgIds] = useState<number[]>([]);
  const [viewResult, setViewResult] = useState<number[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // 강사별
  const [selectedInstructorId, setSelectedInstructorId] = useState<number>(INSTRUCTORS[0].id);

  function toggleOrg(id: number) {
    setCheckedOrgIds(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]);
  }

  function toggleClass(id: string) {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const viewClasses = viewResult.length > 0 ? CLASSES.filter(c => viewResult.includes(c.orgId)) : [];

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
        <div className="flex flex-1 overflow-hidden">
          {/* 좌측: 조직 체크박스 목록 */}
          <aside className="flex w-[260px] shrink-0 flex-col overflow-hidden border-r-2 border-black">
            <div className="border-b-2 border-black px-4 py-2 text-xs text-gray-500">
              조직 선택 (복수 가능)
            </div>
            <div className="flex-1 overflow-y-auto">
              {ORGS.map(org => (
                <label key={org.id} className="flex cursor-pointer items-start gap-2 border-b border-gray-200 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={checkedOrgIds.includes(org.id)}
                    onChange={() => toggleOrg(org.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-bold">{org.name}</div>
                    <div className="text-xs text-gray-500">
                      수업 {org.classCount}개
                      {org.issueCount > 0 && <span className="ml-1">· 이슈 {org.issueCount}건</span>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="border-t-2 border-black p-3">
              <button
                className="w-full border-2 border-black py-2 text-sm font-bold disabled:text-gray-400"
                disabled={checkedOrgIds.length === 0}
                onClick={() => { setViewResult(checkedOrgIds); setExpandedClasses(new Set()); }}
              >
                조회하기 ({checkedOrgIds.length})
              </button>
            </div>
          </aside>

          {/* 우측: 조회 결과 */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {viewResult.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                조직을 선택하고 조회하기를 누르세요
              </div>
            ) : (
              <>
                <div className="flex gap-0 overflow-x-auto border-b-2 border-black">
                  {ORGS.filter(o => viewResult.includes(o.id)).map(org => (
                    <div key={org.id} className="shrink-0 border-r-2 border-black px-4 py-2">
                      <div className="text-xs font-bold">{org.name}</div>
                      <div className="text-xs text-gray-500">수업 {org.classCount} · 이슈 {org.issueCount}</div>
                    </div>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <div className="mb-2 text-xs text-gray-500">
                    수업 {viewClasses.length}개 (선택 조직 {viewResult.length}개)
                  </div>
                  <div>
                    {viewClasses.map(cls => {
                      const org = ORGS.find(o => o.id === cls.orgId)!;
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
                              <span className="border border-gray-300 px-1 text-xs text-gray-500">{org.name}</span>
                            </div>
                            <span className={`border px-2 py-0.5 text-xs ${cls.status === '이슈' ? 'border-black font-bold' : 'border-gray-300 text-gray-400'}`}>
                              {cls.status}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="border-t-2 border-black p-4">
                              <ClassDetailGrid detail={cls.detail} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      ) : (
        /* 강사별 */
        <div className="flex flex-1 overflow-hidden">
          <aside className="flex w-[260px] shrink-0 flex-col overflow-hidden border-r-2 border-black">
            <div className="border-b-2 border-black px-4 py-2 text-xs text-gray-500">강사 선택</div>
            <div className="flex-1 overflow-y-auto">
              {INSTRUCTORS.map(inst => (
                <label key={inst.id} className="flex cursor-pointer items-start gap-2 border-b border-gray-200 px-4 py-3">
                  <input
                    type="radio"
                    name="instructor"
                    checked={selectedInstructorId === inst.id}
                    onChange={() => setSelectedInstructorId(inst.id)}
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
            <InstructorHistoryPanel
              instructor={INSTRUCTORS.find(i => i.id === selectedInstructorId)!}
              classes={INSTRUCTOR_VIEW_CLASSES[selectedInstructorId] ?? []}
              month={formatMonth(ymState.year, ymState.month)}
            />
          </main>
        </div>
      )}
    </div>
  );
}

function InstructorHistoryPanel({ instructor, classes, month }: {
  instructor: Instructor;
  classes: InstructorViewClass[];
  month: string;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const totalStudents = classes.reduce((s, c) => s + c.students.length, 0);
  const totalPaid = classes.reduce((s, c) => s + c.students.reduce((ss, st) => ss + st.paid, 0), 0);
  const totalUnpaid = classes.reduce((s, c) => s + c.students.reduce((ss, st) => ss + st.unpaid, 0), 0);
  const totalSettled = classes.reduce((s, c) => s + c.settledPay, 0);
  const attendanceMissing = classes.reduce((s, c) => s + c.students.filter(st => !st.attendanceOk).length, 0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 강사 헤더 + 요약 */}
      <div className="border-b-2 border-black px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-bold">{instructor.name}</div>
          <div className="border-2 border-black bg-gray-800 px-3 py-1 text-xs text-white">
            확정 지급 {totalSettled.toLocaleString('ko-KR')}원
          </div>
        </div>
        <div className="mt-3 flex gap-0">
          {[
            { label: '수업', value: `${classes.length}개` },
            { label: '수강생', value: `${totalStudents}명` },
            { label: '출결 누락', value: `${attendanceMissing}명`, warn: attendanceMissing > 0 },
            { label: '총 납입', value: `${totalPaid.toLocaleString('ko-KR')}원` },
            { label: '미납', value: totalUnpaid > 0 ? `${totalUnpaid.toLocaleString('ko-KR')}원` : '없음', warn: totalUnpaid > 0 },
          ].map((item, i) => (
            <div key={i} className="border-r border-gray-200 pr-4 mr-4 last:border-0 last:mr-0">
              <div className="text-xs text-gray-400">{item.label}</div>
              <div className={`text-sm font-bold ${item.warn ? '' : 'text-black'}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 수업 목록 */}
      <div className="flex-1 overflow-y-auto">
        {classes.map(cls => {
          const isExpanded = expandedIds.has(cls.id);
          const clsMissing = cls.students.filter(s => !s.attendanceOk).length;
          const clsUnpaid = cls.students.filter(s => s.unpaid > 0).length;
          const clsPaid = cls.students.reduce((s, st) => s + st.paid, 0);

          return (
            <div key={cls.id} className="border-b border-gray-200">
              <button
                className="flex w-full items-center justify-between px-6 py-3 text-left hover:bg-gray-50"
                onClick={() => toggle(cls.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-300">{isExpanded ? '▼' : '▶'}</span>
                  <div>
                    <span className="text-sm font-bold">{cls.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{cls.schedule}</span>
                  </div>
                  <div className="flex gap-1">
                    {clsMissing > 0 && <span className="border border-black px-1.5 text-xs">출결 누락 {clsMissing}</span>}
                    {clsUnpaid > 0 && <span className="border border-black px-1.5 text-xs">미납 {clsUnpaid}명</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">납입 {clsPaid.toLocaleString('ko-KR')}</div>
                  <div className="text-xs font-bold">지급 {cls.settledPay.toLocaleString('ko-KR')}</div>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-8 py-2">
                  <div className="grid grid-cols-[1fr_50px_80px_80px] py-1 text-xs text-gray-400">
                    <div>학생명</div><div className="text-center">출결</div>
                    <div className="text-right">납입금</div><div className="text-right">미납금</div>
                  </div>
                  {cls.students.map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_50px_80px_80px] py-0.5 text-xs">
                      <div>{s.name}</div>
                      <div className={`text-center ${s.attendanceOk ? 'text-gray-300' : 'font-bold'}`}>
                        {s.attendanceOk ? '정상' : '누락'}
                      </div>
                      <div className="text-right">{s.paid.toLocaleString('ko-KR')}</div>
                      <div className={`text-right ${s.unpaid > 0 ? 'font-bold' : 'text-gray-300'}`}>
                        {s.unpaid > 0 ? s.unpaid.toLocaleString('ko-KR') : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClassDetailGrid({ detail }: { detail: ClassItem['detail'] }) {
  const attendanceOkCount = detail.students.filter(s => s.attendanceOk).length;
  const paidOkCount = detail.students.filter(s => s.unpaid === 0).length;

  return (
    <div>
      {/* 요약 */}
      <div className="mb-3 flex gap-4 text-xs text-gray-500">
        <span>수강생 <strong className="text-black">{detail.students.length}명</strong></span>
        <span>출결 정상 <strong className="text-black">{attendanceOkCount}명</strong></span>
        <span>완납 <strong className="text-black">{paidOkCount}명</strong></span>
        <span>총 납입금 <strong className="text-black">{detail.totalRevenue.toLocaleString('ko-KR')}원</strong></span>
        {detail.unpaidAmount > 0 && (
          <span>미납금 <strong className="text-black">{detail.unpaidAmount.toLocaleString('ko-KR')}원</strong></span>
        )}
      </div>

      {/* 학생별 납입 현황 */}
      <div className="mt-2 grid grid-cols-2 gap-0 border-t border-gray-200 text-sm">
        {detail.students.map((s, i) => (
          <>
            <div key={`name-${i}`} className="py-1 text-gray-500">{s.name}</div>
            <div key={`val-${i}`} className="py-1 text-right">
              {s.paid.toLocaleString('ko-KR')}
              {s.unpaid > 0 && <span className="ml-1 font-bold text-black"> / 미납 {s.unpaid.toLocaleString('ko-KR')}</span>}
            </div>
          </>
        ))}
      </div>
    </div>
  );
}
