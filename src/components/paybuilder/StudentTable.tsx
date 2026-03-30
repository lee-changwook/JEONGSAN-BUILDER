'use client';

import { type CourseBlock, type StudentEntry } from '@/features/paybuilder/types';
import { computePayAmount, formatCurrency, totalCourseUnpaid } from '@/features/paybuilder/logic/utils';
import { cn } from '@/lib/utils';

type Props = {
  course: CourseBlock;
  feeRate: number;
  onUpdateStudent: (studentId: string, updater: (student: StudentEntry) => StudentEntry) => void;
  onRemoveStudent: (studentId: string) => void;
  onAddStudent: () => void;
};

const HEADERS = ['No.', '학생명', '실강회수', '납부액', '미납액', '납입방법', 'PAY', '비고', '관리'];

export function StudentTable({ course, feeRate, onUpdateStudent, onRemoveStudent, onAddStudent }: Props) {
  const unpaidTotal = totalCourseUnpaid(course);
  const unpaidCount = course.students.filter((s) => s.unpaidAmount > 0).length;

  return (
    <section className="bg-white border border-gray-200 rounded-[10px] overflow-x-auto p-3.5 shadow-md">
      <div className="flex justify-between items-center mb-3.5">
        <div className="grid gap-1">
          <h2 className="m-0 text-xl font-bold">학생별 정산</h2>
          <div className={cn('text-[13px]', unpaidTotal > 0 ? 'text-red-600' : 'text-gray-500')}>
            미납 학생 {unpaidCount}명, 미납 합계 {formatCurrency(unpaidTotal)}
          </div>
        </div>
        <button
          className="rounded-lg border-none bg-gray-900 text-white px-4 py-2.5 text-[13px] font-semibold cursor-pointer"
          type="button"
          onClick={onAddStudent}
        >
          학생 행 추가
        </button>
      </div>

      <table className="w-full border-separate border-spacing-0 min-w-[1080px] text-[13px]">
        <thead>
          <tr>
            {HEADERS.map((label) => (
              <th
                key={label}
                className="text-left px-2.5 py-2 border-b border-gray-900 text-xs font-semibold sticky top-0 bg-gray-900 text-white z-[1] whitespace-nowrap"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {course.students.map((student, index) => {
            const isUnpaid = student.unpaidAmount > 0;
            const isCarryOver = student.isCarryOver;
            const needsAttention = student.needsReview || isUnpaid || isCarryOver;

            return (
              <tr
                key={student.id}
                className={cn(
                  needsAttention ? 'bg-red-50 shadow-[inset_4px_0_0_#dc2626]' : 'bg-transparent',
                )}
              >
                <td
                  className={cn(
                    'px-2.5 py-2 text-center whitespace-nowrap',
                    needsAttention
                      ? 'border-b border-red-200 text-red-600 font-bold'
                      : 'border-b border-gray-200 text-gray-500',
                  )}
                >
                  {index + 1}
                </td>
                <td className={cn('p-1', needsAttention ? 'border-b border-red-200' : 'border-b border-gray-200')}>
                  <div className="grid gap-1">
                    {isCarryOver ? (
                      <div className="text-[11px] text-red-600 font-bold">{student.carryOverMonth}월 미납 이월</div>
                    ) : null}
                    <input
                      className={cn(
                        'w-full rounded-md bg-white px-2 py-[7px] text-[13px] leading-[1.3]',
                        needsAttention ? 'border border-red-300' : 'border border-gray-200',
                      )}
                      value={student.studentName}
                      onChange={(event) =>
                        onUpdateStudent(student.id, (s) => ({ ...s, studentName: event.target.value }))
                      }
                    />
                  </div>
                </td>
                <td className={cn('p-1', needsAttention ? 'border-b border-red-200' : 'border-b border-gray-200')}>
                  <input
                    className={cn(
                      'w-full rounded-md bg-white px-2 py-[7px] text-[13px] leading-[1.3]',
                      needsAttention ? 'border border-red-300' : 'border border-gray-200',
                    )}
                    type="number"
                    value={student.attendanceCount}
                    onChange={(event) =>
                      onUpdateStudent(student.id, (s) => ({
                        ...s,
                        attendanceCount: Number(event.target.value),
                        attendanceLabel: String(Number(event.target.value)),
                      }))
                    }
                  />
                </td>
                <td className={cn('p-1', needsAttention ? 'border-b border-red-200' : 'border-b border-gray-200')}>
                  <input
                    className={cn(
                      'w-full rounded-md bg-white px-2 py-[7px] text-[13px] leading-[1.3]',
                      needsAttention ? 'border border-red-300' : 'border border-gray-200',
                    )}
                    type="number"
                    value={student.paidAmount}
                    onChange={(event) =>
                      onUpdateStudent(student.id, (s) => {
                        const paidAmount = Number(event.target.value);
                        return {
                          ...s,
                          paidAmount,
                          payAmount: s.payOverridden
                            ? s.payAmount
                            : computePayAmount(paidAmount, s.paymentMethod, feeRate),
                        };
                      })
                    }
                  />
                </td>
                <td className={cn('p-1', needsAttention ? 'border-b border-red-200' : 'border-b border-gray-200')}>
                  <input
                    className={cn(
                      'w-full rounded-md bg-white px-2 py-[7px] text-[13px] leading-[1.3]',
                      needsAttention ? 'border border-red-300' : 'border border-gray-200',
                    )}
                    type="number"
                    value={student.unpaidAmount}
                    onChange={(event) =>
                      onUpdateStudent(student.id, (s) => ({ ...s, unpaidAmount: Number(event.target.value) }))
                    }
                  />
                </td>
                <td className={cn('p-1', needsAttention ? 'border-b border-red-200' : 'border-b border-gray-200')}>
                  <input
                    className={cn(
                      'w-full rounded-md bg-white px-2 py-[7px] text-[13px] leading-[1.3]',
                      needsAttention ? 'border border-red-300' : 'border border-gray-200',
                    )}
                    value={student.paymentMethod}
                    onChange={(event) =>
                      onUpdateStudent(student.id, (s) => ({
                        ...s,
                        paymentMethod: event.target.value,
                        payAmount: s.payOverridden
                          ? s.payAmount
                          : computePayAmount(s.paidAmount, event.target.value, feeRate),
                      }))
                    }
                  />
                </td>
                <td className={cn('p-1', needsAttention ? 'border-b border-red-200' : 'border-b border-gray-200')}>
                  <input
                    className={cn(
                      'w-full rounded-md bg-white px-2 py-[7px] text-[13px] leading-[1.3]',
                      needsAttention ? 'border border-red-300' : 'border border-gray-200',
                    )}
                    type="number"
                    value={student.payAmount}
                    onChange={(event) =>
                      onUpdateStudent(student.id, (s) => ({
                        ...s,
                        payAmount: Number(event.target.value),
                        payOverridden: true,
                      }))
                    }
                  />
                </td>
                <td className={cn('p-1', needsAttention ? 'border-b border-red-200' : 'border-b border-gray-200')}>
                  <input
                    className={cn(
                      'w-full rounded-md bg-white px-2 py-[7px] text-[13px] leading-[1.3]',
                      needsAttention ? 'border border-red-300' : 'border border-gray-200',
                    )}
                    value={student.note}
                    onChange={(event) =>
                      onUpdateStudent(student.id, (s) => ({ ...s, note: event.target.value }))
                    }
                  />
                </td>
                <td
                  className={cn(
                    'p-1 whitespace-nowrap',
                    needsAttention ? 'border-b border-red-200' : 'border-b border-gray-200',
                  )}
                >
                  <div className="flex gap-1.5 flex-wrap">
                    {isCarryOver ? (
                      <>
                        <button
                          className="rounded-md border border-red-300 bg-red-50 text-gray-900 px-[11px] py-[7px] text-xs cursor-pointer"
                          type="button"
                          onClick={() =>
                            onUpdateStudent(student.id, (s) => {
                              const paymentMethod = s.paymentMethod === '미납 이월' ? '' : s.paymentMethod;
                              const paidAmount = s.paidAmount + s.unpaidAmount;
                              return {
                                ...s,
                                paidAmount,
                                unpaidAmount: 0,
                                paymentMethod,
                                payAmount: s.payOverridden
                                  ? s.payAmount
                                  : computePayAmount(paidAmount, paymentMethod, feeRate),
                              };
                            })
                          }
                        >
                          전액 회수
                        </button>
                        <button
                          className="rounded-md border border-red-300 bg-red-50 text-gray-900 px-[11px] py-[7px] text-xs cursor-pointer"
                          type="button"
                          onClick={() => {
                            const raw = window.prompt(
                              '부분 회수 금액을 입력하세요.',
                              String(student.unpaidAmount),
                            );
                            if (raw === null) {
                              return;
                            }
                            const amount = Number(raw);
                            if (!Number.isFinite(amount) || amount <= 0 || amount > student.unpaidAmount) {
                              window.alert('부분 회수 금액은 현재 미납액 이하의 양수여야 합니다.');
                              return;
                            }
                            onUpdateStudent(student.id, (s) => {
                              const paymentMethod = s.paymentMethod === '미납 이월' ? '' : s.paymentMethod;
                              const paidAmount = s.paidAmount + amount;
                              return {
                                ...s,
                                paidAmount,
                                unpaidAmount: Math.max(0, s.unpaidAmount - amount),
                                paymentMethod,
                                payAmount: s.payOverridden
                                  ? s.payAmount
                                  : computePayAmount(paidAmount, paymentMethod, feeRate),
                              };
                            });
                          }}
                        >
                          부분 회수
                        </button>
                      </>
                    ) : null}
                    <button
                      className={cn(
                        'rounded-md text-gray-900 px-[11px] py-[7px] text-xs cursor-pointer',
                        needsAttention
                          ? 'border border-red-300 bg-red-50'
                          : 'border border-gray-200 bg-white',
                      )}
                      type="button"
                      onClick={() => onRemoveStudent(student.id)}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
