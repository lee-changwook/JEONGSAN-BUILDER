'use client';

import { useState } from 'react';

type SubView = '조직 단위' | '지급 대상별';
type ClassStatus = '이슈' | '정상';
type PayoutType = '강사' | '행정팀' | '월급제';
type OrgValidationStatus = '미업로드' | '검토중' | '수정 필요' | '승인 완료';

interface Org {
  id: number;
  name: string;
  classCount: number;
  issueCount: number;
  validationStatus: OrgValidationStatus;
  uploadedAt: string;
  uploader: string;
}

interface StudentRow {
  name: string;
  attendanceOk: boolean;
  paid: number;
  unpaid: number;
  monthlyAttendance: number;
}

interface ClassItem {
  id: string;
  orgId: number;
  targetIds: number[];
  name: string;
  status: ClassStatus;
  detail: {
    totalRevenue: number;
    unpaidAmount: number;
    students: StudentRow[];
  };
}

interface PayoutTarget {
  id: number;
  name: string;
  type: PayoutType;
  classCount: number;
  orgName: string;
  settleStatus: '정산 전' | '작성중' | '확정본 있음';
}

interface SettleClass {
  id: string;
  name: string;
  schedule: string;
  revenue: number;
  ratio: number;
  hours: number;
  students: {
    name: string;
    monthlyAttendance: number;
    paid: number;
    unpaid: number;
    pay: number;
  }[];
}

interface ExtraItem {
  id: string;
  name: string;
  type: '고정지급' | '보정';
  amount: number;
}

interface AssistantItem {
  id: string;
  name: string;
  amount: number;
  taxable: boolean;
  classId: string | null;
}

const CURRENT_YM = { year: 2026, month: 4 };

const ORGS: Org[] = [
  { id: 1, name: '조직 A', classCount: 12, issueCount: 3, validationStatus: '검토중', uploadedAt: '2026-04-05 14:30', uploader: '조직 A 운영' },
  { id: 2, name: '조직 B', classCount: 8, issueCount: 0, validationStatus: '수정 필요', uploadedAt: '2026-04-06 11:10', uploader: '조직 B 운영' },
  { id: 3, name: '조직 C', classCount: 6, issueCount: 1, validationStatus: '승인 완료', uploadedAt: '2026-04-04 17:20', uploader: '조직 C 운영' },
  { id: 4, name: '조직 D', classCount: 10, issueCount: 2, validationStatus: '미업로드', uploadedAt: '—', uploader: '—' },
];

const PREVIOUS_MONTH_ORGS: Org[] = ORGS.map(org => ({
  ...org,
  issueCount: 0,
  validationStatus: '승인 완료',
  uploadedAt: '2026-03-31 18:00',
}));

const CLASSES: ClassItem[] = [
  {
    id: 'c1',
    orgId: 1,
    targetIds: [1],
    name: '수업명 A',
    status: '이슈',
    detail: {
      totalRevenue: 7680000,
      unpaidAmount: 1280000,
      students: [
        { name: '홍길동', attendanceOk: false, paid: 640000, unpaid: 0, monthlyAttendance: 5 },
        { name: '김철수', attendanceOk: false, paid: 640000, unpaid: 0, monthlyAttendance: 4 },
        { name: '이영희', attendanceOk: false, paid: 0, unpaid: 640000, monthlyAttendance: 3 },
        { name: '박민준', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
        { name: '최지은', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
        { name: '정수현', attendanceOk: true, paid: 640000, unpaid: 640000, monthlyAttendance: 7 },
      ],
    },
  },
  {
    id: 'c2',
    orgId: 1,
    targetIds: [1],
    name: '수업명 B',
    status: '정상',
    detail: {
      totalRevenue: 5120000,
      unpaidAmount: 0,
      students: [
        { name: '강서준', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
        { name: '윤지호', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
        { name: '임나영', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
        { name: '한동현', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
      ],
    },
  },
  {
    id: 'c3',
    orgId: 2,
    targetIds: [2],
    name: '수업명 C',
    status: '정상',
    detail: {
      totalRevenue: 9600000,
      unpaidAmount: 640000,
      students: [
        { name: '고은서', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
        { name: '김동규', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
        { name: '나현주', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
        { name: '문지원', attendanceOk: true, paid: 0, unpaid: 640000, monthlyAttendance: 7 },
        { name: '배성민', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
      ],
    },
  },
  {
    id: 'c4',
    orgId: 3,
    targetIds: [3],
    name: '수업명 D',
    status: '이슈',
    detail: {
      totalRevenue: 6400000,
      unpaidAmount: 1280000,
      students: [
        { name: '서다은', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
        { name: '오준혁', attendanceOk: false, paid: 0, unpaid: 640000, monthlyAttendance: 4 },
        { name: '장유진', attendanceOk: true, paid: 640000, unpaid: 0, monthlyAttendance: 8 },
        { name: '채민서', attendanceOk: true, paid: 0, unpaid: 640000, monthlyAttendance: 6 },
      ],
    },
  },
];

const INITIAL_PAYOUT_TARGETS: PayoutTarget[] = [
  { id: 1, name: '김명훈T', type: '강사', classCount: 2, orgName: '조직 A', settleStatus: '작성중' },
  { id: 2, name: '강사 B', type: '강사', classCount: 1, orgName: '조직 B', settleStatus: '정산 전' },
  { id: 3, name: '강사 C', type: '강사', classCount: 1, orgName: '조직 C', settleStatus: '확정본 있음' },
  { id: 4, name: '박행정', type: '행정팀', classCount: 0, orgName: '운영 공통', settleStatus: '정산 전' },
  { id: 5, name: '정월급', type: '월급제', classCount: 0, orgName: '운영 공통', settleStatus: '작성중' },
];

const PREVIOUS_MONTH_PAYOUT_TARGETS: PayoutTarget[] = INITIAL_PAYOUT_TARGETS.map(target => ({
  ...target,
  settleStatus: '확정본 있음',
}));

const SETTLE_CLASSES_BY_TARGET: Record<number, SettleClass[]> = {
  1: [
    {
      id: 'sc1',
      name: '과합한성물리A',
      schedule: '토·화',
      revenue: 1920000,
      ratio: 0.6,
      hours: 8,
      students: [
        { name: '강서윤', monthlyAttendance: 8, paid: 640000, unpaid: 0, pay: 384000 },
        { name: '강윤지', monthlyAttendance: 8, paid: 640000, unpaid: 0, pay: 384000 },
        { name: '고준형', monthlyAttendance: 5, paid: 640000, unpaid: 0, pay: 384000 },
      ],
    },
    {
      id: 'sc2',
      name: '과합물리특강',
      schedule: '월',
      revenue: 640000,
      ratio: 0.6,
      hours: 4,
      students: [
        { name: '고준형', monthlyAttendance: 4, paid: 320000, unpaid: 0, pay: 192000 },
        { name: '김다율', monthlyAttendance: 4, paid: 320000, unpaid: 0, pay: 192000 },
      ],
    },
  ],
  2: [
    {
      id: 'sc3',
      name: '수업명 C',
      schedule: '화·목',
      revenue: 960000,
      ratio: 0.6,
      hours: 8,
      students: [
        { name: '학생 A', monthlyAttendance: 8, paid: 480000, unpaid: 0, pay: 288000 },
        { name: '학생 B', monthlyAttendance: 6, paid: 480000, unpaid: 0, pay: 288000 },
      ],
    },
  ],
  3: [
    {
      id: 'sc4',
      name: '수업명 D',
      schedule: '토',
      revenue: 1280000,
      ratio: 0.65,
      hours: 8,
      students: [
        { name: '학생 F', monthlyAttendance: 8, paid: 640000, unpaid: 0, pay: 416000 },
        { name: '학생 G', monthlyAttendance: 8, paid: 640000, unpaid: 0, pay: 416000 },
      ],
    },
  ],
  4: [],
  5: [],
};

const INITIAL_EXTRA_ITEMS: Record<number, ExtraItem[]> = {
  4: [{ id: 'extra-4-1', name: '행정 운영비', type: '고정지급', amount: 900000 }],
  5: [{ id: 'extra-5-1', name: '월급 기본급', type: '고정지급', amount: 2800000 }],
};

const INITIAL_ASSISTANTS: Record<number, AssistantItem[]> = {
  1: [{ id: 'ta-1', name: '박조교', amount: 300000, taxable: true, classId: 'sc1' }],
  5: [{ id: 'ta-5', name: '공통조교A', amount: 250000, taxable: false, classId: null }],
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

function compareMonth(a: { year: number; month: number }, b: { year: number; month: number }) {
  return a.year === b.year ? a.month - b.month : a.year - b.year;
}

function won(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}

export default function BrowsePage() {
  const [subView, setSubView] = useState<SubView>('조직 단위');
  const [ymState, setYmState] = useState(CURRENT_YM);
  const [orgStatuses, setOrgStatuses] = useState<Record<number, OrgValidationStatus>>(
    Object.fromEntries(ORGS.map(org => [org.id, org.validationStatus])),
  );
  const [checkedOrgIds, setCheckedOrgIds] = useState<number[]>([]);
  const [viewResult, setViewResult] = useState<number[]>([]);
  const [selectedReviewedOrgId, setSelectedReviewedOrgId] = useState<number>(ORGS[0].id);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [payoutTargetsState, setPayoutTargetsState] = useState<PayoutTarget[]>(INITIAL_PAYOUT_TARGETS);
  const [selectedTargetId, setSelectedTargetId] = useState<number>(INITIAL_PAYOUT_TARGETS[0].id);
  const [settleMode, setSettleMode] = useState(false);
  const [expandedSettleClasses, setExpandedSettleClasses] = useState<Set<string>>(new Set());
  const [ratioOverrides, setRatioOverrides] = useState<Record<string, string>>({});
  const [extraItemsByTarget, setExtraItemsByTarget] = useState<Record<number, ExtraItem[]>>(INITIAL_EXTRA_ITEMS);
  const [assistantsByTarget, setAssistantsByTarget] = useState<Record<number, AssistantItem[]>>(INITIAL_ASSISTANTS);

  const monthCompare = compareMonth(ymState, CURRENT_YM);
  const isCurrentMonth = monthCompare === 0;
  const canGoNextMonth = monthCompare < 0;
  const settleActionLabel = monthCompare === 0 ? '당월 정산하기' : '정산 보러가기';

  const orgsWithStatus = isCurrentMonth
    ? ORGS.map(org => ({ ...org, validationStatus: orgStatuses[org.id] ?? org.validationStatus }))
    : PREVIOUS_MONTH_ORGS;
  const payoutTargets = isCurrentMonth ? payoutTargetsState : PREVIOUS_MONTH_PAYOUT_TARGETS;
  const approvedOrgCount = orgsWithStatus.filter(org => org.validationStatus === '승인 완료').length;
  const reviewableOrgCount = orgsWithStatus.filter(org => org.validationStatus !== '미업로드').length;
  const canOpenSettlement = monthCompare !== 0 || approvedOrgCount === orgsWithStatus.length;
  const selectedReviewedOrg = orgsWithStatus.find(org => org.id === selectedReviewedOrgId) ?? orgsWithStatus[0];
  const viewClasses = viewResult.length > 0
    ? CLASSES.filter(c => c.orgId === selectedReviewedOrgId && viewResult.includes(c.orgId))
    : [];
  const selectedTarget = payoutTargets.find(target => target.id === selectedTargetId) ?? payoutTargets[0];
  const selectedSettleClasses = SETTLE_CLASSES_BY_TARGET[selectedTargetId] ?? [];

  function changeMonth(direction: 'prev' | 'next') {
    if (direction === 'next' && !canGoNextMonth) return;

    const nextYm = direction === 'prev'
      ? prevMonth(ymState.year, ymState.month)
      : nextMonth(ymState.year, ymState.month);

    setYmState(nextYm);
    setCheckedOrgIds([]);
    setViewResult([]);
    setSelectedReviewedOrgId(orgsWithStatus[0].id);
    setExpandedClasses(new Set());
    setSettleMode(false);
    setExpandedSettleClasses(new Set());
  }

  function toggleOrg(id: number) {
    setCheckedOrgIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  }

  function toggleBrowseClass(id: string) {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSettleClass(id: string) {
    setExpandedSettleClasses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleOpenSettlement(targetId?: number) {
    if (!canOpenSettlement) return;
    setSettleMode(true);
    if (targetId) setSelectedTargetId(targetId);
  }

  function updateOrgStatus(orgId: number, status: OrgValidationStatus) {
    setOrgStatuses(prev => ({ ...prev, [orgId]: status }));
  }

  function handleRatioChange(classId: string, value: string) {
    setRatioOverrides(prev => ({ ...prev, [classId]: value }));
  }

  function addExtraItem(targetId: number, item: ExtraItem) {
    setExtraItemsByTarget(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] ?? []), item],
    }));
  }

  function addAssistant(targetId: number, item: AssistantItem) {
    setAssistantsByTarget(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] ?? []), item],
    }));
  }

  function removeAssistant(targetId: number, assistantId: string) {
    setAssistantsByTarget(prev => ({
      ...prev,
      [targetId]: (prev[targetId] ?? []).filter(item => item.id !== assistantId),
    }));
  }

  function addPayoutTarget(input: { name: string; type: PayoutType; orgName: string }) {
    const id = Date.now();
    const nextTarget: PayoutTarget = {
      id,
      name: input.name,
      type: input.type,
      classCount: 0,
      orgName: input.orgName,
      settleStatus: '정산 전',
    };

    setPayoutTargetsState(prev => [...prev, nextTarget]);
    setSelectedTargetId(id);
    setSettleMode(false);
    setExtraItemsByTarget(prev => ({ ...prev, [id]: [] }));
    setAssistantsByTarget(prev => ({ ...prev, [id]: [] }));
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 border-b-2 border-black px-4 py-2">
        <div className="flex items-center gap-1">
          <button
            className="border-2 border-black px-2 py-0.5 text-sm font-bold"
            onClick={() => changeMonth('prev')}
          >
            ‹
          </button>
          <span className="min-w-[90px] text-center text-sm font-bold">
            {formatMonth(ymState.year, ymState.month)}
          </span>
          <button
            className="border-2 border-black px-2 py-0.5 text-sm font-bold disabled:border-gray-300 disabled:text-gray-300"
            onClick={() => changeMonth('next')}
            disabled={!canGoNextMonth}
          >
            ›
          </button>
        </div>

        <div className="flex gap-0">
          {(['조직 단위', '지급 대상별'] as SubView[]).map(view => (
            <button
              key={view}
              className={`px-4 py-1 text-sm ${
                subView === view ? 'border-2 border-black bg-gray-800 text-white' : 'border-2 border-black -ml-[2px]'
              }`}
              onClick={() => setSubView(view)}
            >
              {view}
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs text-gray-500">
          {monthCompare === 0 ? '지급 대상별에서 바로 당월 정산 시작 가능' : '지급 대상별에서 확정된 정산안 열람'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b-2 border-black bg-gray-50 px-4 py-2 text-xs lg:grid-cols-4">
        <div>
          <div className="text-gray-400">이번 달 조직 업로드</div>
          <div className="font-bold">{reviewableOrgCount}/{orgsWithStatus.length}개</div>
        </div>
        <div>
          <div className="text-gray-400">승인 완료</div>
          <div className="font-bold">{approvedOrgCount}/{orgsWithStatus.length}개</div>
        </div>
        <div>
          <div className="text-gray-400">당월 정산 가능</div>
          <div className="font-bold">{canOpenSettlement ? '가능' : '대기중'}</div>
        </div>
        <div>
          <div className="text-gray-400">정산 기준</div>
          <div className="font-bold">{monthCompare === 0 ? '승인된 당월 데이터' : '확정본 열람'}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {subView === '조직 단위' ? (
          <OrgBrowsePanel
            checkedOrgIds={checkedOrgIds}
            expandedClasses={expandedClasses}
            orgs={orgsWithStatus}
            selectedReviewedOrg={selectedReviewedOrg}
            viewClasses={viewClasses}
            viewResult={viewResult}
            onToggleOrg={toggleOrg}
            onSelectReviewedOrg={setSelectedReviewedOrgId}
            onToggleClass={toggleBrowseClass}
            onView={() => {
              setViewResult(checkedOrgIds);
              setSelectedReviewedOrgId(checkedOrgIds[0] ?? orgsWithStatus[0].id);
              setExpandedClasses(new Set());
            }}
            onApproveOrg={orgId => updateOrgStatus(orgId, '승인 완료')}
            onRequestRevision={orgId => updateOrgStatus(orgId, '수정 필요')}
            monthLabel={formatMonth(ymState.year, ymState.month)}
            isCurrentMonth={isCurrentMonth}
          />
        ) : settleMode ? (
          <SettlementPanel
            monthCompare={monthCompare}
            monthLabel={formatMonth(ymState.year, ymState.month)}
            target={selectedTarget}
            targets={payoutTargets}
            canOpenSettlement={canOpenSettlement}
            approvedOrgCount={approvedOrgCount}
            totalOrgCount={orgsWithStatus.length}
            classes={selectedSettleClasses}
            expandedClasses={expandedSettleClasses}
            ratioOverrides={ratioOverrides}
            assistants={assistantsByTarget[selectedTargetId] ?? []}
            extraItems={extraItemsByTarget[selectedTargetId] ?? []}
            onSelectTarget={id => {
              setSelectedTargetId(id);
              setExpandedSettleClasses(new Set());
            }}
            onBack={() => setSettleMode(false)}
            onToggleClass={toggleSettleClass}
            onRatioChange={handleRatioChange}
            onAddExtraItem={item => addExtraItem(selectedTargetId, item)}
            onAddAssistant={item => addAssistant(selectedTargetId, item)}
            onRemoveAssistant={assistantId => removeAssistant(selectedTargetId, assistantId)}
            isCurrentMonth={isCurrentMonth}
          />
        ) : (
          <TargetBrowsePanel
            monthLabel={formatMonth(ymState.year, ymState.month)}
            selectedTargetId={selectedTargetId}
            targets={payoutTargets}
            onSelectTarget={setSelectedTargetId}
            onSettleAction={handleOpenSettlement}
            settleActionLabel={settleActionLabel}
            canOpenSettlement={canOpenSettlement}
            approvedOrgCount={approvedOrgCount}
            totalOrgCount={orgsWithStatus.length}
            onAddTarget={addPayoutTarget}
            isCurrentMonth={isCurrentMonth}
          />
        )}
      </div>
    </div>
  );
}

function OrgBrowsePanel({
  checkedOrgIds,
  expandedClasses,
  orgs,
  selectedReviewedOrg,
  viewClasses,
  viewResult,
  onToggleOrg,
  onSelectReviewedOrg,
  onToggleClass,
  onView,
  onApproveOrg,
  onRequestRevision,
  monthLabel,
  isCurrentMonth,
}: {
  checkedOrgIds: number[];
  expandedClasses: Set<string>;
  orgs: Org[];
  selectedReviewedOrg: Org;
  viewClasses: ClassItem[];
  viewResult: number[];
  onToggleOrg: (id: number) => void;
  onSelectReviewedOrg: (id: number) => void;
  onToggleClass: (id: string) => void;
  onView: () => void;
  onApproveOrg: (orgId: number) => void;
  onRequestRevision: (orgId: number) => void;
  monthLabel: string;
  isCurrentMonth: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <aside className="flex w-[260px] shrink-0 flex-col overflow-hidden border-r-2 border-black">
        <div className="border-b-2 border-black px-4 py-2 text-xs text-gray-500">조직 선택 (복수 가능)</div>
        <div className="flex-1 overflow-y-auto">
          {orgs.map(org => (
            <div key={org.id} className={`border-b border-gray-200 px-4 py-3 ${selectedReviewedOrg.id === org.id ? 'bg-gray-50' : ''}`}>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={checkedOrgIds.includes(org.id)}
                  onChange={() => onToggleOrg(org.id)}
                  className="mt-0.5"
                />
                <button className="min-w-0 flex-1 text-left" onClick={() => onSelectReviewedOrg(org.id)}>
                  <div className="text-sm font-bold">{org.name}</div>
                  <div className="text-xs text-gray-500">
                    수업 {org.classCount}개
                    {org.issueCount > 0 && <span className="ml-1">· 이슈 {org.issueCount}건</span>}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-400">{org.validationStatus}</div>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t-2 border-black p-3">
          <button
            className="w-full border-2 border-black py-2 text-sm font-bold disabled:text-gray-400"
            disabled={checkedOrgIds.length === 0}
            onClick={onView}
          >
            조회하기 ({checkedOrgIds.length})
          </button>
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {viewResult.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            조직을 선택하고 조회하기를 누르세요
          </div>
        ) : (
          <>
            <div className="border-b-2 border-black px-4 py-3">
              <div>
                <div className="text-sm font-bold">{monthLabel} 조직 데이터 검토</div>
                <div className="text-xs text-gray-500">
                  선택 조직 {viewResult.length}개 · 조직별 업로드 데이터를 검토하고 승인한 뒤 정산으로 연결
                </div>
              </div>
            </div>

            <div className="flex gap-0 overflow-x-auto border-b-2 border-black">
              {orgs.filter(org => viewResult.includes(org.id)).map(org => (
                <button
                  key={org.id}
                  className={`shrink-0 border-r-2 border-black px-4 py-2 text-left ${selectedReviewedOrg.id === org.id ? 'bg-gray-100' : ''}`}
                  onClick={() => onSelectReviewedOrg(org.id)}
                >
                  <div className="text-xs font-bold">{org.name}</div>
                  <div className="text-xs text-gray-500">수업 {org.classCount} · 이슈 {org.issueCount}</div>
                  <div className="text-[11px] text-gray-400">{org.validationStatus}</div>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="mb-3 border-2 border-black p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold">{selectedReviewedOrg.name}</span>
                      <OrgStatusBadge status={selectedReviewedOrg.validationStatus} />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      업로드 {selectedReviewedOrg.uploadedAt} · 업로더 {selectedReviewedOrg.uploader}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      이슈 {selectedReviewedOrg.issueCount}건 · 승인된 조직 데이터만 지급 대상별 정산에 반영
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isCurrentMonth ? (
                      <>
                        <button className="border-2 border-gray-400 px-3 py-1 text-sm text-gray-600" onClick={() => onRequestRevision(selectedReviewedOrg.id)}>
                          수정 요청
                        </button>
                        <button className="border-2 border-black px-3 py-1 text-sm font-bold" onClick={() => onApproveOrg(selectedReviewedOrg.id)}>
                          승인
                        </button>
                      </>
                    ) : (
                      <div className="border border-gray-300 px-3 py-1 text-sm text-gray-500">
                        전달 확정본
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-2 text-xs text-gray-500">{selectedReviewedOrg.name} 수업 {viewClasses.length}개</div>
              {viewClasses.map(cls => {
                const org = orgs.find(item => item.id === cls.orgId)!;
                const expanded = expandedClasses.has(cls.id);
                return (
                  <div key={cls.id} className="border-2 border-black -mt-[2px]">
                    <button
                      className="flex w-full items-center justify-between bg-gray-50 px-4 py-2 text-left"
                      onClick={() => onToggleClass(cls.id)}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span>{expanded ? '▼' : '▶'}</span>
                        <span className="font-bold">{cls.name}</span>
                        <span className="border border-gray-300 px-1 text-xs text-gray-500">{org.name}</span>
                      </div>
                      <span className={`border px-2 py-0.5 text-xs ${cls.status === '이슈' ? 'border-black font-bold' : 'border-gray-300 text-gray-400'}`}>
                        {cls.status}
                      </span>
                    </button>
                    {expanded && (
                      <div className="border-t-2 border-black p-4">
                        <ClassDetailGrid detail={cls.detail} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function TargetBrowsePanel({
  monthLabel,
  selectedTargetId,
  targets,
  onSelectTarget,
  onSettleAction,
  settleActionLabel,
  canOpenSettlement,
  approvedOrgCount,
  totalOrgCount,
  onAddTarget,
  isCurrentMonth,
}: {
  monthLabel: string;
  selectedTargetId: number;
  targets: PayoutTarget[];
  onSelectTarget: (id: number) => void;
  onSettleAction: (id: number) => void;
  settleActionLabel: string;
  canOpenSettlement: boolean;
  approvedOrgCount: number;
  totalOrgCount: number;
  onAddTarget: (input: { name: string; type: PayoutType; orgName: string }) => void;
  isCurrentMonth: boolean;
}) {
  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(new Set());
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetType, setNewTargetType] = useState<PayoutType>('행정팀');
  const [newTargetOrgName, setNewTargetOrgName] = useState('운영 공통');
  const selectedTarget = targets.find(target => target.id === selectedTargetId)!;
  const classes = SETTLE_CLASSES_BY_TARGET[selectedTargetId] ?? [];
  const totalRevenue = classes.reduce((sum, cls) => sum + cls.revenue, 0);
  const totalUnpaid = classes.reduce(
    (sum, cls) => sum + cls.students.reduce((studentSum, student) => studentSum + student.unpaid, 0),
    0,
  );

  function toggleExpandedClass(classId: string) {
    setExpandedClassIds(prev => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <aside className="flex w-[260px] shrink-0 flex-col overflow-hidden border-r-2 border-black">
        <div className="border-b-2 border-black px-4 py-2 text-xs text-gray-500">지급 대상 선택</div>
        <div className="flex-1 overflow-y-auto">
          {targets.map(target => (
            <button
              key={target.id}
              className={`w-full border-b border-gray-200 px-4 py-3 text-left ${selectedTargetId === target.id ? 'bg-gray-100' : ''}`}
              onClick={() => onSelectTarget(target.id)}
            >
              <div className="flex items-center gap-2">
                <span className="border border-gray-300 px-1 text-[11px] text-gray-500">{target.type}</span>
                <span className="text-sm font-bold">{target.name}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">{target.orgName} · 연결 수업 {target.classCount}개</div>
              <div className="mt-1 text-[11px] text-gray-400">{target.settleStatus}</div>
            </button>
          ))}
        </div>
        <div className="border-t-2 border-black p-3">
          {isCurrentMonth ? (
            !isAddingTarget ? (
              <button
                className="w-full border-2 border-black py-2 text-sm font-bold"
                onClick={() => setIsAddingTarget(true)}
              >
                + 지급 대상 추가
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  value={newTargetName}
                  onChange={event => setNewTargetName(event.target.value)}
                  placeholder="이름"
                  className="w-full border-2 border-black px-2 py-1 text-sm"
                />
                <div className="flex gap-0">
                  {(['강사', '행정팀', '월급제'] as PayoutType[]).map(type => (
                    <button
                      key={type}
                      className={`px-3 py-1 text-xs ${
                        newTargetType === type ? 'border-2 border-black bg-gray-800 text-white' : 'border-2 border-black -ml-[2px]'
                      }`}
                      onClick={() => setNewTargetType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <input
                  value={newTargetOrgName}
                  onChange={event => setNewTargetOrgName(event.target.value)}
                  placeholder="소속"
                  className="w-full border-2 border-black px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    className="flex-1 border-2 border-black py-1 text-sm font-bold"
                    onClick={() => {
                      if (!newTargetName.trim()) return;
                      onAddTarget({
                        name: newTargetName.trim(),
                        type: newTargetType,
                        orgName: newTargetOrgName.trim() || '운영 공통',
                      });
                      setNewTargetName('');
                      setNewTargetType('행정팀');
                      setNewTargetOrgName('운영 공통');
                      setIsAddingTarget(false);
                    }}
                  >
                    추가
                  </button>
                  <button
                    className="flex-1 border-2 border-gray-400 py-1 text-sm text-gray-500"
                    onClick={() => setIsAddingTarget(false)}
                  >
                    취소
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="text-xs text-gray-400">전달 확정본은 지급 대상을 수정하지 않습니다.</div>
          )}
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b-2 border-black px-4 py-3">
          <div className="text-sm font-bold">{monthLabel} 지급 대상 조회</div>
          <div className="mt-1 text-xs text-gray-500">
            조직 승인 {approvedOrgCount}/{totalOrgCount} 완료
            {!canOpenSettlement && ' · 당월 정산은 모든 조직 승인 후 가능'}
          </div>
        </div>

        <div className="border-b-2 border-black px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-gray-300 px-1 text-xs text-gray-500">{selectedTarget.type}</span>
                <span className="text-base font-bold">{selectedTarget.name}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-400">연결 수업</div>
                  <div className="font-bold">{selectedTarget.classCount}개</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">월 매출 합계</div>
                  <div className="font-bold">{won(totalRevenue)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">미납</div>
                  <div className="font-bold">{totalUnpaid > 0 ? won(totalUnpaid) : '없음'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">정산 상태</div>
                  <div className="font-bold">{selectedTarget.settleStatus}</div>
                </div>
              </div>
            </div>
            <button
              className="shrink-0 self-start border-2 border-black px-3 py-1 text-sm font-bold disabled:border-gray-300 disabled:text-gray-400"
              onClick={() => onSettleAction(selectedTarget.id)}
              disabled={!canOpenSettlement}
            >
              {settleActionLabel}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {classes.length === 0 ? (
            <div className="border-2 border-dashed border-black p-4 text-sm">
              <div className="font-bold">연결된 수업 없음</div>
              <div className="mt-1 text-gray-500">
                행정팀/월급제 강사는 수업 목록 대신 고정지급 항목 중심으로 정산합니다.
              </div>
            </div>
          ) : (
            classes.map(cls => (
              <div key={cls.id} className="border-2 border-black -mt-[2px]">
                <button
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => toggleExpandedClass(cls.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{expandedClassIds.has(cls.id) ? '▼' : '▶'}</span>
                    <div>
                      <div className="text-sm font-bold">{cls.name}</div>
                      <div className="text-xs text-gray-500">{cls.schedule} · {cls.hours}회</div>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-gray-400">매출 {won(cls.revenue)}</div>
                    <div className="font-bold">기본 비율 {cls.ratio}</div>
                  </div>
                </button>
                {expandedClassIds.has(cls.id) && (
                  <div className="overflow-x-auto border-t border-gray-200 bg-gray-50 px-4 py-2">
                    <div className="min-w-[460px]">
                      <div className="grid grid-cols-[1fr_60px_80px_80px_80px] py-1 text-xs text-gray-400">
                        <div>학생명</div>
                        <div className="text-center">출석 수</div>
                        <div className="text-right">납입금</div>
                        <div className="text-right">미납금</div>
                        <div className="text-right">PAY</div>
                      </div>
                      {cls.students.map(student => (
                        <div key={student.name} className="grid grid-cols-[1fr_60px_80px_80px_80px] py-0.5 text-xs">
                          <div>{student.name}</div>
                          <div className="text-center">{student.monthlyAttendance}회</div>
                          <div className="text-right">{student.paid.toLocaleString()}</div>
                          <div className={`text-right ${student.unpaid > 0 ? 'font-bold' : 'text-gray-400'}`}>
                            {student.unpaid > 0 ? student.unpaid.toLocaleString() : '—'}
                          </div>
                          <div className="text-right">{student.pay.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function SettlementPanel({
  monthCompare,
  monthLabel,
  target,
  targets,
  canOpenSettlement,
  approvedOrgCount,
  totalOrgCount,
  classes,
  expandedClasses,
  ratioOverrides,
  assistants,
  extraItems,
  onSelectTarget,
  onBack,
  onToggleClass,
  onRatioChange,
  onAddExtraItem,
  onAddAssistant,
  onRemoveAssistant,
  isCurrentMonth,
}: {
  monthCompare: number;
  monthLabel: string;
  target: PayoutTarget;
  targets: PayoutTarget[];
  canOpenSettlement: boolean;
  approvedOrgCount: number;
  totalOrgCount: number;
  classes: SettleClass[];
  expandedClasses: Set<string>;
  ratioOverrides: Record<string, string>;
  assistants: AssistantItem[];
  extraItems: ExtraItem[];
  onSelectTarget: (id: number) => void;
  onBack: () => void;
  onToggleClass: (id: string) => void;
  onRatioChange: (id: string, value: string) => void;
  onAddExtraItem: (item: ExtraItem) => void;
  onAddAssistant: (item: AssistantItem) => void;
  onRemoveAssistant: (assistantId: string) => void;
  isCurrentMonth: boolean;
}) {
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [extraName, setExtraName] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [addingAssistantFor, setAddingAssistantFor] = useState<string | null>(null);
  const [assistantName, setAssistantName] = useState('');
  const [assistantAmount, setAssistantAmount] = useState('');
  const [assistantTaxable, setAssistantTaxable] = useState(true);

  const classPayments = classes.map(cls => {
    const override = parseFloat(ratioOverrides[cls.id] ?? String(cls.ratio));
    const effectiveRatio = Number.isNaN(override) ? cls.ratio : override;
    return {
      ...cls,
      effectiveRatio,
      payment: Math.round(cls.revenue * effectiveRatio),
    };
  });

  const extraPaymentTotal = extraItems.reduce((sum, item) => sum + item.amount, 0);
  const classPaymentTotal = classPayments.reduce((sum, cls) => sum + cls.payment, 0);
  const grossPayment = classPaymentTotal + extraPaymentTotal;
  const tax = Math.round(grossPayment * 0.033);
  const assistantNetTotal = assistants.reduce(
    (sum, assistant) => sum + (assistant.taxable ? Math.round(assistant.amount * 0.967) : assistant.amount),
    0,
  );
  const netPayment = grossPayment - tax - assistantNetTotal;

  function submitExtraItem() {
    const amount = parseInt(extraAmount.replace(/,/g, ''), 10);
    if (!extraName || Number.isNaN(amount)) return;
    onAddExtraItem({
      id: `extra-${Date.now()}`,
      name: extraName,
      type: '고정지급',
      amount,
    });
    setExtraName('');
    setExtraAmount('');
    setIsAddingExtra(false);
  }

  function submitAssistant(classId: string | null) {
    const amount = parseInt(assistantAmount.replace(/,/g, ''), 10);
    if (!assistantName || Number.isNaN(amount)) return;
    onAddAssistant({
      id: `assistant-${Date.now()}`,
      name: assistantName,
      amount,
      taxable: assistantTaxable,
      classId,
    });
    setAssistantName('');
    setAssistantAmount('');
    setAssistantTaxable(true);
    setAddingAssistantFor(null);
  }

  const actionCopy = monthCompare === 0 ? '이번 달 정산안 작성 중' : '확정된 정산안 열람';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b-2 border-black px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold">{monthLabel} 정산</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="border border-gray-300 px-1 text-xs text-gray-500">{target.type}</span>
              <span className="text-base font-bold">{target.name}</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {target.orgName} · 연결 수업 {target.classCount}개 · {actionCopy}
            </div>
          </div>
          <button className="border border-gray-400 px-2 py-1 text-xs text-gray-500" onClick={onBack}>
            조회로 돌아가기
          </button>
        </div>

        <div className="mt-3 flex gap-0 overflow-x-auto border-t-2 border-black pt-3">
          {targets.map(item => (
            <button
              key={item.id}
              className={`shrink-0 border-2 px-4 py-2 text-left text-sm -ml-[2px] first:ml-0 ${
                item.id === target.id ? 'border-black bg-gray-100 font-bold' : 'border-black'
              }`}
              onClick={() => onSelectTarget(item.id)}
            >
              <div className="text-[11px] text-gray-400">{item.type}</div>
              <div>{item.name}</div>
            </button>
          ))}
        </div>
      </div>

      {!canOpenSettlement && (
        <div className="border-b-2 border-black bg-gray-50 px-4 py-3 text-sm">
          당월 정산 대기중: 조직 승인 {approvedOrgCount}/{totalOrgCount} 완료. 모든 조직 데이터 승인 후 정산 가능.
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b-2 border-black bg-gray-50 px-4 py-2 text-xs lg:grid-cols-4">
        <div>
          <div className="text-gray-400">수업 지급</div>
          <div className="font-bold">{won(classPaymentTotal)}</div>
        </div>
        <div>
          <div className="text-gray-400">고정/보정</div>
          <div className="font-bold">{won(extraPaymentTotal)}</div>
        </div>
        <div>
          <div className="text-gray-400">조교 차감</div>
          <div className="font-bold">{assistantNetTotal > 0 ? `-${won(assistantNetTotal)}` : '없음'}</div>
        </div>
        <div>
          <div className="text-gray-400">실지급액</div>
          <div className="font-bold">{won(netPayment)}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="overflow-x-auto">
          <div className="grid min-w-[520px] grid-cols-[1fr_80px_56px_72px_88px] border-b-2 border-black bg-gray-100 px-4 py-2 text-xs text-gray-500">
            <div>지급 근거</div>
            <div className="text-right">매출액</div>
            <div className="text-center">비율</div>
            <div className="text-right">시수</div>
            <div className="text-right">지급액</div>
          </div>
        </div>

        {classPayments.length === 0 && (
          <div className="border-b border-gray-200 px-4 py-4 text-sm">
            <div className="font-bold">연결된 수업 없음</div>
            <div className="mt-1 text-gray-500">
              이 대상은 행정팀/월급제 형태로 보고, 아래에서 고정지급 항목을 추가해 정산합니다.
            </div>
          </div>
        )}

        {classPayments.map(cls => {
          const expanded = expandedClasses.has(cls.id);
          const classAssistants = assistants.filter(assistant => assistant.classId === cls.id);
          return (
            <div key={cls.id} className="border-b border-gray-200">
              <div className="overflow-x-auto">
                <div className="grid min-w-[520px] grid-cols-[1fr_80px_56px_72px_88px] items-center px-4 py-2">
                <button className="flex items-center gap-1 text-left text-sm font-bold" onClick={() => onToggleClass(cls.id)}>
                  <span className="text-xs text-gray-400">{expanded ? '▼' : '▶'}</span>
                  <span>{cls.name}</span>
                </button>
                <div className="text-right text-sm">{cls.revenue.toLocaleString()}</div>
                <div className="text-center">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={ratioOverrides[cls.id] ?? cls.ratio}
                    onChange={event => onRatioChange(cls.id, event.target.value)}
                    disabled={!isCurrentMonth}
                    className="w-full border border-gray-300 px-1 text-center text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
                <div className="text-right text-sm text-gray-500">{cls.hours}회</div>
                <div className="text-right text-sm font-bold">{cls.payment.toLocaleString()}</div>
                </div>
              </div>
              {expanded && (
                <div className="overflow-x-auto border-t border-gray-200 bg-gray-50 px-4 py-2">
                  <div className="min-w-[460px]">
                    <div className="grid grid-cols-[1fr_60px_80px_80px_80px] py-1 text-xs text-gray-400">
                      <div>학생명</div>
                      <div className="text-center">출석 수</div>
                      <div className="text-right">납입금</div>
                      <div className="text-right">미납금</div>
                      <div className="text-right">PAY</div>
                    </div>
                    {cls.students.map(student => (
                      <div key={student.name} className="grid grid-cols-[1fr_60px_80px_80px_80px] py-0.5 text-xs">
                        <div>{student.name}</div>
                        <div className="text-center">{student.monthlyAttendance}회</div>
                        <div className="text-right">{student.paid.toLocaleString()}</div>
                        <div className={`text-right ${student.unpaid > 0 ? 'font-bold' : 'text-gray-400'}`}>
                          {student.unpaid > 0 ? student.unpaid.toLocaleString() : '—'}
                        </div>
                        <div className="text-right">{student.pay.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 border-t border-dashed border-gray-300 pt-2">
                    <div className="mb-1 text-xs text-gray-400">조교 배분</div>
                    {classAssistants.map(assistant => (
                      <div key={assistant.id} className="flex items-center gap-2 py-0.5 text-xs">
                        <span className="flex-1">{assistant.name}</span>
                        <span className="text-gray-500">{assistant.amount.toLocaleString()}</span>
                        <span className="text-gray-400">{assistant.taxable ? '3.3%' : '비과세'}</span>
                        <button
                          className="text-gray-300 hover:text-black disabled:cursor-default"
                          onClick={() => onRemoveAssistant(assistant.id)}
                          disabled={!isCurrentMonth}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {isCurrentMonth && addingAssistantFor === cls.id ? (
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          value={assistantName}
                          onChange={event => setAssistantName(event.target.value)}
                          placeholder="이름"
                          className="w-[80px] border border-black px-1 py-0.5 text-xs"
                        />
                        <input
                          value={assistantAmount}
                          onChange={event => setAssistantAmount(event.target.value)}
                          placeholder="금액"
                          className="w-[80px] border border-black px-1 py-0.5 text-xs"
                        />
                        <label className="flex items-center gap-1 text-xs text-gray-500">
                          <input
                            type="checkbox"
                            checked={assistantTaxable}
                            onChange={() => setAssistantTaxable(prev => !prev)}
                            className="h-3 w-3"
                          />
                          3.3%
                        </label>
                        <button className="border border-black px-1.5 py-0.5 text-xs font-bold" onClick={() => submitAssistant(cls.id)}>
                          추가
                        </button>
                      </div>
                    ) : isCurrentMonth ? (
                      <button
                        className="text-xs text-gray-400 hover:text-black"
                        onClick={() => setAddingAssistantFor(cls.id)}
                      >
                        + 조교 추가
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {extraItems.map(item => (
          <div key={item.id} className="grid grid-cols-[1fr_80px_56px_72px_88px] items-center border-b border-dashed border-gray-300 px-4 py-2">
            <div className="text-sm">
              <span className="mr-2 border border-gray-300 px-1 text-[11px] text-gray-500">{item.type}</span>
              {item.name}
            </div>
            <div className="text-right text-sm text-gray-400">—</div>
            <div className="text-center text-sm text-gray-400">—</div>
            <div className="text-right text-sm text-gray-400">—</div>
            <div className="text-right text-sm font-bold">{item.amount.toLocaleString()}</div>
          </div>
        ))}

        {!isCurrentMonth ? null : !isAddingExtra ? (
          <div className="border-b border-gray-200 px-4 py-2">
            <button className="text-sm text-gray-500 hover:text-black" onClick={() => setIsAddingExtra(true)}>
              + 고정지급 / 보정 항목 추가
            </button>
          </div>
        ) : (
          <div className="border-b-2 border-black bg-gray-50 px-4 py-3">
            <div className="flex gap-2">
              <input
                value={extraName}
                onChange={event => setExtraName(event.target.value)}
                placeholder="항목명"
                className="flex-1 border-2 border-black px-2 py-1 text-sm"
              />
              <input
                value={extraAmount}
                onChange={event => setExtraAmount(event.target.value)}
                placeholder="금액"
                className="w-[110px] border-2 border-black px-2 py-1 text-sm"
              />
              <button className="border-2 border-black px-3 py-1 text-sm font-bold" onClick={submitExtraItem}>
                추가
              </button>
              <button className="border-2 border-gray-400 px-3 py-1 text-sm text-gray-500" onClick={() => setIsAddingExtra(false)}>
                취소
              </button>
            </div>
          </div>
        )}

        <div className="border-t-2 border-black px-4 py-3">
          <div className="mb-2 text-xs font-bold text-gray-500">공통 조교</div>
          {assistants.filter(assistant => assistant.classId === null).map(assistant => (
            <div key={assistant.id} className="flex items-center gap-2 py-0.5 text-xs">
              <span className="flex-1">{assistant.name}</span>
              <span className="text-gray-500">{assistant.amount.toLocaleString()}</span>
              <span className="text-gray-400">{assistant.taxable ? '3.3%' : '비과세'}</span>
              <button
                className="text-gray-300 hover:text-black disabled:cursor-default"
                onClick={() => onRemoveAssistant(assistant.id)}
                disabled={!isCurrentMonth}
              >
                ×
              </button>
            </div>
          ))}
          {isCurrentMonth && addingAssistantFor === 'common' ? (
            <div className="mt-1 flex items-center gap-1">
              <input
                value={assistantName}
                onChange={event => setAssistantName(event.target.value)}
                placeholder="이름"
                className="w-[80px] border border-black px-1 py-0.5 text-xs"
              />
              <input
                value={assistantAmount}
                onChange={event => setAssistantAmount(event.target.value)}
                placeholder="금액"
                className="w-[80px] border border-black px-1 py-0.5 text-xs"
              />
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={assistantTaxable}
                  onChange={() => setAssistantTaxable(prev => !prev)}
                  className="h-3 w-3"
                />
                3.3%
              </label>
              <button className="border border-black px-1.5 py-0.5 text-xs font-bold" onClick={() => submitAssistant(null)}>
                추가
              </button>
            </div>
          ) : isCurrentMonth ? (
            <button className="text-xs text-gray-400 hover:text-black" onClick={() => setAddingAssistantFor('common')}>
              + 공통 조교 추가
            </button>
          ) : null}
        </div>

        <div className="border-t-2 border-black bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-[1fr_100px] text-sm">
            <div className="font-bold">총 지급액</div>
            <div className="text-right font-bold">{won(grossPayment)}</div>
          </div>
          <div className="mt-1 grid grid-cols-[1fr_100px] text-sm text-gray-500">
            <div>세금공제 (3.3%)</div>
            <div className="text-right">- {won(tax)}</div>
          </div>
          <div className="mt-1 grid grid-cols-[1fr_100px] text-sm text-gray-500">
            <div>조교 차감</div>
            <div className="text-right">- {won(assistantNetTotal)}</div>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_100px] border-t border-gray-300 pt-2 text-sm">
            <div className="font-bold">최종 수령</div>
            <div className="text-right font-bold">{won(netPayment)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassDetailGrid({ detail }: { detail: ClassItem['detail'] }) {
  const attendanceOkCount = detail.students.filter(student => student.attendanceOk).length;
  const attendanceMissingCount = detail.students.length - attendanceOkCount;
  const paidAmount = detail.students.reduce((sum, student) => sum + student.paid, 0);
  const unpaidAmount = detail.students.reduce((sum, student) => sum + student.unpaid, 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-0 text-sm">
        <div className="py-1">수강생</div>
        <div className="py-1 font-bold">{detail.students.length}명</div>
        <div className="py-1">출결 정상</div>
        <div className="py-1 font-bold">{attendanceOkCount}명</div>
        <div className="py-1">출결 누락</div>
        <div className={`py-1 font-bold ${attendanceMissingCount > 0 ? '' : 'text-gray-400'}`}>{attendanceMissingCount}명</div>
        <div className="py-1">총 납입</div>
        <div className="py-1 font-bold">{won(paidAmount)}</div>
        <div className="py-1">미납</div>
        <div className={`py-1 font-bold ${unpaidAmount > 0 ? '' : 'text-gray-400'}`}>{unpaidAmount > 0 ? won(unpaidAmount) : '없음'}</div>
      </div>

      <div className="mt-3 overflow-x-auto border-t border-gray-200 pt-3">
        <div className="min-w-[360px]">
          <div className="grid grid-cols-[1fr_60px_90px_90px] py-1 text-xs text-gray-400">
            <div>학생명</div>
            <div className="text-center">출석 수</div>
            <div className="text-right">납입금</div>
            <div className="text-right">미납금</div>
          </div>
          {detail.students.map(student => (
            <div key={student.name} className="grid grid-cols-[1fr_60px_90px_90px] py-0.5 text-xs">
              <div>{student.name}</div>
              <div className="text-center">{student.monthlyAttendance}회</div>
              <div className="text-right">{student.paid.toLocaleString()}</div>
              <div className={`text-right ${student.unpaid > 0 ? 'font-bold' : 'text-gray-400'}`}>
                {student.unpaid > 0 ? student.unpaid.toLocaleString() : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrgStatusBadge({ status }: { status: OrgValidationStatus }) {
  if (status === '승인 완료') {
    return <span className="bg-gray-800 px-2 py-0.5 text-xs text-white">승인 완료</span>;
  }
  if (status === '수정 필요') {
    return <span className="border-2 border-black px-2 py-0.5 text-xs font-bold">수정 필요</span>;
  }
  if (status === '미업로드') {
    return <span className="border border-gray-300 px-2 py-0.5 text-xs text-gray-500">미업로드</span>;
  }
  return <span className="border border-gray-400 px-2 py-0.5 text-xs text-gray-600">검토중</span>;
}
