'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { StudentRow, AttendanceStatus, FindingSeverity, CourseRule } from '@/features/validator/types';
import type { SugangsaengAnalysisRow } from '@/aca/domain/sueop/validator';

const attendanceLabels: Record<AttendanceStatus, string> = {
  present: '출',
  absent: '결',
  late: '지',
  dongYoung: '동',
  bogang: '보',
  hyuGang: '휴',
};

const ATTENDANCE_ROTATE: AttendanceStatus[] = ['present', 'absent', 'late', 'dongYoung', 'bogang', 'hyuGang'];
function rotateAttendance(current: AttendanceStatus): AttendanceStatus {
  const idx = ATTENDANCE_ROTATE.indexOf(current);
  return ATTENDANCE_ROTATE[(idx + 1) % ATTENDANCE_ROTATE.length];
}

const attendanceCellClass: Record<AttendanceStatus, string> = {
  present: 'text-emerald-500 font-semibold',
  absent: 'text-red-500 font-semibold',
  late: 'text-amber-500 font-semibold',
  dongYoung: 'text-indigo-500 font-semibold text-xs',
  bogang: 'text-indigo-500 font-semibold text-xs',
  hyuGang: 'text-indigo-500 font-semibold text-xs',
};

const statusLabels: Record<StudentRow['status'], string> = {
  active: '재원',
  jeonban: '전반',
  toewon: '퇴원',
};

const highlightClassMap: Record<FindingSeverity, string> = {
  error: 'bg-red-50 text-red-600 font-bold border-2 border-red-300 rounded px-2 py-1.5 animate-[pulseError_1s_ease-out]',
  warning: 'bg-amber-50',
  info: 'bg-blue-50 text-blue-600 font-bold',
};

interface CellHighlight {
  row: number;
  col: string;
  severity: FindingSeverity;
}

export interface RowFinding {
  id: string;
  severity: FindingSeverity;
  message: string;
  reason: string;
  suggestion?: string;
}

interface SpreadsheetProps {
  students: StudentRow[];
  dates: string[];
  onChange?: (studentIdx: number, field: keyof StudentRow, value: string | number) => void;
  onAttendanceChange?: (studentIdx: number, date: string, value: AttendanceStatus) => void;
  onRowClick?: (studentName: string) => void;
  highlights?: CellHighlight[];
  rowFindings?: Record<number, RowFinding[]>;
  analysisRows?: SugangsaengAnalysisRow[] | null;
  readOnly?: boolean;
  showSummaryColumns?: boolean;
  showStatusColumn?: boolean;
  showDiscountColumn?: boolean;
  courseRule?: CourseRule;
}

function countPresent(attendance: Record<string, AttendanceStatus>): number {
  return Object.values(attendance).filter((s) => s === 'present' || s === 'late' || s === 'bogang').length;
}

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

export function Spreadsheet({
  students,
  dates,
  onChange,
  onAttendanceChange,
  highlights = [],
  rowFindings = {},
  analysisRows,
  onRowClick,
  readOnly = false,
  showSummaryColumns = false,
  showStatusColumn = true,
  showDiscountColumn = false,
  courseRule,
}: SpreadsheetProps) {
  const conductedCount = dates.filter((d) => students.some((s) => s.attendance[d] != null)).length;

  const [editing, setEditing] = useState<{ row: number; col: string } | null>(null);
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set());
  const [openTooltipRow, setOpenTooltipRow] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const [headerTip, setHeaderTip] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const initialStudentsRef = useRef(students);

  useEffect(() => {
    if (openTooltipRow === null) return;
    function handleClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setOpenTooltipRow(null);
        setTooltipPos(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openTooltipRow]);

  function toggleModified(row: number, col: string, currentValue: string | number) {
    const initial = initialStudentsRef.current[row];
    if (!initial) return;

    let originalValue: string | number;
    if (col === 'discount') originalValue = initial.discount;
    else if (col === 'status') originalValue = initial.status;
    else originalValue = initial.attendance[col] ?? 'absent';

    setModifiedCells((prev) => {
      const next = new Set(prev);
      const key = `${row}:${col}`;
      if (currentValue === originalValue) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function isModified(row: number, col: string) {
    return modifiedCells.has(`${row}:${col}`);
  }

  function getHighlight(row: number, col: string) {
    const h = highlights.find((hl) => hl.row === row && hl.col === col);
    return h ? highlightClassMap[h.severity] : null;
  }

  function handleAttendanceChange(studentIdx: number, date: string, value: AttendanceStatus) {
    onAttendanceChange?.(studentIdx, date, value);
    toggleModified(studentIdx, date, value);
  }

  function formatDate(d: string) {
    const day = parseInt(d.split('-')[2], 10);
    return `${day}일`;
  }

  return (
    <div className="w-full border border-gray-200 rounded-[10px] overflow-x-auto bg-white text-[13px]">
      <table className="w-full min-w-max border-collapse">
        <thead className="sticky top-0 z-[1]">
          <tr>
            <th className="bg-gray-900 px-2.5 py-2.5 text-left pl-3.5 font-semibold text-white border-b border-gray-700 text-xs w-20 sticky left-0 z-[2]">
              이름
            </th>
            {dates.map((d) => (
              <th key={d} className="bg-gray-900 px-2 py-2.5 text-center font-semibold text-white border-b border-gray-700 text-xs whitespace-nowrap w-12 min-w-12 max-w-12">
                {formatDate(d)}
              </th>
            ))}
            {showDiscountColumn && (
              <th className="bg-gray-900 px-2 py-2.5 text-center font-semibold text-white border-b border-gray-700 text-xs whitespace-nowrap w-12 min-w-12 max-w-12">
                할인
              </th>
            )}
            {showStatusColumn && (
              <th className="bg-gray-900 px-2 py-2.5 text-center font-semibold text-white border-b border-gray-700 text-xs whitespace-nowrap w-12 min-w-12 max-w-12">
                재원
              </th>
            )}
            {showSummaryColumns && (
              <>
                <th className="bg-gray-900 px-2 py-2.5 text-center font-semibold text-white border-b border-gray-700 text-xs whitespace-nowrap w-12 min-w-12 max-w-12">
                  출결수
                </th>
                <th className="bg-gray-900 px-2 py-2.5 text-center font-semibold text-white border-b border-gray-700 text-xs whitespace-nowrap w-20 min-w-20">
                  기대 납입금
                </th>
                <th className="bg-gray-900 px-2 py-2.5 text-center font-semibold text-white border-b border-gray-700 text-xs whitespace-nowrap w-20 min-w-20">
                  미납금
                </th>
                <th className="bg-gray-900 px-2 py-2.5 text-center font-semibold text-white border-b border-gray-700 text-xs whitespace-nowrap w-20 min-w-20">
                  실제 납입금
                </th>
                <th
                  className="bg-gray-900 px-2 py-2.5 text-center font-semibold text-white border-b border-gray-700 text-xs whitespace-nowrap w-20 min-w-20 cursor-help"
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setHeaderTip({ top: rect.top - 4, left: rect.left + rect.width / 2 });
                  }}
                  onMouseLeave={() => setHeaderTip(null)}
                >
                  차이
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {students.map((student, rowIdx) => {
            // Use validator analysis rows when available; fall back to local computation
            const aRow = analysisRows?.[rowIdx];
            const presentCount = aRow ? aRow.billableAttendanceCount : countPresent(student.attendance);
            const totalFee = aRow
              ? aRow.gyesanAmount
              : courseRule
                ? Math.round((courseRule.unitPrice * conductedCount + courseRule.gyojaeBi) * (1 - student.discount))
                : student.computedAmount;
            const minapDisplay = aRow ? aRow.minapAmount : student.unpaidAmount;
            const nabipDisplay = aRow ? aRow.nabipAmount : student.nabipAmount;
            const diff = aRow
              ? aRow.chayi
              : (() => {
                  const rawDiff = (student.unpaidAmount + student.nabipAmount) - totalFee;
                  return Math.abs(rawDiff) <= 1 ? 0 : rawDiff;
                })();

            return (
              <tr key={student.name}>
                <td className={cn(
                  'px-3.5 py-2 text-left font-medium border-b border-gray-100 sticky left-0 bg-white z-[1] whitespace-nowrap min-w-[70px]',
                  openTooltipRow === rowIdx && 'z-10',
                )}>
                  <div className="flex items-center gap-1.5">
                    <span>{student.name}</span>
                    {(rowFindings[rowIdx]?.length ?? 0) > 0 && (
                      <span className="relative inline-flex shrink-0" ref={openTooltipRow === rowIdx ? tooltipRef : undefined}>
                        <button
                          className={cn(
                            'w-[18px] h-[18px] rounded-full border-none text-[11px] font-bold leading-none cursor-pointer flex items-center justify-center shrink-0',
                            rowFindings[rowIdx].some((f) => f.severity === 'error')
                              ? 'bg-red-50 text-red-600 border-[1.5px] border-red-300'
                              : rowFindings[rowIdx].some((f) => f.severity === 'warning')
                                ? 'bg-amber-50 text-amber-600 border-[1.5px] border-amber-200'
                                : 'bg-blue-50 text-blue-600 border-[1.5px] border-blue-200',
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openTooltipRow === rowIdx) {
                              setOpenTooltipRow(null);
                              setTooltipPos(null);
                            } else {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const above = spaceBelow < 250;
                              setTooltipPos({
                                top: above ? rect.top : rect.bottom + 8,
                                left: rect.left - 8,
                                above,
                              });
                              setOpenTooltipRow(rowIdx);
                            }
                          }}
                        >
                          !
                        </button>
                        {openTooltipRow === rowIdx && tooltipPos && (
                          <div
                            className="fixed z-[1000] p-3.5 bg-white border border-gray-200 rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                            style={{
                              width: 360,
                              ...(tooltipPos.above
                                ? { bottom: window.innerHeight - tooltipPos.top + 8, left: tooltipPos.left, top: 'auto' }
                                : { top: tooltipPos.top, left: tooltipPos.left }),
                            }}
                          >
                            <div className={cn(
                              'absolute left-3.5 w-2.5 h-2.5 bg-white border-l border-t border-gray-200',
                              tooltipPos.above ? 'bottom-[-6px] rotate-[225deg]' : 'top-[-6px] rotate-45',
                            )} />
                            <div style={{ width: '100%', wordBreak: 'break-word', overflowWrap: 'break-word' }} className="flex flex-col gap-4">
                            {aRow?.amountBreakdown && aRow.amountBreakdown.lines.length > 0 && (
                              <div className="bg-gray-50 border border-gray-200 rounded-md px-2.5 py-2 text-[11px] text-gray-600 leading-snug whitespace-pre-line">
                                {aRow.amountBreakdown.explanation}
                              </div>
                            )}
                            {rowFindings[rowIdx].map((f) => (
                              <div key={f.id} className="flex flex-col gap-1">
                                <div className="flex items-start gap-1.5">
                                  <span className={cn(
                                    'text-[11px] font-semibold px-1.5 py-px rounded shrink-0 mt-px',
                                    f.severity === 'error' && 'bg-red-50 text-red-600',
                                    f.severity === 'warning' && 'bg-amber-50 text-amber-600',
                                    f.severity === 'info' && 'bg-blue-50 text-blue-600',
                                  )}>
                                    {f.severity === 'error' ? '에러' : f.severity === 'warning' ? '경고' : '정보'}
                                  </span>
                                  <span className="text-xs font-medium text-gray-800 leading-snug">{f.message}</span>
                                </div>
                                {f.reason && <div className="text-[11px] text-gray-500 leading-snug pl-0.5 whitespace-pre-line">{f.reason}</div>}
                                {f.suggestion && <div className="text-[11px] text-blue-500 leading-snug pl-0.5 whitespace-pre-line">{f.suggestion}</div>}
                              </div>
                            ))}
                            </div>
                          </div>
                        )}
                      </span>
                    )}
                  </div>
                </td>
                {dates.map((date) => {
                  const att = student.attendance[date];
                  const highlight = getHighlight(rowIdx, date);

                  return (
                    <td
                      key={date}
                      className={cn(
                        'px-2 py-2 text-center border-b border-gray-100 text-gray-700 text-[13px] whitespace-nowrap',
                        !readOnly && 'cursor-pointer',
                        highlight,
                        isModified(rowIdx, date) && 'outline-2 outline-amber-600 -outline-offset-1',
                      )}
                      onContextMenu={(e) => {
                        if (readOnly) return;
                        e.preventDefault();
                        const next = rotateAttendance(att ?? 'present');
                        handleAttendanceChange(rowIdx, date, next);
                      }}
                    >
                      <span className={att ? attendanceCellClass[att] : 'text-gray-300'}>
                        {att ? attendanceLabels[att] : '\u2014'}
                      </span>
                    </td>
                  );
                })}
                {showDiscountColumn && (
                  <td className={cn(
                    'px-2 py-2 text-center border-b border-gray-100 text-gray-700 text-[13px] whitespace-nowrap',
                    !readOnly && 'cursor-pointer',
                    isModified(rowIdx, 'discount') && 'outline-2 outline-amber-600 -outline-offset-1',
                  )}>
                    {editing?.row === rowIdx && editing?.col === 'discount' && !readOnly ? (
                      <input
                        className="border border-blue-600 rounded px-1.5 py-0.5 w-[60px] text-xs text-center outline-none"
                        type="number"
                        defaultValue={student.discount * 100}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value) / 100 || 0;
                          onChange?.(rowIdx, 'discount', val);
                          toggleModified(rowIdx, 'discount', val);
                          setEditing(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="text-[13px] text-gray-500"
                        onClick={() => !readOnly && setEditing({ row: rowIdx, col: 'discount' })}
                      >
                        {student.discount > 0 ? `${(student.discount * 100).toFixed(0)}%` : '0%'}
                      </span>
                    )}
                  </td>
                )}
                {showStatusColumn && (
                  <td className="px-2 py-2 text-center border-b border-gray-100 text-gray-700 text-[13px] whitespace-nowrap">
                    <span className={student.status === 'active' ? 'text-emerald-500 font-semibold' : 'text-[13px] font-medium text-gray-700'}>
                      {statusLabels[student.status]}
                    </span>
                  </td>
                )}
                {showSummaryColumns && (
                  <>
                    <td className="px-2 py-2 text-center border-b border-gray-100 text-gray-700 text-[13px] whitespace-nowrap">
                      {presentCount}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-100 text-gray-700 text-[13px] whitespace-nowrap">
                      {formatNumber(totalFee)}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-100 text-gray-700 text-[13px] whitespace-nowrap">
                      <span className={minapDisplay > 0 ? 'font-bold text-red-600' : undefined}>
                        {minapDisplay > 0 ? formatNumber(minapDisplay) : '0'}
                      </span>
                    </td>
                    <td className={cn(
                      'px-2 py-2 text-center border-b border-gray-100 text-gray-700 text-[13px] whitespace-nowrap',
                      getHighlight(rowIdx, 'nabip'),
                    )}>
                      <span className={diff !== 0 ? 'font-bold' : undefined}>
                        {formatNumber(nabipDisplay)}
                      </span>
                    </td>
                    <td
                      className={cn(
                        'px-2 py-2 text-center border-b border-gray-100 text-gray-700 text-[13px] whitespace-nowrap',
                        diff !== 0 && getHighlight(rowIdx, 'chayi'),
                        diff !== 0 && onRowClick && 'cursor-pointer',
                      )}
                      onClick={diff !== 0 ? () => onRowClick?.(student.name) : undefined}
                    >
                      <span className={diff !== 0 ? 'font-bold' : undefined}>
                        {diff === 0 ? '0' : `${diff > 0 ? '+' : ''}${formatNumber(diff)}`}
                      </span>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {headerTip && (
        <div
          className="fixed z-[1000] whitespace-nowrap rounded bg-gray-800 px-2.5 py-1.5 text-[11px] text-gray-200 shadow-lg"
          style={{ top: headerTip.top, left: headerTip.left, transform: 'translate(-50%, -100%)' }}
        >
          실제 납입금 − 기대 납입금. 0이면 정상
        </div>
      )}
    </div>
  );
}
