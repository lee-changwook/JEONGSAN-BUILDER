'use client';

import { cn } from '@/lib/utils';
import { SourceToggle } from '@/components/common/SourceToggle';
import { useValidatorStore } from '@/store/validator-store';
import { TikitaSetup } from './TikitaSetup';
import { AcaSetup } from './AcaSetup';

interface ChecklistChild {
  label: string;
  done: boolean;
}

interface ChecklistRow {
  id: string;
  label: string;
  done: boolean;
  value?: string;
  children?: ChecklistChild[];
}

function formatPeriod(start: string, end: string): string {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  const year = s.getFullYear();
  const sMonth = String(s.getMonth() + 1).padStart(2, '0');
  const sDay = String(s.getDate()).padStart(2, '0');
  const eMonth = String(e.getMonth() + 1).padStart(2, '0');
  const eDay = String(e.getDate()).padStart(2, '0');
  return `${year}-${sMonth}-${sDay} ~ ${eMonth}-${eDay}`;
}

interface Step1SetupProps {
  onNext: () => void;
}

export function Step1Setup({ onNext }: Step1SetupProps) {
  const { dataSource, setDataSource, selectedGangjwaIds, loadedData, queryPeriodStart, queryPeriodEnd, acaHoechaSchedule, acaStudentDiscounts } = useValidatorStore();

  const isTikita = dataSource === 'tikita';
  const courseCount = isTikita ? selectedGangjwaIds.length : loadedData.length;

  const loadedIds = loadedData.map((cd) => cd.course.id);
  const isDataSynced = loadedData.length > 0
    && selectedGangjwaIds.length === loadedIds.length
    && selectedGangjwaIds.every((id) => loadedIds.includes(id));

  const periodValue = formatPeriod(queryPeriodStart, queryPeriodEnd);
  const hasPeriod = !!queryPeriodStart && !!queryPeriodEnd;
  const hasSchedule = acaHoechaSchedule.length > 0 && acaHoechaSchedule.every((d) => d !== '');
  const hasDiscount = acaStudentDiscounts.length > 0 && acaStudentDiscounts.every((d) => d.name !== '');

  const checklist: ChecklistRow[] = isTikita
    ? [
      { id: 'source', label: '데이터 소스', done: true, value: '티키타' },
      { id: 'period', label: '조회 기간', done: hasPeriod, value: periodValue || undefined },
      { id: 'courses', label: '수업 선택', done: courseCount > 0, value: courseCount > 0 ? `${courseCount}개` : undefined },
      { id: 'load', label: '데이터 불러오기', done: isDataSynced },
    ]
    : [
      { id: 'source', label: '데이터 소스', done: true, value: 'ACA2000' },
      { id: 'period', label: '조회 기간', done: hasPeriod, value: periodValue || undefined },
      { id: 'upload', label: '엑셀 업로드', done: loadedData.length > 0 },
      {
        id: 'info',
        label: '대조할 정보',
        done: loadedData.length > 0 && hasSchedule,
        children: [
          { label: '조회 기간', done: hasPeriod },
          { label: '총 회차', done: loadedData.length > 0 },
          { label: '1회당 수강료', done: loadedData.length > 0 },
          { label: '교재비', done: loadedData.length > 0 },
          { label: '회차별 일정', done: hasSchedule },
          { label: `학생 할인율 (선택)`, done: hasDiscount },
        ],
      },
    ];

  const allDone = checklist.every((item) => item.done);

  return (
    <>
      <div className="mx-auto max-w-[1280px] min-h-[calc(100vh-130px)] px-10 py-8 pr-[360px]">
        <div className="pr-8">
          <div className="text-xl font-bold mb-1.5">데이터 소스 선택</div>

          <SourceToggle value={dataSource} onChange={setDataSource} />

          {isTikita ? <TikitaSetup /> : <AcaSetup />}
        </div>

        <div className="fixed top-[156px] right-[max(40px,calc((100vw-1280px)/2+40px))] w-[280px] border-l border-gray-200 pl-7 max-h-[calc(100vh-180px)] overflow-y-auto pb-6 pointer-events-none">
          <div className="pointer-events-auto">
          <div className="mb-7">
            <div className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3.5">선택한 옵션</div>
            <div className="flex flex-col gap-0.5">
              {checklist.map((item) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between py-2.5 text-sm text-gray-700 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0',
                          item.done
                            ? 'bg-emerald-500 text-white animate-[checkPulse_2s_ease-out_infinite]'
                            : 'bg-white border-2 border-gray-300',
                        )}
                      >
                        {item.done ? '✓' : ''}
                      </div>
                      <span>{item.label}</span>
                    </div>
                    {item.value && <span className="text-[13px] font-semibold text-blue-600">{item.value}</span>}
                  </div>
                  {item.children && (
                    <div className="flex flex-col pl-[9px] pb-1.5 relative">
                      {item.children.map((child, childIdx) => (
                        <div key={child.label} className="flex items-center gap-2 h-7 relative">
                          <div className="relative w-4 h-full shrink-0">
                            <div
                              className={cn(
                                'absolute left-0 top-0 w-px bg-gray-300',
                                childIdx === item.children!.length - 1 ? 'bottom-1/2' : 'bottom-0',
                              )}
                            />
                            <div className="absolute left-0 top-1/2 w-full h-px bg-gray-300" />
                          </div>
                          <div
                            className={cn(
                              'w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0',
                              child.done
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white border-[1.5px] border-gray-300',
                            )}
                          >
                            {child.done ? '✓' : ''}
                          </div>
                          <span className={cn('text-xs text-gray-400', child.done && 'text-gray-700')}>{child.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            className="w-full py-3 bg-gray-900 text-white border-none rounded-[10px] text-[15px] font-semibold cursor-pointer mt-6 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            disabled={!allDone}
            onClick={onNext}
          >
            대조 실행 →
          </button>
          </div>
        </div>
      </div>
    </>
  );
}
