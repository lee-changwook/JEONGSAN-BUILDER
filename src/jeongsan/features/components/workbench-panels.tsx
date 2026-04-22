"use client";

import Link from "next/link";
import { useState } from "react";
import { useJeongsanBuilder } from "@/jeongsan/features/jeongsan-builder-provider";
import type { CourseSettlement, PayoutRow } from "@/jeongsan/features/types";
import {
  ActionButton,
  DenseInput,
  formatCurrency,
  Input,
  Textarea,
} from "@/jeongsan/features/components/jeongsan-ui";

function payoutRowForCourse(courses: CourseSettlement[], payoutRows: PayoutRow[], courseId: string): PayoutRow | undefined {
  const byId = payoutRows.find((row) => row.courseId === courseId);
  if (byId) {
    return byId;
  }
  const index = courses.findIndex((c) => c.id === courseId);
  return index >= 0 ? payoutRows[index] : undefined;
}

export function TeacherSettlementPanel() {
  const {
    month,
    selectedTeacher,
    updateCourse,
    updateStudent,
    addStudent,
    removeStudent,
    updateTeacherNote,
    updatePayoutRow,
    updateCampusLabel,
    addExtraPayoutLine,
    updateExtraPayoutLine,
    removeExtraPayoutLine,
  } = useJeongsanBuilder();
  const [openCourseState, setOpenCourseState] = useState<{ teacherId: string | undefined; courseId: string | null }>({ teacherId: undefined, courseId: null });

  const openCourseId = openCourseState.teacherId === selectedTeacher?.id ? openCourseState.courseId : null;
  const setOpenCourseId = (courseId: string | null) => {
    setOpenCourseState({ teacherId: selectedTeacher?.id, courseId });
  };

  if (!selectedTeacher) {
    return <EmptyState message="왼쪽에서 강사를 선택하면 강사 정산(강좌·지급)을 편집할 수 있습니다." />;
  }

  const s = selectedTeacher.summary;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <section className="rounded-xl border border-[var(--jb-line)] bg-[var(--jb-field)] p-4 shadow-sm">
        <div className="grid gap-1">
          <div className="text-[11px] font-medium text-[var(--jb-muted)]">{selectedTeacher.subjectName || "과목 미지정"}</div>
          <h2 className="m-0 text-xl font-semibold text-[var(--jb-text)]">{selectedTeacher.teacherName}</h2>
          <p className="m-0 text-xs text-[var(--jb-muted)]">
            총매출 {formatCurrency(s.totalSalesAmount)} · 총지급 {formatCurrency(s.totalPayoutAmount)} · 최종 {formatCurrency(s.finalTeacherPay)}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--jb-line)] bg-[var(--jb-field)] p-4 shadow-sm">
        <div className="grid gap-2">
          <div className="text-[13px] font-semibold text-[var(--jb-text)]">급여대장 엑셀 제목(관·캠퍼스)</div>
          <p className="m-0 text-xs text-[var(--jb-muted)] leading-relaxed">
            샘플처럼 첫 행에 「고등1관 2월 결산자료(2025년)」 형태로 들어갑니다. 앞부분만 바꿉니다.
          </p>
          <Input
            value={selectedTeacher.campusLabel ?? "고등1관"}
            onChange={(event) => updateCampusLabel(selectedTeacher.id, event.target.value)}
            placeholder="예: 고등1관"
          />
        </div>
      </section>

      <section className="rounded-xl border border-[var(--jb-line)] bg-[var(--jb-field)] p-4 shadow-sm">
        <div className="grid gap-2">
          <div className="text-[13px] font-semibold text-[var(--jb-text)]">강사 메모</div>
          <Textarea
            className="max-w-2xl resize-y"
            value={selectedTeacher.note}
            onChange={(event) => updateTeacherNote(selectedTeacher.id, event.target.value)}
          />
        </div>
      </section>

      <div>
        <div className="mb-2 text-[13px] font-semibold text-[var(--jb-text)]">강좌 목록 · 강사지급</div>
        <p className="m-0 mb-2 text-xs text-[var(--jb-muted)]">
          강좌를 펼치면 학생 명세와 페이 문서 기준 지급 입력란이 함께 나옵니다.
        </p>
        <div className="overflow-hidden rounded-lg border border-[var(--jb-line)] bg-white">
          {selectedTeacher.courses.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-[var(--jb-muted)]">이 강사에 해당하는 강좌가 없습니다.</div>
          ) : null}
          {selectedTeacher.courses.map((course) => {
            const payoutRow = payoutRowForCourse(selectedTeacher.courses, selectedTeacher.payoutRows, course.id);
            const isCourseOpen = openCourseId === course.id;
            const kindLabel =
              course.sheetKind === "material" ? "교재비" : course.sheetKind === "arrears" ? "장기미납" : "강좌";
            return (
              <div key={course.id} className="border-b border-[var(--jb-line)] last:border-b-0">
                <div className="flex flex-col gap-2 bg-[var(--jb-surface)]/50 px-2 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <button
                      type="button"
                      aria-expanded={isCourseOpen}
                      onClick={() => setOpenCourseId(isCourseOpen ? null : course.id)}
                      className="mt-0.5 shrink-0 text-[var(--jb-muted)] hover:text-[var(--jb-text)]"
                    >
                      {isCourseOpen ? "▼" : "▶"}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-[var(--jb-muted)]">{kindLabel}</span>
                        <span className="truncate text-[13px] font-semibold text-[var(--jb-text)] sm:text-[14px]">{course.courseName || "강좌"}</span>
                      </div>
                      <div className="truncate text-[11px] text-[var(--jb-muted)]" title={`${course.sourceWorkbook} / ${course.sourceSheet}`}>
                        {course.sourceWorkbook}
                        <span className="text-[var(--jb-muted)]/80"> / {course.sourceSheet}</span>
                      </div>
                    </div>
                  </div>

                  {payoutRow ? (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
                      <label className="grid gap-0.5">
                        <span className="text-[10px] font-semibold text-[var(--jb-muted)]">총매출</span>
                        <span className="text-[13px] font-medium tabular-nums text-[var(--jb-text)]">{formatCurrency(payoutRow.totalSalesAmount)}</span>
                      </label>
                      <label className="grid min-w-[4rem] gap-0.5">
                        <span className="text-[10px] font-semibold text-[var(--jb-muted)]">비율</span>
                        <Input
                          className="h-8 py-1 text-[13px]"
                          value={payoutRow.ratio ?? ""}
                          onChange={(event) =>
                            updatePayoutRow(selectedTeacher.id, payoutRow.id, (current) => ({
                              ...current,
                              ratio: event.target.value === "" ? null : Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label className="grid min-w-[4rem] gap-0.5">
                        <span className="text-[10px] font-semibold text-[var(--jb-muted)]">시수</span>
                        <Input
                          className="h-8 py-1 text-[13px]"
                          value={payoutRow.hours ?? ""}
                          onChange={(event) =>
                            updatePayoutRow(selectedTeacher.id, payoutRow.id, (current) => ({
                              ...current,
                              hours: event.target.value === "" ? null : Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label className="grid gap-0.5">
                        <span className="text-[10px] font-semibold text-[var(--jb-muted)]">지급액</span>
                        <span className="text-[13px] font-semibold tabular-nums text-[var(--jb-accent)]">{formatCurrency(payoutRow.payoutAmount)}</span>
                      </label>
                      <div className="col-span-2 text-right text-[12px] text-[var(--jb-muted)] sm:col-span-1 sm:ml-auto sm:text-left">
                        학생 {course.rows.length}명
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-800">이 강좌에 연결된 지급 행을 찾을 수 없습니다.</div>
                  )}
                </div>

                {isCourseOpen && payoutRow ? (
                  <div className="grid gap-3 border-t border-[var(--jb-line)] bg-[var(--jb-surface)] p-2 sm:p-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="grid min-w-[120px] flex-1 gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--jb-muted)]">강좌명</span>
                        <DenseInput
                          value={course.courseName}
                          onChange={(event) =>
                            updateCourse(course.id, (current) => ({
                              ...current,
                              courseName: event.target.value,
                              detailSnapshot: null,
                            }))
                          }
                        />
                      </label>
                      <label className="grid min-w-[140px] flex-1 gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--jb-muted)]">요일 및 시간</span>
                        <DenseInput
                          value={course.scheduleText}
                          onChange={(event) =>
                            updateCourse(course.id, (current) => ({
                              ...current,
                              scheduleText: event.target.value,
                              detailSnapshot: null,
                            }))
                          }
                        />
                      </label>
                      <ActionButton tone="ghost" className="h-7 shrink-0 px-3 py-0 text-[11px]" onClick={() => addStudent(course.id)}>
                        학생 추가
                      </ActionButton>
                    </div>

                    <div className="overflow-x-auto rounded border border-[var(--jb-line)] bg-white">
                      <table className="w-full min-w-[720px] border-collapse text-[11px]">
                        <thead>
                          <tr>
                            {["학생명", "실강", "납부", "미납", "납입", "PAY", "출처", " "].map((label, hi) => (
                              <th
                                key={`h-${hi}`}
                                className="border-b border-[var(--jb-line)] bg-[var(--jb-surface)] px-1.5 py-1 text-left font-semibold text-[10px] text-[var(--jb-muted)] whitespace-nowrap"
                              >
                                {label.trim() === "" ? "\u00a0" : label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {course.rows.map((row) => {
                            const sourceTitle = `${row.source.workbookName} / ${row.source.sheetName}:${row.source.rowNumber}`;
                            const sourceShort = `${row.source.sheetName}:${row.source.rowNumber}`;
                            return (
                              <tr key={row.id} className={row.needsReview ? "bg-amber-50/90" : "bg-white"}>
                                <td className="border-b border-[var(--jb-line)]/80 px-1 py-0.5 align-middle">
                                  <DenseInput
                                    value={row.studentNameRaw}
                                    onChange={(event) =>
                                      updateStudent(course.id, row.id, (current) => ({
                                        ...current,
                                        studentName: event.target.value,
                                        studentNameRaw: event.target.value,
                                      }))
                                    }
                                  />
                                </td>
                                <td className="w-12 border-b border-[var(--jb-line)]/80 px-1 py-0.5 align-middle">
                                  <DenseInput
                                    className="text-center tabular-nums"
                                    value={row.attendanceRaw}
                                    onChange={(event) =>
                                      updateStudent(course.id, row.id, (current) => ({
                                        ...current,
                                        attendanceRaw: event.target.value,
                                        attendanceCount: Number(event.target.value || 0),
                                      }))
                                    }
                                  />
                                </td>
                                <td className="w-[88px] border-b border-[var(--jb-line)]/80 px-1 py-0.5 align-middle">
                                  <DenseInput
                                    className="tabular-nums"
                                    value={row.paidAmountRaw}
                                    onChange={(event) =>
                                      updateStudent(course.id, row.id, (current) => ({
                                        ...current,
                                        paidAmountRaw: event.target.value,
                                        paidAmount: Number(event.target.value || 0),
                                      }))
                                    }
                                  />
                                </td>
                                <td className="w-[88px] border-b border-[var(--jb-line)]/80 px-1 py-0.5 align-middle">
                                  <DenseInput
                                    className="tabular-nums"
                                    value={row.unpaidAmountRaw}
                                    onChange={(event) =>
                                      updateStudent(course.id, row.id, (current) => ({
                                        ...current,
                                        unpaidAmountRaw: event.target.value,
                                        unpaidAmount: Number(event.target.value || 0),
                                      }))
                                    }
                                  />
                                </td>
                                <td className="w-[72px] border-b border-[var(--jb-line)]/80 px-1 py-0.5 align-middle">
                                  <DenseInput
                                    value={row.paymentMethod}
                                    onChange={(event) =>
                                      updateStudent(course.id, row.id, (current) => ({
                                        ...current,
                                        paymentMethod: event.target.value,
                                      }))
                                    }
                                  />
                                </td>
                                <td className="w-[88px] border-b border-[var(--jb-line)]/80 px-1 py-0.5 align-middle">
                                  <DenseInput
                                    className="tabular-nums"
                                    value={row.payAmountRaw}
                                    onChange={(event) =>
                                      updateStudent(course.id, row.id, (current) => ({
                                        ...current,
                                        payAmountRaw: event.target.value,
                                        payAmount: Number(event.target.value || 0),
                                      }))
                                    }
                                  />
                                </td>
                                <td className="max-w-[100px] border-b border-[var(--jb-line)]/80 px-1 py-0.5 align-middle" title={sourceTitle}>
                                  <span className="block truncate text-[10px] leading-tight text-[var(--jb-muted)]">{sourceShort}</span>
                                </td>
                                <td className="w-14 border-b border-[var(--jb-line)]/80 px-0.5 py-0.5 align-middle text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeStudent(course.id, row.id)}
                                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--jb-muted)] hover:bg-red-50 hover:text-[var(--jb-danger)]"
                                  >
                                    삭제
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <div className="mb-1.5 text-[12px] font-semibold text-[var(--jb-text)]">강좌별 지급 (페이 문서 기준)</div>
                      <div className="overflow-x-auto rounded border border-[var(--jb-line)] bg-white">
                        <table className="min-w-full border-separate border-spacing-0 text-[12px]">
                          <thead>
                            <tr>
                              {["강좌명", "요일 및 시간", "전월누적미납액", "전월미납 납부액", `${month}월납부액`, `${month}월미납액`, `${month}월누적총매출액`, "비율", "시수", "강좌별지급액", "비고"].map((label) => (
                                <th key={label} className="border-b border-[var(--jb-line)] bg-[var(--jb-surface)] px-2 py-1.5 text-left text-[10px] font-semibold whitespace-nowrap">
                                  {label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className={payoutRow.needsReview ? "bg-amber-50/80" : "bg-white"}>
                              <td className="border-b border-[var(--jb-line)] px-2 py-1.5">
                                <Input
                                  value={payoutRow.courseName}
                                  onChange={(event) => {
                                    const v = event.target.value;
                                    updatePayoutRow(selectedTeacher.id, payoutRow.id, (current) => ({ ...current, courseName: v }));
                                    updateCourse(course.id, (current) => ({ ...current, courseName: v, detailSnapshot: null }));
                                  }}
                                />
                              </td>
                              <td className="border-b border-[var(--jb-line)] px-2 py-1.5">
                                <Input
                                  value={payoutRow.scheduleText}
                                  onChange={(event) => {
                                    const v = event.target.value;
                                    updatePayoutRow(selectedTeacher.id, payoutRow.id, (current) => ({ ...current, scheduleText: v }));
                                    updateCourse(course.id, (current) => ({ ...current, scheduleText: v, detailSnapshot: null }));
                                  }}
                                />
                              </td>
                              <td className="border-b border-[var(--jb-line)] px-2 py-1.5 font-medium">{formatCurrency(payoutRow.previousOutstandingAmount)}</td>
                              <td className="border-b border-[var(--jb-line)] px-2 py-1.5 font-medium">{formatCurrency(payoutRow.previousPaidAmount)}</td>
                              <td className="border-b border-[var(--jb-line)] px-2 py-1.5 font-medium">{formatCurrency(payoutRow.currentPaidAmount)}</td>
                              <td className="border-b border-[var(--jb-line)] px-2 py-1.5 font-medium">{formatCurrency(payoutRow.currentUnpaidAmount)}</td>
                              <td className="border-b border-[var(--jb-line)] px-2 py-1.5 font-medium">{formatCurrency(payoutRow.totalSalesAmount)}</td>
                              <td className="border-b border-[var(--jb-line)] px-2 py-1.5">
                                <Input
                                  value={payoutRow.ratio ?? ""}
                                  onChange={(event) =>
                                    updatePayoutRow(selectedTeacher.id, payoutRow.id, (current) => ({
                                      ...current,
                                      ratio: event.target.value === "" ? null : Number(event.target.value),
                                    }))
                                  }
                                />
                              </td>
                              <td className="border-b border-[var(--jb-line)] px-2 py-1.5">
                                <Input
                                  value={payoutRow.hours ?? ""}
                                  onChange={(event) =>
                                    updatePayoutRow(selectedTeacher.id, payoutRow.id, (current) => ({
                                      ...current,
                                      hours: event.target.value === "" ? null : Number(event.target.value),
                                    }))
                                  }
                                />
                              </td>
                              <td className="border-b border-[var(--jb-line)] px-2 py-1.5 font-medium">{formatCurrency(payoutRow.payoutAmount)}</td>
                              <td className="border-b border-[var(--jb-line)] px-2 py-1.5">
                                <Input
                                  value={payoutRow.note}
                                  onChange={(event) =>
                                    updatePayoutRow(selectedTeacher.id, payoutRow.id, (current) => ({ ...current, note: event.target.value }))
                                  }
                                />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <section className="rounded-xl border border-[var(--jb-line)] bg-[var(--jb-field)] p-4 shadow-sm overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-semibold text-[var(--jb-text)]">강좌·수업 외 지급</div>
            <p className="m-0 mt-1 text-xs text-[var(--jb-muted)] leading-relaxed">
              진단고사, 행사비 등 매출·실강과 별도로 지급액만 정하는 줄입니다. 엑셀에서는 강좌 목록 아래에 붙습니다.
            </p>
          </div>
          <ActionButton tone="ghost" onClick={() => addExtraPayoutLine(selectedTeacher.id)}>
            항목 추가
          </ActionButton>
        </div>
        <table className="min-w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              {["강좌명(항목명)", "요일·비고", "비율", "시수", "지급액", "비고", ""].map((label) => (
                <th key={label} className="border-b border-[var(--jb-line)] bg-[var(--jb-surface)] px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(selectedTeacher.extraPayoutLines ?? []).length === 0 ? (
              <tr>
                <td className="border-b border-[var(--jb-line)] px-3 py-4 text-sm text-[var(--jb-muted)]" colSpan={7}>
                  없음. 진단고사 등 추가 시 「항목 추가」를 누르세요.
                </td>
              </tr>
            ) : (
              (selectedTeacher.extraPayoutLines ?? []).map((line) => (
                <tr key={line.id} className="bg-white">
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <Input
                      value={line.title}
                      onChange={(event) =>
                        updateExtraPayoutLine(selectedTeacher.id, line.id, (current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="예: 진단고사"
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <Input
                      value={line.scheduleText}
                      onChange={(event) =>
                        updateExtraPayoutLine(selectedTeacher.id, line.id, (current) => ({
                          ...current,
                          scheduleText: event.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <Input
                      value={line.ratio ?? ""}
                      onChange={(event) =>
                        updateExtraPayoutLine(selectedTeacher.id, line.id, (current) => ({
                          ...current,
                          ratio: event.target.value === "" ? null : Number(event.target.value),
                        }))
                      }
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <Input
                      value={line.hours ?? ""}
                      onChange={(event) =>
                        updateExtraPayoutLine(selectedTeacher.id, line.id, (current) => ({
                          ...current,
                          hours: event.target.value === "" ? null : Number(event.target.value),
                        }))
                      }
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2 font-medium">
                    <Input
                      value={line.amount}
                      onChange={(event) =>
                        updateExtraPayoutLine(selectedTeacher.id, line.id, (current) => ({
                          ...current,
                          amount: Number(event.target.value || 0),
                        }))
                      }
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <Input
                      value={line.note}
                      onChange={(event) =>
                        updateExtraPayoutLine(selectedTeacher.id, line.id, (current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <ActionButton tone="ghost" className="px-3 py-1.5 text-xs" onClick={() => removeExtraPayoutLine(selectedTeacher.id, line.id)}>
                      삭제
                    </ActionButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-[var(--jb-line)] bg-[var(--jb-field)] p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-[13px] font-semibold text-[var(--jb-text)]">정산 요약</h3>
          <Link href="/jeongsan/assistants" className="text-[12px] font-medium text-[var(--jb-accent)] hover:underline">
            조교 지급은 조교 탭에서 편집
          </Link>
        </div>
        <div className="space-y-3 rounded-lg border border-[var(--jb-line)] bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--jb-line)]/80 pb-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--jb-muted)]">실 지급액</div>
              <p className="m-0 mt-0.5 text-[11px] text-[var(--jb-muted)]">강좌·기타 지급 합계(강사 기준 총지급)</p>
            </div>
            <div className="text-lg font-semibold tabular-nums text-[var(--jb-text)]">{formatCurrency(s.totalPayoutAmount)}</div>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-semibold text-[var(--jb-text)]">조교 배분</div>
            {selectedTeacher.assistants.length === 0 ? (
              <p className="m-0 text-sm text-[var(--jb-muted)]">등록된 조교가 없습니다.</p>
            ) : (
              <ul className="m-0 list-none space-y-2 p-0">
                {selectedTeacher.assistants.map((a) => {
                  const label = a.name.trim() || "(이름 없음)";
                  return (
                    <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                      <span className="text-[var(--jb-text)]">{label}</span>
                      <span className="tabular-nums text-[var(--jb-muted)]">
                        {formatCurrency(a.grossPay)} − {formatCurrency(a.taxAmount)} →{" "}
                        <span className="font-medium text-[var(--jb-text)]">{formatCurrency(a.netPay)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-[var(--jb-muted)]">
              강사 정산에서 차감되는 조교 급여(세전 합계):{" "}
              <span className="font-medium tabular-nums text-[var(--jb-text)]">{formatCurrency(s.totalAssistantGrossPay)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--jb-line)]/80 pt-3">
            <div className="text-[12px] text-[var(--jb-muted)]">강사 세금 ({Math.round(s.teacherTaxRate * 1000) / 10}%)</div>
            <div className="text-[13px] font-medium tabular-nums text-[var(--jb-text)]">{formatCurrency(s.teacherTaxAmount)}</div>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--jb-line)] pt-3">
            <div className="text-[14px] font-semibold text-[var(--jb-text)]">강사 최종 수령</div>
            <div className="text-xl font-bold tabular-nums text-[var(--jb-accent)]">{formatCurrency(s.finalTeacherPay)}</div>
          </div>
          <p className="m-0 text-[11px] text-[var(--jb-muted)]">
            총지급 − 조교 급여(세전) − 강사 세금 = 최종 수령 (엑셀·사이드바와 동일)
          </p>
        </div>
      </section>
    </div>
  );
}

export function AssistantPanel() {
  const { selectedTeacher, addAssistant, updateAssistant, removeAssistant } = useJeongsanBuilder();

  if (!selectedTeacher) {
    return <EmptyState message="왼쪽에서 강사를 선택하면 조교지급액을 편집할 수 있습니다." />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <p className="mb-4 rounded-lg border border-[var(--jb-line)] bg-[var(--jb-surface)] px-3 py-2 text-[12px] text-[var(--jb-muted)] leading-relaxed">
        여기서 입력한 내용은 <strong className="text-[var(--jb-text)]">강사 정산</strong> 화면의 실 지급액·강사 최종 수령 계산에 반영됩니다.
      </p>
      <section className="rounded-xl border border-[var(--jb-line)] bg-[var(--jb-field)] p-4 shadow-sm">
        <div className="mb-4 flex justify-end">
          <ActionButton tone="ghost" onClick={() => addAssistant(selectedTeacher.id)}>
            조교 추가
          </ActionButton>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--jb-line)]">
          <table className="min-w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                {["이름", "주민번호", "은행", "계좌번호", "급여", "공제율", "공제액", "지급액", "관리"].map((label) => (
                  <th key={label} className="border-b border-[var(--jb-line)] bg-[var(--jb-surface)] px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedTeacher.assistants.map((assistant) => (
                <tr key={assistant.id} className="bg-white">
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <Input
                      value={assistant.name}
                      onChange={(event) => updateAssistant(selectedTeacher.id, assistant.id, (current) => ({ ...current, name: event.target.value }))}
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <Input
                      value={assistant.residentId}
                      onChange={(event) =>
                        updateAssistant(selectedTeacher.id, assistant.id, (current) => ({ ...current, residentId: event.target.value }))
                      }
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <Input
                      value={assistant.bankName}
                      onChange={(event) =>
                        updateAssistant(selectedTeacher.id, assistant.id, (current) => ({ ...current, bankName: event.target.value }))
                      }
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <Input
                      value={assistant.accountNumber}
                      onChange={(event) =>
                        updateAssistant(selectedTeacher.id, assistant.id, (current) => ({ ...current, accountNumber: event.target.value }))
                      }
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <Input
                      value={assistant.grossPay}
                      onChange={(event) =>
                        updateAssistant(selectedTeacher.id, assistant.id, (current) => ({ ...current, grossPay: Number(event.target.value || 0) }))
                      }
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <Input
                      value={assistant.taxRate}
                      onChange={(event) =>
                        updateAssistant(selectedTeacher.id, assistant.id, (current) => ({ ...current, taxRate: Number(event.target.value || 0) }))
                      }
                    />
                  </td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2 font-medium">{formatCurrency(assistant.taxAmount)}</td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2 font-medium">{formatCurrency(assistant.netPay)}</td>
                  <td className="border-b border-[var(--jb-line)] px-3 py-2">
                    <ActionButton tone="ghost" className="px-3 py-1.5 text-xs" onClick={() => removeAssistant(selectedTeacher.id, assistant.id)}>
                      삭제
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-[var(--jb-line)] bg-[var(--jb-field)] px-6 py-12 text-center text-sm text-[var(--jb-muted)]">
      {message}
    </div>
  );
}
