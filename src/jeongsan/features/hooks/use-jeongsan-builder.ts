"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  AssistantPayrollRow,
  CourseSettlement,
  ExtraPayoutLine,
  ParseTeacherSettlementResponse,
  PayoutRow,
  StudentSettlementRow,
  TeacherSettlementMonth,
} from "@/jeongsan/features/types";
import {
  createEmptyAssistant,
  makeId,
  recalculateAssistant,
  recalculatePayoutRow,
  recalculateSettlement,
} from "@/jeongsan/features/utils";

function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function summarizeCourseRows(course: CourseSettlement, targetMonth: number) {
  let previousOutstandingAmount = 0;
  let previousPaidAmount = 0;
  let currentPaidAmount = 0;
  let currentUnpaidAmount = 0;

  for (const row of course.rows) {
    if (course.sheetKind === "arrears") {
      previousOutstandingAmount += row.unpaidAmount;
      previousPaidAmount += row.payAmount;
      continue;
    }
    const isPrevious = row.monthTag !== null && row.monthTag !== targetMonth;
    if (isPrevious) {
      previousOutstandingAmount += row.unpaidAmount;
      previousPaidAmount += row.payAmount;
      continue;
    }
    currentPaidAmount += row.payAmount;
    currentUnpaidAmount += row.unpaidAmount;
  }

  return {
    previousOutstandingAmount,
    previousPaidAmount,
    currentPaidAmount,
    currentUnpaidAmount,
  };
}

export function useJeongsanBuilderState() {
  const router = useRouter();
  const today = currentMonth();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [settlement, setSettlement] = useState<TeacherSettlementMonth | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [exportSelectedIds, setExportSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTeacher = useMemo(
    () => settlement?.teachers.find((teacher) => teacher.id === selectedTeacherId) ?? null,
    [selectedTeacherId, settlement],
  );

  useEffect(() => {
    if (!settlement?.teachers.length) {
      return;
    }
    const exists = settlement.teachers.some((teacher) => teacher.id === selectedTeacherId);
    if (!exists) {
      setSelectedTeacherId(settlement.teachers[0]?.id ?? null);
    }
  }, [settlement, selectedTeacherId]);

  async function parseDocuments(payDocuments: File[], previousPayout: File | null) {
    const formData = new FormData();
    formData.set("year", String(year));
    formData.set("month", String(month));
    payDocuments.forEach((file) => formData.append("payDocuments", file));
    if (previousPayout) {
      formData.set("previousPayout", previousPayout);
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/jeongsan/parse", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ParseTeacherSettlementResponse | { message: string };
      if (!response.ok) {
        throw new Error("message" in payload ? payload.message : "정산 파일 파싱에 실패했습니다.");
      }
      if (!("settlement" in payload)) {
        throw new Error("정산 응답 형식이 올바르지 않습니다.");
      }
      const nextSettlement = payload.settlement;
      setSettlement({
        ...nextSettlement,
        teachers: nextSettlement.teachers.map((teacher) => ({
          ...teacher,
          campusLabel: teacher.campusLabel ?? "고등1관",
          extraPayoutLines: teacher.extraPayoutLines ?? [],
        })),
      });
      const firstId = nextSettlement.teachers[0]?.id ?? null;
      setSelectedTeacherId(firstId);
      setExportSelectedIds(nextSettlement.teachers.map((teacher) => teacher.id));
      router.push("/jeongsan/payout");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "정산 파일 파싱 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function updateCourse(courseId: string, updater: (course: CourseSettlement) => CourseSettlement) {
    setSettlement((previous) => {
      if (!previous) return previous;
      return recalculateSettlement({
        ...previous,
        teachers: previous.teachers.map((teacher) => {
          const courses = teacher.courses.map((course) => (course.id === courseId ? updater(course) : course));
          const updatedCourse = courses.find((course) => course.id === courseId);
          if (!updatedCourse) {
            return { ...teacher, courses };
          }
          return {
            ...teacher,
            courses,
            payoutRows: teacher.payoutRows.map((row) =>
              row.courseId === courseId
                ? recalculatePayoutRow({
                    ...row,
                    courseName: updatedCourse.courseName,
                    scheduleText: updatedCourse.scheduleText,
                    ...summarizeCourseRows(updatedCourse, previous.month),
                  })
                : row,
            ),
          };
        }),
      });
    });
  }

  function updateStudent(courseId: string, rowId: string, updater: (row: StudentSettlementRow) => StudentSettlementRow) {
    updateCourse(courseId, (course) => ({
      ...course,
      detailSnapshot: null,
      rows: course.rows.map((row) => (row.id === rowId ? updater(row) : row)),
    }));
  }

  function addStudent(courseId: string) {
    updateCourse(courseId, (course) => ({
      ...course,
      detailSnapshot: null,
      rows: [
        ...course.rows,
        {
          id: makeId(),
          source: {
            workbookName: "manual",
            sheetName: "manual",
            blockTitle: course.courseName,
            rowNumber: 0,
          },
          studentName: "",
          studentNameRaw: "",
          monthTag: null,
          attendanceCount: 0,
          attendanceRaw: "",
          paidAmount: 0,
          paidAmountRaw: "",
          unpaidAmount: 0,
          unpaidAmountRaw: "",
          paymentMethod: "",
          payAmount: 0,
          payAmountRaw: "",
          note: "",
          needsReview: true,
        },
      ],
    }));
  }

  function removeStudent(courseId: string, rowId: string) {
    updateCourse(courseId, (course) => ({
      ...course,
      detailSnapshot: null,
      rows: course.rows.filter((row) => row.id !== rowId),
    }));
  }

  function updatePayoutRow(teacherId: string, rowId: string, updater: (row: PayoutRow) => PayoutRow) {
    setSettlement((previous) => {
      if (!previous) return previous;
      return recalculateSettlement({
        ...previous,
        teachers: previous.teachers.map((teacher) => {
          if (teacher.id !== teacherId) {
            return teacher;
          }
          return {
            ...teacher,
            payoutRows: teacher.payoutRows.map((row) => (row.id === rowId ? recalculatePayoutRow(updater(row)) : row)),
          };
        }),
      });
    });
  }

  function updateTeacherNote(teacherId: string, note: string) {
    setSettlement((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        teachers: previous.teachers.map((teacher) => (teacher.id === teacherId ? { ...teacher, note } : teacher)),
      };
    });
  }

  function updateCampusLabel(teacherId: string, campusLabel: string) {
    setSettlement((previous) => {
      if (!previous) return previous;
      return recalculateSettlement({
        ...previous,
        teachers: previous.teachers.map((teacher) =>
          teacher.id === teacherId ? { ...teacher, campusLabel } : teacher,
        ),
      });
    });
  }

  function addExtraPayoutLine(teacherId: string) {
    setSettlement((previous) => {
      if (!previous) return previous;
      return recalculateSettlement({
        ...previous,
        teachers: previous.teachers.map((teacher) =>
          teacher.id === teacherId
            ? {
                ...teacher,
                extraPayoutLines: [
                  ...(teacher.extraPayoutLines ?? []),
                  {
                    id: makeId(),
                    title: "",
                    scheduleText: "",
                    ratio: null,
                    hours: 0,
                    amount: 0,
                    note: "",
                  },
                ],
              }
            : teacher,
        ),
      });
    });
  }

  function updateExtraPayoutLine(teacherId: string, lineId: string, updater: (line: ExtraPayoutLine) => ExtraPayoutLine) {
    setSettlement((previous) => {
      if (!previous) return previous;
      return recalculateSettlement({
        ...previous,
        teachers: previous.teachers.map((teacher) => {
          if (teacher.id !== teacherId) {
            return teacher;
          }
          return {
            ...teacher,
            extraPayoutLines: (teacher.extraPayoutLines ?? []).map((line) =>
              line.id === lineId ? updater(line) : line,
            ),
          };
        }),
      });
    });
  }

  function removeExtraPayoutLine(teacherId: string, lineId: string) {
    setSettlement((previous) => {
      if (!previous) return previous;
      return recalculateSettlement({
        ...previous,
        teachers: previous.teachers.map((teacher) =>
          teacher.id === teacherId
            ? {
                ...teacher,
                extraPayoutLines: (teacher.extraPayoutLines ?? []).filter((line) => line.id !== lineId),
              }
            : teacher,
        ),
      });
    });
  }

  function addAssistant(teacherId: string) {
    setSettlement((previous) => {
      if (!previous) return previous;
      return recalculateSettlement({
        ...previous,
        teachers: previous.teachers.map((teacher) =>
          teacher.id === teacherId
            ? { ...teacher, assistants: [...teacher.assistants, createEmptyAssistant(teacherId)] }
            : teacher,
        ),
      });
    });
  }

  function updateAssistant(teacherId: string, assistantId: string, updater: (assistant: AssistantPayrollRow) => AssistantPayrollRow) {
    setSettlement((previous) => {
      if (!previous) return previous;
      return recalculateSettlement({
        ...previous,
        teachers: previous.teachers.map((teacher) => {
          if (teacher.id !== teacherId) {
            return teacher;
          }
          return {
            ...teacher,
            assistants: teacher.assistants.map((assistant) =>
              assistant.id === assistantId ? recalculateAssistant(updater(assistant)) : assistant,
            ),
          };
        }),
      });
    });
  }

  function removeAssistant(teacherId: string, assistantId: string) {
    setSettlement((previous) => {
      if (!previous) return previous;
      return recalculateSettlement({
        ...previous,
        teachers: previous.teachers.map((teacher) => {
          if (teacher.id !== teacherId) {
            return teacher;
          }
          return {
            ...teacher,
            assistants: teacher.assistants.filter((assistant) => assistant.id !== assistantId),
          };
        }),
      });
    });
  }

  function toggleExportSelected(teacherId: string) {
    setExportSelectedIds((previous) =>
      previous.includes(teacherId) ? previous.filter((id) => id !== teacherId) : [...previous, teacherId],
    );
  }

  function setExportSelectAll(value: boolean) {
    if (!settlement) {
      return;
    }
    setExportSelectedIds(value ? settlement.teachers.map((teacher) => teacher.id) : []);
  }

  async function download(mode: "all" | "selected") {
    if (!settlement) return;
    if (mode === "selected" && exportSelectedIds.length === 0) {
      setError("엑셀로 내보낼 강사를 한 명 이상 선택해 주세요.");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const response = await fetch("/api/jeongsan/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "all"
            ? { settlement, mode: "all" }
            : { settlement, mode: "selected", teacherIds: exportSelectedIds },
        ),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "엑셀 내보내기에 실패했습니다.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        mode === "all" ? `${year}-${month}-all.xlsx` : `${year}-${month}-selected-${exportSelectedIds.length}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "엑셀 내보내기 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
  }

  return {
    year,
    month,
    settlement,
    selectedTeacherId,
    selectedTeacher,
    exportSelectedIds,
    loading,
    exporting,
    error,
    setYear,
    setMonth,
    setSelectedTeacherId,
    toggleExportSelected,
    setExportSelectAll,
    parseDocuments,
    updateCourse,
    updateStudent,
    addStudent,
    removeStudent,
    updatePayoutRow,
    updateTeacherNote,
    updateCampusLabel,
    addExtraPayoutLine,
    updateExtraPayoutLine,
    removeExtraPayoutLine,
    addAssistant,
    updateAssistant,
    removeAssistant,
    download,
  };
}
