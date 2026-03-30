'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FileUpload } from '@/components/validator/FileUpload';
import { useValidatorStore } from '@/store/validator-store';
import { parseStudentsFromExcel } from '@/utils/excel-parse';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function generateByDayOfWeek(
  startDate: string,
  endDate: string,
  selectedDays: number[],
  totalHoesu: number,
): string[] {
  if (!startDate || !endDate || selectedDays.length === 0 || totalHoesu <= 0) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end && dates.length < totalHoesu) {
    if (selectedDays.includes(cursor.getDay())) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}


export function AcaSetup() {
  const {
    loadedData,
    queryPeriodStart,
    queryPeriodEnd,
    acaHoechaSchedule,
    acaStudentDiscounts,
    setQueryPeriod,
    setAcaHoechaSchedule,
    setAcaStudentDiscounts,
    setLoadedDataFromExcel,
    updateCourseRule,
  } = useValidatorStore();
  const [uploaded, setUploaded] = useState(false);
  const [hoechaOverflow, setHoechaOverflow] = useState(false);
  const [genStartDate, setGenStartDate] = useState(queryPeriodStart);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [parsedSessionCount, setParsedSessionCount] = useState<number | null>(null);
  const [parsedSessionFee, setParsedSessionFee] = useState<number | null>(null);
  const [parsedGyojaeBi, setParsedGyojaeBi] = useState<number | null>(null);

  async function handleFileSelect(file: File) {
    setUploaded(true);

    const { students, sessionDates, courseMeta, courseData } = await parseStudentsFromExcel(file);

    if (courseData) {
      setLoadedDataFromExcel([courseData]);
    }

    if (students.length > 0) {
      setAcaStudentDiscounts(
        students.map((s) => ({
          name: s.name,
          school: s.school,
          grade: s.grade,
          parentPhone: s.parentPhone,
          rate: 0,
          previousUnpaid: s.previousUnpaid,
        })),
      );
    }

    if (sessionDates.length > 0) {
      setAcaHoechaSchedule(sessionDates);
    }

    if (courseMeta.sessionCount !== null) setParsedSessionCount(courseMeta.sessionCount);
    if (courseMeta.sessionFee !== null) setParsedSessionFee(courseMeta.sessionFee);
    if (courseMeta.gyojaeBi !== null) setParsedGyojaeBi(courseMeta.gyojaeBi);
  }

  const firstCourse = loadedData[0];

  function handleToggleDay(dayIdx: number) {
    setSelectedDays((prev) => (prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx]));
  }

  function handleAutoGenerate() {
    if (!firstCourse) return;
    const dates = generateByDayOfWeek(genStartDate, queryPeriodEnd, selectedDays, firstCourse.rule.totalHoesu);
    setAcaHoechaSchedule(dates);
  }

  function handleHoechaDateChange(index: number, value: string) {
    const updated = [...acaHoechaSchedule];
    updated[index] = value;
    setAcaHoechaSchedule(updated);
  }

  function handleAddHoecha() {
    if (!firstCourse) return;
    if (acaHoechaSchedule.length >= firstCourse.rule.totalHoesu) {
      setHoechaOverflow(true);
      setTimeout(() => setHoechaOverflow(false), 1000);
      return;
    }
    const defaultDate = queryPeriodStart ? queryPeriodStart.slice(0, 8) + '01' : '';
    setAcaHoechaSchedule([...acaHoechaSchedule, defaultDate]);
  }

  function handleRemoveHoecha(index: number) {
    setAcaHoechaSchedule(acaHoechaSchedule.filter((_, i) => i !== index));
  }

  function handleAddDiscount() {
    setAcaStudentDiscounts([...acaStudentDiscounts, { name: '', school: '', grade: '', parentPhone: '', rate: 0, previousUnpaid: 0 }]);
  }

  function handleDiscountChange(index: number, field: 'name' | 'school' | 'grade' | 'parentPhone' | 'rate' | 'previousUnpaid', value: string | number) {
    const updated = [...acaStudentDiscounts];
    updated[index] = { ...updated[index], [field]: value };
    setAcaStudentDiscounts(updated);
  }

  function handleRemoveDiscount(index: number) {
    setAcaStudentDiscounts(acaStudentDiscounts.filter((_, i) => i !== index));
  }

  return (
    <div>
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
          ACA2000 출결 현황 엑셀
        </div>
        <FileUpload onFileSelect={handleFileSelect} />
      </div>

      {uploaded && firstCourse && (
        <>
          <div className="mb-7">
            <div className="flex items-center gap-2.5 mb-3.5 text-[15px] font-semibold">
              <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[13px] font-semibold shrink-0">3</span>
              수강료 & 교재비 정보
            </div>
            <div className="bg-white border border-gray-200 rounded-[10px] p-5">
              <div className="flex gap-4 mb-3 last:mb-0">
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="text-[13px] text-gray-500">총 회차</div>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none read-only:bg-gray-100 read-only:text-blue-600 read-only:font-semibold read-only:cursor-default"
                    type="number"
                    placeholder="예: 8"
                    value={parsedSessionCount ?? ''}
                    onChange={(e) => { const v = Number(e.target.value) || null; setParsedSessionCount(v); if (v !== null) updateCourseRule({ totalHoesu: v }); }}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="text-[13px] text-gray-500">1회당 수강료</div>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none read-only:bg-gray-100 read-only:text-blue-600 read-only:font-semibold read-only:cursor-default"
                    type="number"
                    placeholder="예: 50000"
                    value={parsedSessionFee ?? ''}
                    onChange={(e) => { const v = Number(e.target.value) || null; setParsedSessionFee(v); if (v !== null) updateCourseRule({ unitPrice: v }); }}
                  />
                </div>
              </div>
              <div className="flex gap-4 mb-3 last:mb-0">
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="text-[13px] text-gray-500">총 수강료 (총 회차 × 1회당 수강료)</div>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none read-only:bg-gray-100 read-only:text-blue-600 read-only:font-semibold read-only:cursor-default"
                    type="text"
                    value={parsedSessionCount && parsedSessionFee ? `${(parsedSessionCount * parsedSessionFee).toLocaleString()}원` : ''}
                    readOnly
                    placeholder="자동 계산"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="text-[13px] text-gray-500">교재비</div>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none read-only:bg-gray-100 read-only:text-blue-600 read-only:font-semibold read-only:cursor-default"
                    type="number"
                    placeholder="예: 30000"
                    value={parsedGyojaeBi ?? ''}
                    onChange={(e) => { const v = Number(e.target.value) || null; setParsedGyojaeBi(v); if (v !== null) updateCourseRule({ gyojaeBi: v }); }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-7">
            <div className="flex items-center gap-2.5 mb-3.5 text-[15px] font-semibold">
              <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[13px] font-semibold shrink-0">4</span>
              회차별 일정
            </div>
            <div className="bg-white border border-gray-200 rounded-[10px] p-5">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 flex flex-col gap-3.5">
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="text-[13px] text-gray-500">시작일</div>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none read-only:bg-gray-100 read-only:text-blue-600 read-only:font-semibold read-only:cursor-default"
                      type="date"
                      value={genStartDate}
                      min={queryPeriodStart}
                      max={queryPeriodEnd}
                      onChange={(e) => setGenStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="text-[13px] text-gray-500">요일 선택</div>
                    <div className="flex gap-1.5">
                      {DAY_LABELS.map((label, idx) => (
                        <button
                          key={label}
                          className={cn(
                            'w-9 h-9 border border-gray-300 rounded-full bg-white text-[13px] font-medium text-gray-700 cursor-pointer flex items-center justify-center hover:bg-gray-100 hover:border-gray-400',
                            selectedDays.includes(idx) && 'bg-gray-900 border-gray-900 text-white hover:bg-gray-700 hover:border-gray-700',
                          )}
                          type="button"
                          onClick={() => handleToggleDay(idx)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  className="py-2.5 border-none rounded-md bg-gray-900 text-white text-sm font-semibold cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-gray-700"
                  type="button"
                  onClick={handleAutoGenerate}
                  disabled={selectedDays.length === 0}
                >
                  자동 생성
                </button>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-gray-500">
                  {acaHoechaSchedule.length}회 설정됨 / 총 {firstCourse.rule.totalHoesu}회
                </span>
              </div>
              <div className="flex flex-col gap-2 mb-3">
                {acaHoechaSchedule.map((date, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <span className="w-9 text-[13px] font-semibold text-gray-500 shrink-0 text-right">{idx + 1}회</span>
                    <input
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none focus:border-gray-900"
                      type="date"
                      value={date}
                      min={queryPeriodStart}
                      max={queryPeriodEnd}
                      onChange={(e) => handleHoechaDateChange(idx, e.target.value)}
                    />
                    <button
                      className="w-8 self-stretch border border-gray-200 rounded-md bg-white text-base text-gray-400 cursor-pointer flex items-center justify-center shrink-0 p-0 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                      type="button"
                      onClick={() => handleRemoveHoecha(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="w-full py-2 border border-dashed border-gray-300 rounded-md bg-white text-[13px] text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-gray-400 hover:text-gray-700"
                type="button"
                onClick={handleAddHoecha}
              >
                + 회차 추가
              </button>
              {hoechaOverflow && (
                <div className="text-xs text-red-600 text-center mt-1.5 animate-[hoechaFadeInOut_1s_ease-out_forwards]">총 회차({firstCourse.rule.totalHoesu}회)를 넘었습니다</div>
              )}
            </div>
          </div>

          <div className="mb-7">
            <div className="flex items-center gap-2.5 mb-3.5 text-[15px] font-semibold">
              <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[13px] font-semibold shrink-0">5</span>
              수강생 정보
            </div>
            <div className="bg-white border border-gray-200 rounded-[10px] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-gray-500">
                  {acaStudentDiscounts.length}명 등록됨
                </span>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500">
                  <span className="w-8 shrink-0 text-center">No.</span>
                  <span className="w-[72px] shrink-0">이름</span>
                  <span className="w-20 shrink-0">학교</span>
                  <span className="w-[52px] shrink-0">학년</span>
                  <span className="w-[76px] shrink-0">연락처(뒤4)</span>
                  <span className="w-[100px] shrink-0">전월 미납액</span>
                  <span className="w-20 shrink-0">할인율 (선택)</span>
                  <span className="w-7 shrink-0" />
                </div>
                {acaStudentDiscounts.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-[#fafbfc]">
                    <span className="w-8 shrink-0 text-center text-[13px] text-gray-400 font-semibold">{idx + 1}</span>
                    <span className="w-[72px] shrink-0">
                      <input
                        className="w-full px-2 py-1.5 border border-transparent rounded text-[13px] bg-transparent outline-none text-gray-900 placeholder:text-gray-300 hover:border-gray-200 focus:border-gray-900 focus:bg-white"
                        type="text"
                        placeholder="이름"
                        value={item.name}
                        onChange={(e) => handleDiscountChange(idx, 'name', e.target.value)}
                      />
                    </span>
                    <span className="w-20 shrink-0">
                      <input
                        className="w-full px-2 py-1.5 border border-transparent rounded text-[13px] bg-transparent outline-none text-gray-900 placeholder:text-gray-300 hover:border-gray-200 focus:border-gray-900 focus:bg-white"
                        type="text"
                        placeholder="학교"
                        value={item.school}
                        onChange={(e) => handleDiscountChange(idx, 'school', e.target.value)}
                      />
                    </span>
                    <span className="w-[52px] shrink-0">
                      <select
                        className="w-full px-1 py-1.5 border border-transparent rounded text-[13px] bg-transparent outline-none text-gray-900 appearance-none hover:border-gray-200 focus:border-gray-900 focus:bg-white"
                        value={item.grade}
                        onChange={(e) => handleDiscountChange(idx, 'grade', e.target.value)}
                      >
                        <option value="">-</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </span>
                    <span className="w-[76px] shrink-0">
                      <input
                        className="w-full px-2 py-1.5 border border-transparent rounded text-[13px] bg-transparent outline-none text-gray-900 placeholder:text-gray-300 hover:border-gray-200 focus:border-gray-900 focus:bg-white"
                        type="tel"
                        placeholder="0000"
                        value={item.parentPhone}
                        onChange={(e) => handleDiscountChange(idx, 'parentPhone', e.target.value)}
                      />
                    </span>
                    <span className="w-[100px] shrink-0">
                      <input
                        className="w-full px-2 py-1.5 border border-transparent rounded text-[13px] bg-transparent outline-none text-gray-900 text-right placeholder:text-gray-300 hover:border-gray-200 focus:border-gray-900 focus:bg-white"
                        type="number"
                        min={0}
                        value={item.previousUnpaid}
                        onChange={(e) => handleDiscountChange(idx, 'previousUnpaid', Math.max(0, Number(e.target.value) || 0))}
                      />
                    </span>
                    <span className="w-20 shrink-0 flex items-center gap-0.5">
                      <input
                        className="w-full px-2 py-1.5 border border-transparent rounded text-[13px] bg-transparent outline-none text-gray-900 text-right placeholder:text-gray-300 hover:border-gray-200 focus:border-gray-900 focus:bg-white"
                        type="number"
                        min={0}
                        max={100}
                        value={item.rate}
                        onChange={(e) => handleDiscountChange(idx, 'rate', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      />
                      <span className="text-xs text-gray-400 shrink-0">%</span>
                    </span>
                    <span className="w-7 shrink-0 flex items-center justify-center">
                      <button
                        className="w-6 h-6 border-none rounded bg-transparent text-sm text-gray-300 cursor-pointer flex items-center justify-center p-0 hover:bg-red-50 hover:text-red-600"
                        type="button"
                        onClick={() => handleRemoveDiscount(idx)}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                ))}
              </div>
              <button
                className="w-full py-2 border border-dashed border-gray-300 rounded-md bg-white text-[13px] text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-gray-400 hover:text-gray-700"
                type="button"
                onClick={handleAddDiscount}
              >
                + 학생 추가
              </button>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
