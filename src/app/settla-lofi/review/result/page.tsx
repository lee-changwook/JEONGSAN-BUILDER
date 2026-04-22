'use client';

import { useState } from 'react';

export default function ValidatorReviewPage() {
  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <aside className="flex w-[360px] shrink-0 flex-col border-r-2 border-black">
        <div className="border-b-2 border-black p-3 text-sm">
          조직 선택 (드롭 다운)
        </div>
        <div className="border-b-2 border-black p-3 text-sm">
          조회 기간 (데이트 피커: 시작~종료)
        </div>
        <div className="flex-1 border-b-2 border-black p-3 text-sm">
          <div className="mb-1 font-bold">수업 그룹</div>
          <div className="text-xs text-gray-500">검색 인풋 / 필터 / 정렬 / 리스트</div>
        </div>
        <div className="flex-1 border-b-2 border-black p-3 text-sm">
          <div className="mb-1 font-bold">수업들</div>
          <div className="text-xs text-gray-500">
            검색 인풋 / 필터 / 정렬 / 리스트 / 선택한 수업 수
          </div>
        </div>

        {/* 수업 조회 / 검증 실행 버튼 */}
        <div className="flex border-b-2 border-black">
          <button className="flex-1 border-r border-black p-3 text-left text-sm">
            <div className="mb-1 font-bold">선택한 수업 조회</div>
            <div className="text-xs text-gray-500">수업 데이터 불러오기</div>
          </button>
          <button className="flex-1 p-3 text-left text-sm">
            <div className="mb-1 font-bold">선택한 모든 수업 검증 실행</div>
            <div className="text-xs text-gray-500">(선택한 수업 수)</div>
          </button>
        </div>

      </aside>

      {/* Right Panel */}
      <div className="flex flex-1 flex-col">
        <div className="border-b-2 border-black p-3 text-sm">
          총 검증한 수업 수 / 검증 상태 요약
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SueopInfoCard />
          <SueopInfoCard />
          <div className="mt-4"></div>
        </div>
      </div>
    </div>
  );
}

const TEACHITA_BASE = 'http://staging.dash.v3.teachita.com';
const TEACHITA_JO = 'jojik-Yq9w6szR';

const TEACHITA_PAGES = [
  { label: '홈', path: 'home/dv' },
  { label: '전체 처리', path: 'jeonche-cheori/dv' },
  { label: '출결 관리', path: 'chulgyeol-gwanri/tv' },
  { label: '조직 설정', path: 'jojik-seoljeong/sv' },
  { label: '미납 관리', path: 'minap-gwanri/lv' },
  { label: '납입 분석', path: 'nabip-bunseok/tv' },
  { label: '수업 생성', path: 'sueop-saengseong/dv' },
  { label: '수업 알림 발송', path: 'sueop-allim-balsong/dv' },
  { label: '수업 알림 발송 내역', path: 'sueop-allim-balsong-naeyeok/lv' },
  { label: '학원 알림 발송', path: 'hagwon-allim-balsong/dv' },
  { label: '학원 알림 발송 내역', path: 'hagwon-allim-balsong-naeyeok/lv' },
  { label: '모바일 수강신청', path: 'mobile-sugangsincheong/dv' },
  { label: '단체 수강생 추가', path: 'danche-sugangsaeng-chuga/lv' },
] as const;

type CellIssue = {
  type: 'error' | 'insight';
  label: string;
  detail: string;
  action?: string;
};

type StudentData = {
  name: string;
  attendance: string;
  discountAmount: string;
  textbook: string;
  expected: string;
  actual: string;
  unpaid: string;
  diff: string;
  hasError: boolean;
  cellIssues?: Record<string, CellIssue[]>;
};

const MOCK_STUDENTS: StudentData[] = [
  {
    name: '홍길동',
    attendance: '12/16',
    discountAmount: '0(0%)',
    textbook: '30,000',
    expected: '830,000',
    actual: '830,000',
    unpaid: '0',
    diff: '0',
    hasError: false,
  },
  {
    name: '김철수',
    attendance: '10/16',
    discountAmount: '50,000(10%)',
    textbook: '30,000',
    expected: '750,000',
    actual: '600,000',
    unpaid: '150,000',
    diff: '-150,000',
    hasError: true,
    cellIssues: {
      unpaid: [
        {
          type: 'error',
          label: '미납 발생',
          detail: '기대 납입금 750,000 대비 실제 납입금 600,000. 미납 150,000 확인 필요.',
          action: '티키타 미납 관리에서 납입 상태 확인',
        },
      ],
      diff: [
        {
          type: 'error',
          label: '차이 발생',
          detail: '미납금 + 실제 납입금이 기대 납입금과 일치하지 않음.',
        },
      ],
      attendance: [
        {
          type: 'insight',
          label: '출결률 저조',
          detail: '출결률 62.5% — 전월 대비 20%p 하락.',
          action: '수강생 상담 또는 출결 관리 확인 권장',
        },
      ],
    },
  },
  {
    name: '이영희',
    attendance: '14/16',
    discountAmount: '0(0%)',
    textbook: '0',
    expected: '800,000',
    actual: '800,000',
    unpaid: '0',
    diff: '0',
    hasError: false,
    cellIssues: {
      textbook: [
        {
          type: 'insight',
          label: '교재비 미설정',
          detail: '수업에 교재비(30,000)가 설정되어 있으나 해당 수강생은 0원.',
          action: '교재비 면제 대상인지 확인',
        },
      ],
    },
  },
  {
    name: '박민수',
    attendance: '8/16',
    discountAmount: '80,000(20%)',
    textbook: '30,000',
    expected: '670,000',
    actual: '400,000',
    unpaid: '270,000',
    diff: '-270,000',
    hasError: true,
    cellIssues: {
      attendance: [
        {
          type: 'error',
          label: '출결 과반 미달',
          detail: '출결률 50% — 환불 규정 기준 미달.',
          action: '환불 여부 검토 필요',
        },
      ],
      unpaid: [
        {
          type: 'error',
          label: '미납 발생',
          detail: '미납금 270,000원. 2개월 연속 미납 상태.',
        },
      ],
      diff: [
        {
          type: 'error',
          label: '차이 발생',
          detail: '미납금 + 실제 납입금이 기대 납입금과 일치하지 않음.',
        },
      ],
      discountAmount: [
        {
          type: 'insight',
          label: '높은 할인율',
          detail: '할인금 80,000원(20%) 적용 중. 출결률 50%와 함께 검토 필요.',
        },
      ],
    },
  },
];

const COLUMN_KEYS = [
  'name',
  'attendance',
  'discountAmount',
  'textbook',
  'expected',
  'actual',
  'unpaid',
  'diff',
] as const;

const COLUMN_LABELS: Record<string, string> = {
  name: '수강생',
  attendance: '출결상태',
  discountAmount: '할인금(할인율)',
  textbook: '교재비',
  expected: '기대 납입금',
  actual: '실제 납입금',
  unpaid: '미납금',
  diff: '차이 발생',
};

type VerifyStatus = null | '완료' | '이슈' | '메모';

let nextHistoryId = 100;

function makeTimestamp() {
  return new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function SueopInfoCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>(null);
  const [verifyHistoryId, setVerifyHistoryId] = useState<number | null>(null);
  const [teachitaPage, setTeachitaPage] = useState<string>(
    TEACHITA_PAGES[1].path,
  );
  const [isPrevMonthOpen, setIsPrevMonthOpen] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [filterErrors, setFilterErrors] = useState(false);
  const [filterInsights, setFilterInsights] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    student: string;
    column: string;
  } | null>(null);
  const [workHistory, setWorkHistory] = useState(INITIAL_WORK_HISTORY);

  const isVerified = verifyStatus !== null;

  const handleVerifyChange = (status: VerifyStatus) => {
    const prevStatus = verifyStatus;
    setVerifyStatus(status);

    // 해제 또는 다른 상태로 전환 → 이전에 자동 생성한 이력을 cancelled 처리
    if (prevStatus && verifyHistoryId !== null) {
      setWorkHistory((prev) =>
        prev.map((item) =>
          item.id === verifyHistoryId ? { ...item, cancelled: true } : item,
        ),
      );
      setVerifyHistoryId(null);
    }

    // 새 상태 선택 → 이력 추가
    if (status) {
      const typeMap = { '완료': '완료', '이슈': '이슈', '메모': '메모' } as const;
      const contentMap = {
        '완료': '검증 완료 처리',
        '이슈': '이슈 발견 — 검증 중 확인 필요',
        '메모': '검증 메모 기록',
      } as const;

      const newId = nextHistoryId++;
      setVerifyHistoryId(newId);
      setWorkHistory((prev) => [
        ...prev,
        {
          id: newId,
          author: CURRENT_USER,
          type: typeMap[status],
          date: makeTimestamp(),
          content: contentMap[status],
          resolved: status === '완료',
          cancelled: false,
        },
      ]);
    }
  };

  const filteredStudents = MOCK_STUDENTS.filter((s) => {
    if (!filterErrors && !filterInsights) return true;
    if (filterErrors && s.hasError) return true;
    if (filterInsights && s.hasError) return true;
    return false;
  });

  const selectedStudent = selectedCell
    ? MOCK_STUDENTS.find((s) => s.name === selectedCell.student)
    : null;

  const selectedIssues: { column?: string; issues: CellIssue[] }[] = (() => {
    if (!selectedCell || !selectedStudent?.cellIssues) return [];
    if (selectedCell.column === 'all') {
      return Object.entries(selectedStudent.cellIssues)
        .filter(([, v]) => v.length > 0)
        .map(([col, issues]) => ({ column: col, issues }));
    }
    const issues = selectedStudent.cellIssues[selectedCell.column] ?? [];
    return issues.length > 0 ? [{ issues }] : [];
  })();

  return (
    <div
      className={`mx-4 mb-8 mt-4 border-2 ${isVerified ? 'border-green-600' : 'border-black'}`}
    >
      {/* Header */}
      <div
        className={`flex justify-between border-b-2 px-4 py-2 text-sm ${isVerified ? 'border-green-600 bg-green-50' : 'border-black bg-gray-100'}`}
      >
        <div className="text-sm font-bold">수업 이름</div>
        <div className="flex items-center gap-2">
          {(['완료', '이슈', '메모'] as const).map((status) => (
            <button
              key={status}
              className={`border px-2 py-1 text-xs font-bold ${verifyStatus === status
                ? 'border-green-600 bg-green-100'
                : 'border-black bg-white'
                }`}
              onClick={() =>
                handleVerifyChange(verifyStatus === status ? null : status)
              }
            >
              {verifyStatus === status ? '✅ ' : ''}
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* 수업 기본 정보 */}
      <div className="flex border-b-2 border-black">
        <div className="flex w-[80px] shrink-0 items-center justify-center border-r border-gray-300 bg-gray-100 text-[10px] font-bold text-gray-500">
          기본 정보
        </div>
        <div className="flex flex-1 flex-wrap gap-x-4 gap-y-0.5 px-4 py-2 text-xs">
          <span>
            <span className="text-gray-500">조직</span> 고등1관
          </span>
          <span>
            <span className="text-gray-500">강사</span> 김명훈
          </span>
          <span>
            <span className="text-gray-500">수업</span> 중등반 &gt; 중2 수학 A
          </span>
          <span>
            <span className="text-gray-500">실강/총</span>{' '}
            <span className="font-mono">12/16</span>
          </span>
          <span>
            <span className="text-gray-500">1회 수강료</span>{' '}
            <span className="font-mono">50,000</span>
          </span>
          <span>
            <span className="text-gray-500">교재비</span>{' '}
            <span className="font-mono">30,000</span>
          </span>
        </div>
      </div>

      {/* 검증 결과 요약 바 */}
      <div className="flex border-b-2 border-black bg-gray-50">
        <div className="flex w-[80px] shrink-0 items-center justify-center border-r border-gray-300 bg-gray-100 text-[10px] font-bold text-gray-500">
          검증 결과
          <br />
          요약
        </div>
        <div className="flex flex-1 flex-wrap gap-x-5 gap-y-0.5 px-4 py-2 text-xs">
          <span>
            <span className="text-gray-500">출결</span>{' '}
            <span className="font-mono font-bold">44/48</span>
          </span>
          <span>
            <span className="text-gray-500">기대 납입금</span>{' '}
            <span className="font-mono">2,520,000</span>
          </span>
          <span>
            <span className="text-gray-500">실제 납입금</span>{' '}
            <span className="font-mono">2,630,000</span>
          </span>
          <span>
            <span className="text-gray-500">미납금</span>{' '}
            <span className="font-mono">420,000</span>
          </span>
          <span>
            <span className="text-gray-500">차이</span>{' '}
            <span className="font-mono font-bold text-red-600">-420,000</span>
          </span>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs">
        <span className="font-bold">필터:</span>
        <label className="flex cursor-pointer items-center gap-1">
          <input
            type="checkbox"
            checked={filterErrors}
            onChange={(e) => setFilterErrors(e.target.checked)}
            className="h-3 w-3"
          />
          에러가 있는 학생
        </label>
        <label className="flex cursor-pointer items-center gap-1">
          <input
            type="checkbox"
            checked={filterInsights}
            onChange={(e) => setFilterInsights(e.target.checked)}
            className="h-3 w-3"
          />
          인사이트가 부여된 학생
        </label>
      </div>

      <div className="flex min-h-0">
        {/* Left: 수강생 테이블 */}
        <div className="flex-1 border-r-2 border-black">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className={`text-left text-xs ${isVerified ? 'bg-green-100' : 'bg-gray-50'}`}
                >
                  {COLUMN_KEYS.map((key) => (
                    <th
                      key={key}
                      className="border-b-2 border-r border-black px-3 py-2 last:border-r-0"
                    >
                      {COLUMN_LABELS[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.name}>
                    {COLUMN_KEYS.map((key) => {
                      const hasIssue = (student.cellIssues?.[key]?.length ?? 0) > 0;
                      const isName = key === 'name';
                      const hasAnyIssue =
                        isName &&
                        Object.values(student.cellIssues ?? {}).some(
                          (v) => v.length > 0,
                        );
                      const isClickable = hasIssue || hasAnyIssue;
                      const targetColumn = isName ? 'all' : key;
                      const isSelected =
                        selectedCell?.student === student.name &&
                        selectedCell?.column === targetColumn;
                      return (
                        <td
                          key={key}
                          className={`border-b border-r border-gray-300 px-3 py-2 last:border-r-0 ${isName ? 'font-bold' : 'font-mono'
                            } ${isClickable ? 'cursor-pointer' : ''} ${hasIssue && !isName
                              ? 'border-dashed border-gray-500'
                              : ''
                            } ${isSelected ? 'bg-gray-200' : ''}`}
                          onClick={
                            isClickable
                              ? () =>
                                setSelectedCell(
                                  isSelected
                                    ? null
                                    : {
                                      student: student.name,
                                      column: targetColumn,
                                    },
                                )
                              : undefined
                          }
                        >
                          {student[key as keyof typeof student] as string}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 하단 버튼 바 */}
          <div className="flex flex-wrap gap-0 border-t-2 border-black">
            <select
              className="border-r-2 border-black bg-white px-3 py-2 text-sm font-bold"
              value={teachitaPage}
              onChange={(e) => setTeachitaPage(e.target.value)}
            >
              {TEACHITA_PAGES.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              className="border-r-2 border-black px-4 py-2 text-sm font-bold"
              onClick={() => {
                const url = `${TEACHITA_BASE}/td/acap/jos/${TEACHITA_JO}/${teachitaPage}`;
                const w = 1200;
                const h = 800;
                const left = Math.round((screen.width - w) / 2);
                const top = Math.round((screen.height - h) / 2);
                const win = window.open(
                  url,
                  'teachita',
                  `popup,width=${w},height=${h}`,
                );
                win?.moveTo(left, top);
              }}
            >
              티키타 윈도우 열기
            </button>
            <div className="relative">
              <button
                className="border-r-2 border-black px-4 py-2 text-sm font-bold"
                onClick={() => setIsTooltipOpen((prev) => !prev)}
              >
                작업 이력 추가
              </button>
              {isTooltipOpen && (
                <WorkHistoryTooltip
                  onClose={() => setIsTooltipOpen(false)}
                  onExpand={() => {
                    setIsTooltipOpen(false);
                    setIsModalOpen(true);
                  }}
                />
              )}
            </div>
            <button
              className="border-r-2 border-black px-4 py-2 text-sm font-bold"
              onClick={() => setIsPrevMonthOpen(true)}
            >
              전월 데이터 동시 조회
            </button>
            <div className="px-4 py-2 text-sm font-bold">
              검증 실행
            </div>
          </div>
        </div>

        {/* Middle: 인스펙터 패널 — 셀 선택 시 표시 */}
        {selectedCell && (
          <div className="w-[280px] shrink-0 self-stretch overflow-y-auto border-r-2 border-black">
            <div className="flex items-center justify-between border-b-2 border-black px-3 py-2">
              <span className="text-xs font-bold">
                {selectedCell.student}
                {selectedCell.column !== 'all' &&
                  ` > ${COLUMN_LABELS[selectedCell.column]}`}
              </span>
              <button
                className="text-sm font-bold"
                onClick={() => setSelectedCell(null)}
              >
                X
              </button>
            </div>
            {selectedIssues.length > 0 ? (
              <div className="space-y-3 overflow-y-auto p-3">
                {selectedIssues.map((group, gi) => (
                  <div key={gi}>
                    {group.column && (
                      <div className="mb-1 border-b border-gray-200 pb-1 text-[10px] font-bold text-gray-500">
                        {COLUMN_LABELS[group.column]}
                      </div>
                    )}
                    {group.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="mb-2 border border-gray-300 p-2"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="border border-black px-1 text-[10px] font-bold uppercase">
                            {issue.type}
                          </span>
                          <span className="text-xs font-bold">
                            {issue.label}
                          </span>
                        </div>
                        <div className="text-xs">{issue.detail}</div>
                        {issue.action && (
                          <div className="mt-1 border-t border-gray-200 pt-1 text-xs text-gray-500">
                            액션: {issue.action}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-xs text-gray-400">
                이 셀에 대한 에러/인사이트가 없습니다.
              </div>
            )}
          </div>
        )}

        {/* Right: 작업 이력 댓글 섹션 */}
        <WorkHistoryPanel items={workHistory} setItems={setWorkHistory} />
      </div>

      {
        isModalOpen && (
          <WorkHistoryModal onClose={() => setIsModalOpen(false)} />
        )
      }

      {/* TeachitaWindow는 window.open으로 별도 팝업 윈도우 오픈 */}

      {
        isPrevMonthOpen && (
          <PrevMonthCompareModal onClose={() => setIsPrevMonthOpen(false)} />
        )
      }
    </div >
  );
}

/* 작업 이력 추가 툴팁 (간소화) */
function WorkHistoryTooltip({
  onClose,
  onExpand,
}: {
  onClose: () => void;
  onExpand: () => void;
}) {
  return (
    <div className="absolute bottom-full left-0 z-40 mb-2 w-[280px] border-2 border-black bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <span className="text-xs font-bold">작업 이력</span>
        <div className="flex gap-1">
          <button className="text-sm font-bold" onClick={onClose}>
            X
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="mb-2 flex gap-3 text-xs">
          <label className="flex items-center gap-1">
            <input type="radio" name="tooltip-type" defaultChecked className="h-3 w-3" />
            이슈
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="tooltip-type" className="h-3 w-3" />
            작업
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="tooltip-type" className="h-3 w-3" />
            메모
          </label>
        </div>
        <input
          className="mb-2 w-full border border-gray-300 px-2 py-1 text-xs"
          placeholder="로그인된 사용자 이름을 자동 추가"
          disabled
        />
        <textarea
          className="mb-2 h-[60px] w-full resize-none border border-gray-300 px-2 py-1 text-xs"
          placeholder="내용을 입력하세요"
        />
        <button className="w-full border-2 border-black bg-gray-100 py-1 text-xs font-bold">
          추가
        </button>
      </div>
    </div>
  );
}

function WorkHistoryModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[480px] border-2 border-black bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
          <span className="font-bold">작업 이력 추가</span>
          <button className="text-lg font-bold" onClick={onClose}>
            X
          </button>
        </div>

        {/* Textarea */}
        <div className="border-b-2 border-black p-4">
          <div className="h-[120px] border-2 border-black p-2 text-sm text-gray-400">
            내용을 입력하세요
          </div>
        </div>

        {/* Type radio buttons */}
        <div className="border-b-2 border-black p-4">
          <label className="flex items-start gap-2 pb-3">
            <input type="radio" name="type" defaultChecked className="mt-1" />
            <div>
              <div className="text-sm font-bold">이슈</div>
              <div className="text-xs text-gray-500">
                검증 중 발견된 이슈 기록
              </div>
            </div>
          </label>
          <label className="flex items-start gap-2 pb-3">
            <input type="radio" name="type" className="mt-1" />
            <div>
              <div className="text-sm font-bold">작업</div>
              <div className="text-xs text-gray-500">수행한 작업 내용 기록</div>
            </div>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="type" className="mt-1" />
            <div>
              <div className="text-sm font-bold">메모</div>
              <div className="text-xs text-gray-500">기타 메모 기록</div>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4">
          <button
            className="border-2 border-black px-4 py-2 text-sm"
            onClick={onClose}
          >
            취소
          </button>
          <button className="border-2 border-black bg-gray-100 px-4 py-2 text-sm font-bold">
            추가
          </button>
        </div>
      </div>
    </div>
  );
}


/* 전월 데이터 동시 조회 모달 */
function PrevMonthCompareModal({ onClose }: { onClose: () => void }) {
  const [compareMonth, setCompareMonth] = useState('2026-03');

  const TABLE_HEADERS = [
    '수강생',
    '출결상태',
    '할인금(할인율)',
    '교재비',
    '기대 납입금',
    '실제 납입금',
    '미납금',
    '차이 발생',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex h-[85vh] w-[90vw] flex-col border-2 border-black bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-bold">전월 데이터 동시 조회</span>
            <select
              className="border border-black bg-white px-2 py-1 text-xs"
              value={compareMonth}
              onChange={(e) => setCompareMonth(e.target.value)}
            >
              <option value="2026-03">2026-03</option>
              <option value="2026-02">2026-02</option>
              <option value="2026-01">2026-01</option>
            </select>
          </div>
          <button className="text-lg font-bold" onClick={onClose}>
            X
          </button>
        </div>

        {/* 이번 달 / 비교 달 나란히 */}
        <div className="grid flex-1 grid-cols-2 divide-x-2 divide-black overflow-hidden">
          {/* 이번 달 */}
          <div className="flex flex-col overflow-auto">
            <div className="border-b-2 border-black bg-gray-50 px-4 py-2 text-sm font-bold">
              이번 달 (2026-04)
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs">
                    {TABLE_HEADERS.map((h) => (
                      <th
                        key={h}
                        className="border-b-2 border-r border-black px-3 py-2 last:border-r-0"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_STUDENTS.map((s) => (
                    <tr key={s.name}>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-bold">
                        {s.name}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.attendance}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.discountAmount}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.textbook}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.expected}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.actual}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.unpaid}
                      </td>
                      <td className="border-b border-gray-300 px-3 py-2 font-mono">
                        {s.diff}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 비교 달 */}
          <div className="flex flex-col overflow-auto bg-gray-50/50">
            <div className="border-b-2 border-black bg-gray-100 px-4 py-2 text-sm font-bold">
              비교: {compareMonth}
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left text-xs">
                    {TABLE_HEADERS.map((h) => (
                      <th
                        key={h}
                        className="border-b-2 border-r border-black px-3 py-2 last:border-r-0"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_STUDENTS.map((s) => (
                    <tr key={s.name}>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-bold">
                        {s.name}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.attendance}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.discountAmount}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.textbook}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.expected}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.actual}
                      </td>
                      <td className="border-b border-r border-gray-300 px-3 py-2 font-mono">
                        {s.unpaid}
                      </td>
                      <td className="border-b border-gray-300 px-3 py-2 font-mono">
                        {s.diff}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t-2 border-black p-3">
          <button
            className="border-2 border-black px-4 py-2 text-sm"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

const CURRENT_USER = '이창욱';

const INITIAL_WORK_HISTORY = [
  {
    id: 1,
    author: '김재진',
    type: '이슈',
    date: '2026-04-05 14:30',
    content: '출결 누락 3건 발견 — 수강생 홍길동, 김철수, 이영희',
    resolved: false,
    cancelled: false,
  },
  {
    id: 2,
    author: '이창욱',
    type: '완료',
    date: '2026-04-05 15:10',
    content: '출결 누락 건 티키타에서 수정 완료',
    resolved: false,
    cancelled: false,
  },
  {
    id: 3,
    author: '김재진',
    type: '메모',
    date: '2026-04-06 09:00',
    content: '미납 금액 확인 필요 — 다음 검증 시 재확인',
    resolved: false,
    cancelled: false,
  },
];

type WorkHistoryItem = (typeof INITIAL_WORK_HISTORY)[number];

function WorkHistoryPanel({
  items,
  setItems,
}: {
  items: WorkHistoryItem[];
  setItems: React.Dispatch<React.SetStateAction<WorkHistoryItem[]>>;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (id: number, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleSave = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, content: editContent } : item,
      ),
    );
    setEditingId(null);
    setEditContent('');
  };

  const handleToggleResolved = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, resolved: !item.resolved } : item,
      ),
    );
  };

  const handleCancel = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, cancelled: true } : item,
      ),
    );
  };

  return (
    <div className="w-[320px] shrink-0 self-stretch overflow-y-auto">
      <div className="border-b-2 border-black px-4 py-2 text-sm font-bold">
        작업 이력 ({items.filter((i) => !i.cancelled).length})
      </div>

      {items.map((item, idx) => {
        const isMine = item.author === CURRENT_USER;
        const isEditing = editingId === item.id;
        const isLast = idx === items.length - 1;

        return (
          <div
            key={item.id}
            className={`px-4 py-3 ${!isLast ? 'border-b border-gray-300' : ''} ${item.cancelled
              ? 'bg-gray-100 opacity-50'
              : item.resolved
                ? 'bg-green-50'
                : ''
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold">{item.author}</span>
                <span
                  className={`border px-1 ${item.cancelled
                    ? 'border-gray-400 text-gray-400 line-through'
                    : 'border-black'
                    }`}
                >
                  {item.type}
                </span>
                <span className="text-gray-400">{item.date}</span>
              </div>
              {isMine && !isEditing && !item.cancelled && (
                <div className="flex gap-1">
                  <button
                    className="border border-black px-2 py-0.5 text-xs"
                    onClick={() => handleStartEdit(item.id, item.content)}
                  >
                    수정
                  </button>
                  <button
                    className="border border-gray-400 px-2 py-0.5 text-xs text-gray-500"
                    onClick={() => handleCancel(item.id)}
                  >
                    취소
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  className="w-full resize-none border border-gray-300 px-2 py-1 text-sm"
                  rows={2}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={item.resolved}
                      onChange={() => handleToggleResolved(item.id)}
                      className="h-3 w-3"
                    />
                    해결됨 표시
                  </label>
                  <div className="flex gap-1">
                    <button
                      className="border border-black px-2 py-0.5 text-xs"
                      onClick={() => setEditingId(null)}
                    >
                      닫기
                    </button>
                    <button
                      className="border-2 border-black bg-gray-100 px-2 py-0.5 text-xs font-bold"
                      onClick={() => handleSave(item.id)}
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={`mt-1 text-sm ${item.cancelled ? 'line-through' : ''}`}
                >
                  {item.content}
                </div>
                {item.cancelled && (
                  <div className="mt-1 text-xs text-gray-400">취소됨</div>
                )}
                {!item.cancelled && item.resolved && (
                  <div className="mt-1 text-xs font-bold text-green-600">
                    해결됨!
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
