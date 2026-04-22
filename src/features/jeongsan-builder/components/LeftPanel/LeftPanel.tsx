"use client";

import { useRef } from "react";
import { AlertTriangle, File as FileIcon, X } from "lucide-react";

import { DropZone } from "@/features/jeongsan-builder/components/LeftPanel/DropZone";
import { PanelSection } from "@/features/jeongsan-builder/components/LeftPanel/PanelSection";
import { PeriodSelect } from "@/features/jeongsan-builder/components/LeftPanel/PeriodSelect";
import {
  StepConnector,
  StepIndicator,
} from "@/features/jeongsan-builder/components/LeftPanel/StepIndicator";
import { parsePayDocument } from "@/features/jeongsan-builder/parser";
import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";

const YEAR_OPTIONS = [
  { value: "2024", label: "2024년" },
  { value: "2025", label: "2025년" },
  { value: "2026", label: "2026년" },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월`,
}));

export function LeftPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploaded = useBuilderStore((s) => s.calculator !== null);
  const pendingFile = useBuilderStore((s) => s.pendingFile);
  const payFile = useBuilderStore((s) => s.payFile);
  const prevPayoutFile = useBuilderStore((s) => s.prevPayoutFile);
  const parseError = useBuilderStore((s) => s.parseError);
  const isParsing = useBuilderStore((s) => s.isParsing);
  const year = useBuilderStore((s) => s.year);
  const month = useBuilderStore((s) => s.month);
  const setYear = useBuilderStore((s) => s.setYear);
  const setMonth = useBuilderStore((s) => s.setMonth);
  const setPendingFile = useBuilderStore((s) => s.setPendingFile);
  const startParsing = useBuilderStore((s) => s.startParsing);
  const ingestParseResult = useBuilderStore((s) => s.ingestParseResult);
  const setParseError = useBuilderStore((s) => s.setParseError);
  const resetAll = useBuilderStore((s) => s.resetAll);
  const removePayFile = useBuilderStore((s) => s.removePayFile);
  const removePrevPayoutFile = useBuilderStore((s) => s.removePrevPayoutFile);

  async function runBuild() {
    if (!pendingFile) return;
    startParsing();
    try {
      const result = await parsePayDocument(pendingFile);
      ingestParseResult(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "페이 문서를 처리하는 중 알 수 없는 오류가 발생했습니다.";
      setParseError(message);
    }
  }

  function triggerFilePick() {
    if (isParsing) return;
    fileInputRef.current?.click();
  }

  // 파일이 선택된 상태: pendingFile(미파싱) 또는 payFile(파싱 완료)
  const selectedFileName = payFile?.name ?? pendingFile?.name ?? null;
  const hasFile = selectedFileName !== null;

  return (
    <div
      className="flex h-full w-[380px] shrink-0 flex-col"
      style={{
        background: "var(--aca-white)",
        borderRight: "1px solid var(--aca-gray-100)",
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          if (file) setPendingFile(file);
          event.target.value = "";
        }}
      />

      <div className="px-6 pt-[22px] pb-4">
        <div
          className="text-xl font-bold tracking-[-0.2px]"
          style={{ color: "var(--aca-black)" }}
        >
          정산 빌더
        </div>
        <div className="mt-0.5 text-xs" style={{ color: "var(--aca-gray-500)" }}>
          페이 문서를 업로드하고 월간 정산 데이터를 생성합니다
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="mb-[22px] flex flex-col">
          <StepIndicator
            label="페이 문서 업로드"
            active={!uploaded}
            done={uploaded}
          />
          <StepConnector done={uploaded} />
          <StepIndicator label="전월 강사 지급액 파일 업로드" />
          <StepConnector />
          <StepIndicator label="정산 데이터 생성" active={uploaded} />
        </div>

        <div className="flex flex-col gap-[18px]">
          <PanelSection
            title="페이 문서 업로드"
            subtitle="이번 달 반별 페이 문서 파일을 업로드해주세요"
          >
            <div className="mb-3 grid grid-cols-2 gap-2">
              <PeriodSelect
                label="대상 연도"
                value={year}
                options={YEAR_OPTIONS}
                onChange={setYear}
              />
              <PeriodSelect
                label="대상 월"
                value={month}
                options={MONTH_OPTIONS}
                onChange={setMonth}
              />
            </div>

            {hasFile ? (
              <div
                className="flex items-center gap-2.5 rounded-md px-3 py-2.5"
                style={{
                  border: "1px solid var(--aca-gray-100)",
                  background: "var(--aca-gray-10)",
                }}
              >
                <div
                  className="flex size-7 items-center justify-center rounded"
                  style={{
                    background: "var(--aca-green-light)",
                    color: "var(--aca-green)",
                  }}
                >
                  <FileIcon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[13px] font-semibold"
                    style={{ color: "var(--aca-black)" }}
                  >
                    {selectedFileName}
                  </div>
                  {payFile && (
                    <div className="text-[11px]" style={{ color: "var(--aca-gray-400)" }}>
                      {payFile.periodLabel} · {payFile.teacherCount}명
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={removePayFile}
                  className="flex cursor-pointer border-none bg-transparent p-1"
                  style={{ color: "var(--aca-gray-400)" }}
                  aria-label="파일 제거"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <>
                <DropZone onClick={triggerFilePick} />
                {isParsing ? (
                  <div
                    className="mt-2.5 rounded-md px-3 py-2.5 text-xs"
                    style={{
                      border: "1px solid var(--aca-blue-200)",
                      color: "var(--aca-blue-primary)",
                      background: "var(--aca-blue-10)",
                    }}
                  >
                    페이 문서를 분석하는 중...
                  </div>
                ) : parseError ? (
                  <div
                    className="mt-2.5 flex items-start gap-2 rounded-md px-3 py-2.5 text-xs"
                    style={{
                      border: "1px solid var(--aca-red-40)",
                      color: "var(--aca-red-primary)",
                      background: "var(--aca-red-10)",
                    }}
                  >
                    <AlertTriangle className="mt-[1px] size-3.5 shrink-0" />
                    <span className="leading-[1.55]">{parseError}</span>
                  </div>
                ) : (
                  <div
                    className="mt-2.5 rounded-md px-3 py-2.5 text-xs"
                    style={{
                      border: "1px solid var(--aca-gray-100)",
                      color: "var(--aca-gray-400)",
                    }}
                  >
                    아직 업로드된 페이 문서가 없습니다.
                  </div>
                )}
              </>
            )}
          </PanelSection>

          <PanelSection
            title="전월 강사 지급액 파일 업로드"
            subtitle={
              <>
                전월 강사지급액이 있으면 넣어주세요.
                <br />
                비율을 자동으로 입력합니다.
              </>
            }
            muted={!uploaded}
          >
            {prevPayoutFile ? (
              <div
                className="flex items-center gap-2.5 rounded-md px-3 py-2.5"
                style={{
                  border: "1px solid var(--aca-gray-100)",
                  background: "var(--aca-gray-10)",
                }}
              >
                <div
                  className="flex size-7 items-center justify-center rounded"
                  style={{
                    background: "var(--aca-green-light)",
                    color: "var(--aca-green)",
                  }}
                >
                  <FileIcon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[13px] font-semibold"
                    style={{ color: "var(--aca-black)" }}
                  >
                    {prevPayoutFile.name}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: "var(--aca-gray-400)" }}
                  >
                    {prevPayoutFile.periodLabel}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removePrevPayoutFile}
                  className="flex cursor-pointer border-none bg-transparent p-1"
                  style={{ color: "var(--aca-gray-400)" }}
                  aria-label="파일 제거"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <DropZone
                accept=".xlsx 파일"
                small
                onClick={uploaded ? () => undefined : undefined}
              />
            )}
          </PanelSection>
        </div>
      </div>

      <div className="flex gap-2 px-6 py-4">
        <button
          type="button"
          onClick={resetAll}
          className="h-[38px] shrink-0 cursor-pointer rounded-md px-3.5 text-[14px] font-semibold"
          style={{
            background: "var(--aca-white)",
            color: "var(--aca-gray-500)",
            border: "1px solid var(--aca-gray-200)",
          }}
        >
          초기화
        </button>
        {uploaded ? (
          <button
            type="button"
            onClick={triggerFilePick}
            className="h-[38px] flex-1 cursor-pointer rounded-md px-3.5 text-[14px] font-semibold"
            style={{
              background: "var(--aca-white)",
              color: "var(--aca-gray-600)",
              border: "1px solid var(--aca-gray-200)",
            }}
          >
            다른 파일 선택
          </button>
        ) : (
          <button
            type="button"
            disabled={!pendingFile || isParsing}
            onClick={pendingFile ? () => void runBuild() : triggerFilePick}
            className="h-[38px] flex-1 cursor-pointer rounded-md px-3.5 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: "var(--aca-black)",
              color: "var(--aca-white)",
              border: "none",
            }}
          >
            {isParsing ? "분석 중..." : pendingFile ? "정산 데이터 만들기" : "정산 데이터 만들기"}
          </button>
        )}
      </div>
    </div>
  );
}
