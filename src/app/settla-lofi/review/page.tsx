'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ValidatorReviewSelectPage() {
  const router = useRouter();

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
          <div className="text-xs text-gray-500">
            검색 인풋 / 필터 / 정렬 / 리스트
          </div>
        </div>
        <div className="flex-1 border-b-2 border-black p-3 text-sm">
          <div className="mb-1 font-bold">수업들</div>
          <div className="text-xs text-gray-500">
            검색 인풋 / 필터 / 정렬 / 리스트 / 선택한 수업 수
          </div>
        </div>
        <div className="flex border-b-2 border-black">
          <button className="flex-1 border-r border-black p-3 text-left text-sm">
            <div className="mb-1 font-bold">선택한 수업 조회</div>
            <div className="text-xs text-gray-500">수업 데이터 불러오기</div>
          </button>
          <button
            className="flex-1 p-3 text-left text-sm"
            onClick={() => router.push('/settla-lofi/review/result')}
          >
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
          <SueopPreviewCard />
          <SueopPreviewCard />
          <div className="mt-4"></div>
        </div>
      </div>
    </div>
  );
}

/** 출결 상태 타입 */
type AttendanceStatus = '확인' | '미결석' | '미납결' | '-';

type MockStudent = {
  name: string;
  group: string;
  sessions: AttendanceStatus[];
};

/** 4월 회차 목데이터 (16회차 중 12회 진행) */
const SESSION_DATES = [
  { date: '1(화)', label: '기초 01회차' },
  { date: '3(목)', label: '기초 02회차' },
  { date: '8(화)', label: '기초 03회차' },
  { date: '10(목)', label: '기초 04회차' },
  { date: '15(화)', label: '전문 01회차' },
  { date: '17(목)', label: '전문 02회차' },
  { date: '22(화)', label: '전문 03회차' },
  { date: '24(목)', label: '전문 04회차' },
  { date: '25(금)', label: '기초 05회차' },
  { date: '26(토)', label: '기초 06회차' },
  { date: '29(화)', label: '전문 05회차' },
  { date: '30(수)', label: '전문 06회차' },
];

const MOCK_STUDENTS: MockStudent[] = [
  {
    name: '홍길동',
    group: '하수반',
    sessions: [
      '확인', '확인', '확인', '확인', '확인', '확인',
      '확인', '확인', '확인', '확인', '확인', '확인',
    ],
  },
  {
    name: '김철수',
    group: '하수반',
    sessions: [
      '확인', '확인', '미결석', '확인', '확인', '미결석',
      '확인', '확인', '확인', '확인', '-', '-',
    ],
  },
  {
    name: '이영희',
    group: '고수반',
    sessions: [
      '확인', '확인', '확인', '확인', '확인', '확인',
      '확인', '확인', '확인', '확인', '확인', '확인',
    ],
  },
  {
    name: '박민수',
    group: '고수반',
    sessions: [
      '확인', '미납결', '미결석', '확인', '미납결', '미결석',
      '확인', '확인', '-', '-', '-', '-',
    ],
  },
];

/** STEP 1용 수업 카드 - 읽기 전용, dash border/클릭 없음 */
function SueopPreviewCard() {
  return (
    <div className="mx-4 mb-8 mt-4 border-2 border-black">
      {/* Header */}
      <div className="border-b-2 border-black bg-gray-100 px-4 py-2 text-sm font-bold">
        수업 이름
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

      <div className="flex">
        {/* 출결 테이블 */}
        <div className="flex-1 border-r-2 border-black">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              {/* 헤더: 수강생 정보 + 날짜/회차 */}
              <thead>
                {/* 1행: 월 그룹 + 날짜 */}
                <tr className="bg-gray-100 text-center">
                  <th
                    colSpan={3}
                    className="border-b border-r-2 border-black px-2 py-1 text-left"
                  >
                    수강생
                  </th>
                  <th
                    colSpan={SESSION_DATES.length}
                    className="border-b border-black px-2 py-1"
                  >
                    4월
                  </th>
                </tr>
                {/* 2행: 세부 컬럼 + 회차명 */}
                <tr className="bg-gray-50 text-center">
                  <th className="border-b-2 border-r border-black px-2 py-1 text-left">
                    No.
                  </th>
                  <th className="border-b-2 border-r border-black px-2 py-1 text-left">
                    이름
                  </th>
                  <th className="border-b-2 border-r-2 border-black px-2 py-1 text-left">
                    분반
                  </th>
                  {SESSION_DATES.map((s) => (
                    <th
                      key={s.date}
                      className="border-b-2 border-r border-black px-1 py-1 last:border-r-0"
                    >
                      <div>{s.date}</div>
                      <div className="font-normal text-gray-400">
                        {s.label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_STUDENTS.map((student, idx) => (
                  <tr key={student.name}>
                    <td className="border-b border-r border-gray-300 px-2 py-1.5 text-center">
                      {idx + 1}
                    </td>
                    <td className="border-b border-r border-gray-300 px-2 py-1.5 font-bold">
                      {student.name}
                    </td>
                    <td className="border-b border-r-2 border-gray-300 px-2 py-1.5">
                      {student.group}
                    </td>
                    {student.sessions.map((status, si) => (
                      <td
                        key={si}
                        className={`border-b border-r border-gray-300 px-1 py-1.5 text-center last:border-r-0 ${status === '확인'
                          ? 'text-gray-600'
                          : status === '미결석'
                            ? 'bg-red-50 text-red-500'
                            : status === '미납결'
                              ? 'bg-yellow-50 text-yellow-600'
                              : 'text-gray-300'
                          }`}
                      >
                        {status}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 하단 버튼 바 */}
          <div className="border-t-2 border-black px-4 py-2 text-sm font-bold">
            검증 실행
          </div>
        </div>

        {/* 작업 이력 패널 */}
        <WorkHistoryPanel />
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
  },
  {
    id: 2,
    author: '이창욱',
    type: '작업',
    date: '2026-04-05 15:10',
    content: '출결 누락 건 티키타에서 수정 완료',
    resolved: false,
  },
  {
    id: 3,
    author: '김재진',
    type: '메모',
    date: '2026-04-06 09:00',
    content: '미납 금액 확인 필요 — 다음 검증 시 재확인',
    resolved: false,
  },
];

function WorkHistoryPanel() {
  const [items, setItems] = useState(INITIAL_WORK_HISTORY);
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

  return (
    <div className="w-[320px] shrink-0">
      <div className="border-b-2 border-black px-4 py-2 text-sm font-bold">
        작업 이력 ({items.length})
      </div>

      {items.map((item, idx) => {
        const isMine = item.author === CURRENT_USER;
        const isEditing = editingId === item.id;
        const isLast = idx === items.length - 1;

        return (
          <div
            key={item.id}
            className={`px-4 py-3 ${!isLast ? 'border-b border-gray-300' : ''} ${item.resolved ? 'bg-green-50' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold">{item.author}</span>
                <span className="border-2 border-black px-1">{item.type}</span>
                <span className="text-gray-400">{item.date}</span>
              </div>
              {isMine && !isEditing && (
                <button
                  className="border border-black px-2 py-0.5 text-xs"
                  onClick={() => handleStartEdit(item.id, item.content)}
                >
                  수정
                </button>
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
                      취소
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
                <div className="mt-1 text-sm">{item.content}</div>
                {item.resolved && (
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
