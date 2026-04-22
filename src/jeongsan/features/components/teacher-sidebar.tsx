"use client";

import type { TeacherSettlement } from "@/jeongsan/features/types";
import { Checkbox, formatCurrency } from "@/jeongsan/features/components/jeongsan-ui";

export function TeacherSidebar({
  teachers,
  selectedTeacherId,
  exportSelectedIds,
  onSelectTeacher,
  onToggleExport,
  onSelectAllExport,
}: {
  teachers: TeacherSettlement[];
  selectedTeacherId: string | null;
  exportSelectedIds: string[];
  onSelectTeacher: (teacherId: string) => void;
  onToggleExport: (teacherId: string) => void;
  onSelectAllExport: (value: boolean) => void;
}) {
  const allSelected = teachers.length > 0 && exportSelectedIds.length === teachers.length;
  const someSelected = exportSelectedIds.length > 0 && !allSelected;

  if (teachers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--jb-line)] bg-white px-3 py-6 text-center text-sm text-[var(--jb-muted)]">
        표시할 강사가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--jb-line)] pb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--jb-muted)]">엑셀 내보내기</span>
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={(event) => onSelectAllExport(event.target.checked)}
          className="text-[12px] font-medium text-[var(--jb-text)]"
        >
          <span className="select-none">전체</span>
        </Checkbox>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pr-1">
        {teachers.map((teacher) => {
          const isSelected = teacher.id === selectedTeacherId;
          const isExportChecked = exportSelectedIds.includes(teacher.id);
          const reviewCount = teacher.payoutRows.filter((row) => row.needsReview).length;
          const assistantCount = teacher.assistants.filter((assistant) => assistant.name.trim()).length;
          return (
            <div
              key={teacher.id}
              className={
                isSelected
                  ? "rounded-xl border border-[var(--jb-accent)] bg-[var(--jb-accent-soft)] p-3 shadow-sm"
                  : reviewCount > 0
                    ? "rounded-xl border border-amber-200 bg-amber-50/90 p-3 shadow-sm ring-1 ring-inset ring-amber-200/80"
                    : "rounded-xl border border-[var(--jb-line)] bg-white p-3 shadow-sm"
              }
            >
              <div className="flex gap-2.5">
                <div className="pt-0.5">
                  <Checkbox
                    checked={isExportChecked}
                    onChange={() => onToggleExport(teacher.id)}
                    aria-label={`${teacher.teacherName} 엑셀 포함`}
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTeacher(teacher.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  {reviewCount > 0 ? (
                    <div className="mb-1.5 inline-flex rounded-md border border-amber-300/80 bg-amber-100/80 px-2 py-0.5 text-[10px] font-semibold text-amber-950">
                      전월 매칭 {reviewCount}건
                    </div>
                  ) : null}
                  <div className="text-[11px] text-[var(--jb-muted)]">{teacher.subjectName || "과목 미지정"}</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-[var(--jb-text)]">{teacher.teacherName}</div>
                  <div className="mt-2 grid gap-0.5 text-[11px] text-[var(--jb-muted)]">
                    <div className="flex justify-between gap-2">
                      <span>강좌</span>
                      <span className="font-medium text-[var(--jb-text)]">{teacher.payoutRows.length}개</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>조교</span>
                      <span className="font-medium text-[var(--jb-text)]">{assistantCount}명</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>최종지급</span>
                      <span className="font-semibold tabular-nums text-[var(--jb-accent)]">{formatCurrency(teacher.summary.finalTeacherPay)}</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
