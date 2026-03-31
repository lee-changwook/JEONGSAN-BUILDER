'use client';

import { Spreadsheet } from '@/components/validator/Spreadsheet';
import { useValidatorStore } from '@/store/validator-store';
import { makeDates } from '@/mocks/shared-data';
import type { FindingSeverity } from '@/features/validator/types';

export function Step2Validation() {
  const {
    report,
    findingStatuses,
    loadedData,
    dataSource,
    selectedMonth,
    acaSpreadsheetData,
    updateAttendanceCell,
  } = useValidatorStore();

  const isTikita = dataSource === 'tikita';

  const activeCourse = loadedData[0] ?? null;
  const courseId = activeCourse?.course.id ?? '';
  const students = isTikita
    ? activeCourse?.students ?? []
    : acaSpreadsheetData[courseId] ?? activeCourse?.students ?? [];
  const dates = activeCourse
    ? (isTikita ? makeDates(activeCourse.course.dayOfWeek) : activeCourse.rule.hoechaSchedule)
    : [];

  const conductedCount = dates.filter((d) => students.some((s) => s.attendance[d] != null)).length;

  const errorCount = report?.summary.errorCount ?? 0;
  const warningCount = report?.summary.warningCount ?? 0;
  const issueStudentNames = new Set(
    report?.analysisRows
      .filter((row) => row.findings.some((f) => f.severity === 'error' || f.severity === 'warning'))
      .map((row) => row.sugangsaengName) ?? [],
  );
  const normalCount = (report?.analysisRows.length ?? 0) - issueStudentNames.size;

  const rowFindingsMap: Record<number, Array<{ id: string; severity: FindingSeverity; message: string; reason: string; suggestion?: string }>> = {};
  if (report) {
    report.analysisRows.forEach((row, rowIdx) => {
      const pending = row.findings.filter(
        (f) => {
          const fAny = f as { id?: string };
          return (f.severity === 'error' || f.severity === 'warning' || f.severity === 'info')
            && (findingStatuses[fAny.id ?? ''] ?? 'pending') === 'pending';
        },
      );
      if (pending.length > 0) {
        rowFindingsMap[rowIdx] = pending.map((f) => {
          const fAny = f as { id?: string };
          return {
            id: fAny.id ?? `rf-${rowIdx}-${Math.random().toString(36).slice(2, 8)}`,
            severity: f.severity,
            message: f.message,
            reason: f.reason,
            suggestion: f.suggestion,
          };
        });
      }
    });
  }

  const highlights: Array<{ row: number; col: string; severity: FindingSeverity }> = [];
  if (report) {
    report.analysisRows.forEach((row, rowIdx) => {
      if (row.chayiHighlight) {
        highlights.push({ row: rowIdx, col: 'chayi', severity: row.chayiHighlight.severity });
        highlights.push({ row: rowIdx, col: 'nabip', severity: row.chayiHighlight.severity });
      }
      if (row.statusHighlight && isTikita) {
        highlights.push({ row: rowIdx, col: 'status', severity: row.statusHighlight.severity });
      }
      for (const cell of row.attendanceCells) {
        if (cell.highlight && cell.date) {
          highlights.push({ row: rowIdx, col: cell.date, severity: cell.highlight.severity });
        }
      }
    });
  }

  // Pass validator analysis rows to Spreadsheet for summary columns
  const analysisRows = report?.analysisRows ?? null;

  return (
    <>
      <div className="mx-auto max-w-[1400px] min-h-[calc(100vh-130px)] px-10 py-8 pr-[390px] pb-[60px]">
        <div className="pr-8">
          {activeCourse && (
            <div className="flex justify-between items-center gap-4 px-5 py-4 bg-gray-900 border border-gray-700 rounded-[10px] mb-4">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-base font-bold text-white">{activeCourse.course.name}</span>
              </div>
              <span className="shrink-0 px-3 py-1 bg-white/10 border border-white/20 rounded-md text-xs font-semibold text-white/80 flex items-center gap-2">
                {isTikita ? '티키타' : 'ACA2000'}
                <span className="w-px h-3 bg-white/20" />
                <span className="font-normal text-white/60">
                  {isTikita
                    ? '출결·할인율을 클릭하여 수정 가능'
                    : 'ACA2000에서 데이터를 수정하세요'}
                </span>
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <Spreadsheet
              students={students}
              dates={dates}
              highlights={highlights}
              rowFindings={rowFindingsMap}
              analysisRows={analysisRows}
              showSummaryColumns
              showStatusColumn={isTikita}
              showDiscountColumn={isTikita}
              courseRule={activeCourse?.rule}
              readOnly={!isTikita}
              onAttendanceChange={(studentIdx, date, value) => updateAttendanceCell(studentIdx, date, value)}
            />
          </div>
        </div>

        <div className="fixed top-[156px] right-[max(40px,calc((100vw-1400px)/2+40px))] w-[310px] border-l border-gray-200 pl-7 pr-4 max-h-[calc(100vh-180px)] overflow-y-auto pb-6 pointer-events-none">
          <div className="pointer-events-auto">
          <div className="py-5">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center px-2 py-3 rounded-[10px] border bg-red-50 border-red-200">
                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                <div className="text-xs text-gray-500 mt-0.5">에러</div>
              </div>
              <div className="text-center px-2 py-3 rounded-[10px] border bg-amber-50 border-amber-200">
                <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
                <div className="text-xs text-gray-500 mt-0.5">경고</div>
              </div>
              <div className="text-center px-2 py-3 rounded-[10px] border bg-emerald-50 border-emerald-300">
                <div className="text-2xl font-bold text-emerald-600">{normalCount}</div>
                <div className="text-xs text-gray-500 mt-0.5">정상</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2.5 text-center">이름 옆 아이콘을 클릭하면 상세 정보 확인</div>
          </div>

          <div className="h-px bg-gray-200" />

          <div className="py-5">
            <div className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3.5">대조 요약</div>
            {report && (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between py-2 text-[13px] border-b border-gray-100 last:border-b-0">
                  <span className="text-gray-700">총 출결 수</span>
                  <span className="font-semibold text-gray-900">{report.sueopSummary.totalBillableAttendanceCount}회</span>
                </div>
                <div className="flex items-center justify-between py-2 text-[13px] border-b border-gray-100 last:border-b-0">
                  <span className="text-gray-700">총 기대 납입금</span>
                  <span className="font-semibold text-gray-900">{report.sueopSummary.expectedTotalAmount.toLocaleString()}원</span>
                </div>
                <div className="flex items-center justify-between py-2 text-[13px] border-b border-gray-100 last:border-b-0">
                  <span className="text-gray-700">총 실제 납입금</span>
                  <span className="font-semibold text-gray-900">{report.sueopSummary.inScope.nabipTotal.toLocaleString()}원</span>
                </div>
                <div className="flex items-center justify-between py-2 text-[13px] border-b border-gray-100 last:border-b-0">
                  <span className="text-gray-700">총 미납금</span>
                  <span className={report.sueopSummary.inScope.minapTotal > 0 ? 'font-semibold text-red-600' : 'font-medium text-emerald-500'}>
                    {report.sueopSummary.inScope.minapTotal > 0 ? `${report.sueopSummary.inScope.minapTotal.toLocaleString()}원` : '없음'}
                  </span>
                </div>
                {report.sueopSummary.inScope.harinTotal > 0 && (
                  <div className="flex items-center justify-between py-2 text-[13px] border-b border-gray-100 last:border-b-0">
                    <span className="text-gray-700">총 할인금</span>
                    <span className="font-semibold text-gray-900">{report.sueopSummary.inScope.harinTotal.toLocaleString()}원</span>
                  </div>
                )}
                {report.sueopSummary.totalChayi !== 0 && (
                  <div className="flex items-center justify-between py-2 text-[13px] border-b border-gray-100 last:border-b-0">
                    <span className="text-gray-700">총 차이</span>
                    <span className={report.sueopSummary.totalChayi > 0 ? 'font-semibold text-red-600' : 'font-semibold text-blue-600'}>
                      {report.sueopSummary.totalChayi > 0 ? '+' : ''}{report.sueopSummary.totalChayi.toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-px bg-gray-200" />

          {activeCourse && (
            <div className="py-5">
              <div className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3.5">강좌 정보</div>
              <div className="flex justify-between py-1.5 text-sm text-gray-700">
                <span>수업 기간</span>
                <span className="font-semibold text-gray-900">{selectedMonth}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm text-gray-700">
                <span>대조 기간</span>
                <span className="font-semibold text-gray-900">
                  {activeCourse.rule.queryPeriodStart} ~ {activeCourse.rule.queryPeriodEnd.slice(5)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 text-sm text-gray-700">
                <span>강사</span>
                <span className="font-semibold text-gray-900">
                  {activeCourse.course.isClinic
                    ? `${activeCourse.course.teacher}의 조교`
                    : activeCourse.course.teacher}
                </span>
              </div>
              <div className="flex justify-between py-1.5 text-sm text-gray-700">
                <span>실강횟수 / 총 회차</span>
                <span className="font-semibold text-gray-900">{conductedCount}회 / {activeCourse.rule.totalHoesu}회</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm text-gray-700">
                <span>1회당 수강료</span>
                <span className="font-semibold text-gray-900">{activeCourse.rule.unitPrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm text-gray-700">
                <span>교재비</span>
                <span className="font-semibold text-gray-900">{activeCourse.rule.gyojaeBi.toLocaleString()}원</span>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

    </>
  );
}
