'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { tikitaCourses } from '@/mocks/tikita-data';
import { useValidatorStore } from '@/store/validator-store';

export function TikitaSetup() {
  const { selectedGangjwaIds, selectGangjwa, loadData, loadedData, unlockSelection, queryPeriodStart, queryPeriodEnd, setQueryPeriod } = useValidatorStore();
  const [search, setSearch] = useState('');

  const isLoaded = loadedData.length > 0;
  const loadedIds = loadedData.map((cd) => cd.course.id);
  const isSelectionDirty = isLoaded && (
    selectedGangjwaIds.length !== loadedIds.length ||
    selectedGangjwaIds.some((id) => !loadedIds.includes(id))
  );

  const filtered = tikitaCourses.filter(
    (c) => c.name.includes(search) || c.teacher.includes(search),
  );

  const allSelected = tikitaCourses.every((c) => selectedGangjwaIds.includes(c.id));

  function toggleCourse(id: string) {
    if (selectedGangjwaIds.includes(id)) {
      selectGangjwa(selectedGangjwaIds.filter((gid) => gid !== id));
    } else {
      selectGangjwa([...selectedGangjwaIds, id]);
    }
  }

  function toggleAll() {
    if (allSelected) {
      selectGangjwa([]);
    } else {
      selectGangjwa(tikitaCourses.map((c) => c.id));
    }
  }

  return (
    <>
      <div className="mb-7">
        <div className="flex items-center gap-2.5 mb-3.5 text-[15px] font-semibold">
          <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[13px] font-semibold shrink-0">1</span>
          조회 기간 설정
        </div>
        <div className="bg-white border border-gray-200 rounded-[10px] p-5">
          <div className="flex gap-4 mb-3 last:mb-0">
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="text-[13px] text-gray-500">시작일</div>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none read-only:bg-gray-100 read-only:text-blue-600 read-only:font-semibold read-only:cursor-default"
                type="date"
                value={queryPeriodStart}
                onChange={(e) => setQueryPeriod(e.target.value, queryPeriodEnd)}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="text-[13px] text-gray-500">종료일</div>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none read-only:bg-gray-100 read-only:text-blue-600 read-only:font-semibold read-only:cursor-default"
                type="date"
                value={queryPeriodEnd}
                onChange={(e) => setQueryPeriod(queryPeriodStart, e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-7">
        <div className="flex items-center gap-2.5 mb-3.5 text-[15px] font-semibold">
          <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[13px] font-semibold shrink-0">2</span>
          수업 선택
        </div>

        <input
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white mb-3 outline-none placeholder:text-gray-400"
          placeholder="강좌명 또는 강사명 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex flex-col">
          <div className="border border-gray-200 rounded-[10px] bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 sticky top-0 z-[1]">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={toggleAll}>
                <div
                  className={cn(
                    'w-[18px] h-[18px] border-2 border-gray-300 rounded flex items-center justify-center text-[11px] text-transparent shrink-0',
                    allSelected && 'bg-gray-900 border-gray-900 text-white',
                  )}
                >
                  {allSelected && '✓'}
                </div>
                <span className="text-[13px] font-semibold text-gray-900">{allSelected ? '전체 해제' : '전체 선택'}</span>
              </div>
              <div className="flex items-center gap-2">
                {isLoaded && !isSelectionDirty ? (
                  <button
                    className="px-3.5 py-1.5 border border-emerald-200 rounded-md bg-emerald-50 text-emerald-600 text-[13px] font-semibold cursor-pointer whitespace-nowrap hover:bg-emerald-100 hover:border-emerald-300"
                    type="button"
                    onClick={unlockSelection}
                  >
                    ✓ 불러오기 완료 · 다시 선택
                  </button>
                ) : (
                  <button
                    className="px-3.5 py-1.5 border-none rounded-md bg-gray-900 text-white text-[13px] font-semibold cursor-pointer whitespace-nowrap disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-gray-700"
                    type="button"
                    disabled={selectedGangjwaIds.length === 0}
                    onClick={loadData}
                  >
                    불러오기 ({selectedGangjwaIds.length})
                  </button>
                )}
              </div>
            </div>

            {selectedGangjwaIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 py-2.5 bg-[#fafbfc] border-b border-gray-200">
                {selectedGangjwaIds.map((id) => {
                  const course = tikitaCourses.find((c) => c.id === id);
                  if (!course) return null;
                  return (
                    <button
                      key={id}
                      className="px-2.5 py-0.5 border border-gray-300 rounded-full bg-white text-xs text-gray-700 cursor-pointer flex items-center gap-1 whitespace-nowrap hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                      onClick={() => selectGangjwa(selectedGangjwaIds.filter((gid) => gid !== id))}
                    >
                      {course.name} ✕
                    </button>
                  );
                })}
              </div>
            )}

            <div className="max-h-[280px] overflow-y-auto">
              {filtered.map((course) => {
                const checked = selectedGangjwaIds.includes(course.id);
                const loaded = !isSelectionDirty && loadedData.some((cd) => cd.course.id === course.id);
                return (
                  <div
                    key={course.id}
                    className={cn(
                      'flex items-center px-4 py-3 border-b border-gray-100 gap-3 text-sm cursor-pointer transition-colors last:border-b-0 hover:bg-gray-50',
                      loaded && 'bg-emerald-50 border-b-emerald-200 hover:bg-emerald-100',
                    )}
                    onClick={() => toggleCourse(course.id)}
                  >
                    <div
                      className={cn(
                        'w-[18px] h-[18px] border-2 border-gray-300 rounded flex items-center justify-center text-[11px] text-transparent shrink-0',
                        checked && 'bg-gray-900 border-gray-900 text-white',
                      )}
                    >
                      {checked && '✓'}
                    </div>
                    <span className="flex-1 font-medium">{course.name}</span>
                    <span className="text-[13px] text-gray-500">
                      {course.studentCount}명 · {course.teacher} · {course.dayOfWeek} {course.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
