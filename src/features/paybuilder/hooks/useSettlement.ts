"use client";

import { useMemo, useState } from "react";
import type { CourseBlock, SettlementMonth, StudentEntry } from "@/features/paybuilder/types";
import {
  computePayAmount,
  getDefaultTargetMonth,
  mergeCourseCollections
} from "@/features/paybuilder/logic/utils";

function emptyStudent(feeRate: number): StudentEntry {
  return {
    id: crypto.randomUUID(),
    studentName: "",
    carryOverMonth: null,
    attendanceCount: 0,
    attendanceLabel: "",
    paidAmount: 0,
    unpaidAmount: 0,
    paymentMethod: "",
    payAmount: computePayAmount(0, "", feeRate),
    payOverridden: false,
    note: "",
    isCarryOver: false,
    needsReview: true
  };
}

export function useSettlement(fileCount: number) {
  const defaultTargetMonth = getDefaultTargetMonth();
  const [year, setYear] = useState(defaultTargetMonth.year);
  const [month, setMonth] = useState(defaultTargetMonth.month);
  const [feeRate, setFeeRate] = useState(0.035);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<SettlementMonth | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const selectedCourse = useMemo(() => {
    if (!settlement || !selectedCourseId) return null;
    return settlement.courses.find((c) => c.id === selectedCourseId) ?? null;
  }, [selectedCourseId, settlement]);

  const stats = useMemo(() => {
    if (!settlement) return null;
    const students = settlement.courses.flatMap((c) => c.students);
    const unpaidEntries = students.filter((s) => s.unpaidAmount > 0);
    return {
      fileCount,
      courseCount: settlement.courses.length,
      studentCount: students.length,
      unpaidCount: unpaidEntries.length,
      unpaidAmount: unpaidEntries.reduce((sum, s) => sum + s.unpaidAmount, 0)
    };
  }, [fileCount, settlement]);

  async function requestParsedSettlement(files: File[], carryOver?: File | null) {
    const formData = new FormData();
    formData.set("year", String(year));
    formData.set("month", String(month));
    formData.set("feeRate", String(feeRate));
    files.forEach((file) => formData.append("acaFiles", file));
    if (carryOver) formData.set("carryOverFile", carryOver);

    const response = await fetch("/settla/paybuilder/api/parse", { method: "POST", body: formData });
    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      throw new Error(payload.message ?? "파싱에 실패했습니다.");
    }
    return (await response.json()) as SettlementMonth;
  }

  function updateCourse(courseId: string, updater: (course: CourseBlock) => CourseBlock) {
    setSettlement((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        courses: prev.courses.map((c) => (c.id === courseId ? updater(c) : c))
      };
    });
  }

  function updateStudent(
    courseId: string,
    studentId: string,
    updater: (student: StudentEntry) => StudentEntry
  ) {
    updateCourse(courseId, (course) => ({
      ...course,
      students: course.students.map((s) => (s.id === studentId ? updater(s) : s))
    }));
  }

  function removeStudent(courseId: string, studentId: string) {
    updateCourse(courseId, (course) => ({
      ...course,
      students: course.students.filter((s) => s.id !== studentId)
    }));
  }

  function handleFeeRateChange(nextRate: number) {
    setFeeRate(nextRate);
    setSettlement((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        feeRate: nextRate,
        courses: prev.courses.map((course) => ({
          ...course,
          students: course.students.map((s) =>
            s.payOverridden
              ? s
              : { ...s, payAmount: computePayAmount(s.paidAmount, s.paymentMethod, nextRate) }
          )
        }))
      };
    });
  }

  async function handleSubmit(files: File[], carryOver: File | null) {
    if (files.length === 0) {
      setError("ACA 반별 엑셀을 하나 이상 업로드해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await requestParsedSettlement(files, carryOver);
      setSettlement(data);
      setSelectedCourseId(data.courses[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function appendCoursesFromFiles(
    files: File[],
    onMergeFiles: (files: File[]) => void
  ) {
    if (!settlement || files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const parsed = await requestParsedSettlement(files);
      if (parsed.courses.length === 0) throw new Error("추가할 강좌를 찾지 못했습니다.");
      onMergeFiles(files);
      setSettlement((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          courses: mergeCourseCollections(prev.courses, parsed.courses)
        };
      });
      setSelectedCourseId(parsed.courses[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "강좌 추가 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function addStudent(courseId: string) {
    setSettlement((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        courses: prev.courses.map((c) =>
          c.id === courseId
            ? { ...c, students: [...c.students, emptyStudent(prev.feeRate)] }
            : c
        )
      };
    });
  }

  async function handleDownload() {
    if (!settlement || exporting) return;
    setExporting(true);
    setError(null);
    try {
      const response = await fetch("/settla/paybuilder/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settlement)
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setError(payload.message ?? "엑셀 생성에 실패했습니다.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${settlement.year}년 ${settlement.month}월_강좌별매출(${settlement.campusName}).xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return {
    settlement,
    selectedCourseId,
    selectedCourse,
    stats,
    year,
    month,
    feeRate,
    loading,
    exporting,
    error,
    setYear,
    setMonth,
    setSelectedCourseId,
    handleFeeRateChange,
    handleSubmit,
    appendCoursesFromFiles,
    addStudent,
    updateCourse,
    updateStudent,
    removeStudent,
    handleDownload
  };
}
