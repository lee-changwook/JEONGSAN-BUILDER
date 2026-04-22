"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useJeongsanBuilder } from "@/jeongsan/features/jeongsan-builder-provider";
import {
  ActionButton,
  FileDropZone,
  formatCurrency,
  PayDocumentsDropZone,
  StatCard,
  UploadSettings,
} from "@/jeongsan/features/components/jeongsan-ui";

export function HomePage() {
  const [payDocuments, setPayDocuments] = useState<File[]>([]);
  const [previousPayoutFile, setPreviousPayoutFile] = useState<File | null>(
    null,
  );
  const [importHintsOpen, setImportHintsOpen] = useState(false);
  const {
    year,
    month,
    settlement,
    loading,
    error,
    setYear,
    setMonth,
    parseDocuments,
  } = useJeongsanBuilder();

  const stats = useMemo(() => {
    if (!settlement) {
      return null;
    }
    const teacherCount = settlement.teachers.length;
    const courseCount = settlement.teachers.reduce(
      (sum, teacher) => sum + teacher.courses.length,
      0,
    );
    const studentCount = settlement.teachers.reduce(
      (sum, teacher) =>
        sum +
        teacher.courses.reduce(
          (courseSum, course) => courseSum + course.rows.length,
          0,
        ),
      0,
    );
    const reviewCount =
      settlement.warnings.length +
      settlement.teachers.reduce(
        (sum, teacher) =>
          sum + teacher.payoutRows.filter((row) => row.needsReview).length,
        0,
      );
    const unpaidAmount = settlement.teachers.reduce(
      (sum, teacher) =>
        sum +
        teacher.payoutRows.reduce(
          (rowSum, row) =>
            rowSum + row.currentUnpaidAmount + row.previousOutstandingAmount,
          0,
        ),
      0,
    );
    return {
      teacherCount,
      courseCount,
      studentCount,
      reviewCount,
      unpaidAmount,
    };
  }, [settlement]);

  const sheetWarnings =
    settlement?.warnings.filter((w) => w.category === "sheet") ?? [];
  const otherWarnings =
    settlement?.warnings.filter((w) => w.category !== "sheet") ?? [];

  return (
    <div className="bg-[var(--jb-bg)] text-[var(--jb-text)]">
      <div className="mx-auto max-w-4xl px-4 py-8 pb-12 lg:px-8 lg:pb-16">
        <header className="mb-6">
          <section className="shrink-0 rounded-[28px] border border-[var(--jb-line)] bg-[var(--jb-field)] p-7 shadow-[var(--shadow-panel)]">
            <div className="grid gap-2.5">
              <h1 className="m-0 text-[2rem] font-extrabold leading-tight tracking-tight text-[var(--jb-text)]">
                강사별 정산 빌더
              </h1>
              <p className="m-0 max-w-[920px] leading-relaxed text-[var(--jb-muted)]">
                행정관 페이 문서를 월 단위로 합산하고, 강사·조교 지급액을 정리한
                뒤 급여대장 엑셀을 만듭니다.
              </p>
            </div>
          </section>
        </header>

        <section className="rounded-[28px] border border-[var(--jb-line)] bg-[var(--jb-field)] p-6 shadow-[var(--shadow-panel)] lg:p-7">
          <div className="mb-4">
            <h2 className="m-0 text-xl font-bold text-[var(--jb-text)]">
              파일 불러오기
            </h2>
            <p className="m-0 mt-1 text-[15px] leading-relaxed text-[var(--jb-muted)]">
              페이 문서를 추가한 뒤 아래에서 정산 연·월을 고르고 합산 불러오기를
              누릅니다. 전월 강사지급액은 있을 때만 넣으면 됩니다.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-[var(--jb-line)] bg-white px-4 py-4">
            <FileDropZone
              title="전월 강사지급액 (선택)"
              files={previousPayoutFile ? [previousPayoutFile] : []}
              compact
              onFiles={(files) => setPreviousPayoutFile(files[0] ?? null)}
            />
            <PayDocumentsDropZone
              files={payDocuments}
              onFiles={setPayDocuments}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--jb-line)] pt-4">
            <UploadSettings
              year={year}
              month={month}
              onYearChange={setYear}
              onMonthChange={setMonth}
            />
            <ActionButton
              className="inline-flex h-9 shrink-0 items-center justify-center px-5 py-0"
              disabled={loading || payDocuments.length === 0}
              onClick={() => parseDocuments(payDocuments, previousPayoutFile)}
            >
              {loading ? "불러오는 중…" : "합산 불러오기"}
            </ActionButton>
            <span className="min-w-0 text-sm leading-snug text-[var(--jb-muted)]">
              페이 문서 {payDocuments.length}개
              {previousPayoutFile
                ? " · 전월 강사지급액 포함"
                : " · 전월 강사지급액 없음"}
            </span>
          </div>
        </section>

        <div className="mt-5 space-y-4">
          {error ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-[var(--jb-danger)]">
              {error}
            </div>
          ) : null}

          {sheetWarnings.length > 0 ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-[var(--jb-danger)]">
              <div className="font-medium">시트·연월 확인</div>
              <div className="mt-2 space-y-1.5">
                {sheetWarnings.map((warning) => (
                  <p key={warning.id} className="m-0 leading-relaxed">
                    {warning.message}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {otherWarnings.length > 0 ? (
            <div className="rounded-lg border border-[var(--jb-line)] bg-white">
              <button
                type="button"
                onClick={() => setImportHintsOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-medium text-[var(--jb-text)]"
              >
                <span>추가 안내 ({otherWarnings.length}건)</span>
                <span className="text-[var(--jb-muted)]">
                  {importHintsOpen ? "접기" : "펼치기"}
                </span>
              </button>
              {importHintsOpen ? (
                <div className="space-y-1.5 border-t border-[var(--jb-line)] px-3 py-2.5 text-sm text-[var(--jb-muted)]">
                  {otherWarnings.map((warning) => (
                    <p key={warning.id} className="m-0 leading-relaxed">
                      {warning.message}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {stats ? (
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="강사 수" value={String(stats.teacherCount)} />
              <StatCard label="강좌 수" value={String(stats.courseCount)} />
              <StatCard label="학생 행" value={String(stats.studentCount)} />
              <StatCard
                label="확인 항목"
                value={String(stats.reviewCount)}
                tone={stats.reviewCount > 0 ? "amber" : "default"}
              />
              <StatCard
                label="미납 합계"
                value={formatCurrency(stats.unpaidAmount)}
                tone="danger"
              />
            </section>
          ) : null}

          {settlement ? (
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--jb-line)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--jb-text)]">
                  {settlement.year}년 {settlement.month}월 데이터가
                  준비되었습니다.
                </div>
                <div className="mt-0.5 text-xs text-[var(--jb-muted)]">
                  강사 {settlement.teachers.length}명 · 페이 문서{" "}
                  {settlement.uploadedDocumentNames.length}개
                </div>
              </div>
              <Link
                href="/jeongsan/payout"
                className="inline-flex shrink-0 items-center justify-center rounded-md bg-[var(--jb-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                작업대로 이동
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
