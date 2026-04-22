"use client";

import { File as FileIcon, X } from "lucide-react";

import { DropZone } from "@/features/jeongsan-builder/components/LeftPanel/DropZone";
import { LabeledInput } from "@/features/jeongsan-builder/components/LeftPanel/LabeledInput";
import { PanelSection } from "@/features/jeongsan-builder/components/LeftPanel/PanelSection";
import { PeriodSelect } from "@/features/jeongsan-builder/components/LeftPanel/PeriodSelect";
import {
  StepConnector,
  StepIndicator,
} from "@/features/jeongsan-builder/components/LeftPanel/StepIndicator";
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
  const uploaded = useBuilderStore((s) => s.uploaded);
  const payFile = useBuilderStore((s) => s.payFile);
  const prevPayoutFile = useBuilderStore((s) => s.prevPayoutFile);
  const year = useBuilderStore((s) => s.year);
  const month = useBuilderStore((s) => s.month);
  const cardFeeRate = useBuilderStore((s) => s.cardFeeRate);
  const setYear = useBuilderStore((s) => s.setYear);
  const setMonth = useBuilderStore((s) => s.setMonth);
  const setCardFeeRate = useBuilderStore((s) => s.setCardFeeRate);
  const buildSettlement = useBuilderStore((s) => s.buildSettlement);
  const resetAll = useBuilderStore((s) => s.resetAll);
  const attachMockPayFile = useBuilderStore((s) => s.attachMockPayFile);
  const attachMockPrevPayoutFile = useBuilderStore((s) => s.attachMockPrevPayoutFile);
  const removePayFile = useBuilderStore((s) => s.removePayFile);
  const removePrevPayoutFile = useBuilderStore((s) => s.removePrevPayoutFile);

  const canBuild = Boolean(payFile) && !uploaded;

  return (
    <div
      className="flex h-full w-[380px] shrink-0 flex-col"
      style={{
        background: "var(--aca-white)",
        borderRight: "1px solid var(--aca-gray-100)",
      }}
    >
      <div
        className="px-6 pt-[22px] pb-4"
        style={{ borderBottom: "1px solid var(--aca-gray-100)" }}
      >
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
            step={1}
            label="페이 문서 업로드"
            active={!uploaded}
            done={uploaded}
          />
          <StepConnector done={uploaded} />
          <StepIndicator step={2} label="전월 강사 지급액 파일 업로드" />
          <StepConnector />
          <StepIndicator step={3} label="정산 데이터 생성" active={uploaded} />
        </div>

        <div className="flex flex-col gap-[18px]">
          <PanelSection
            title="페이 문서 업로드"
            subtitle="이번 달 반별 페이 문서 파일을 업로드해주세요"
          >
            <div className="mb-3 grid grid-cols-[1fr_1fr_1.2fr] gap-2">
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
              <LabeledInput
                label="카드 수수료율"
                value={cardFeeRate}
                onChange={setCardFeeRate}
              />
            </div>

            {payFile ? (
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
                    {payFile.name}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--aca-gray-400)" }}>
                    {payFile.periodLabel} · {payFile.teacherCount}명
                  </div>
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
                <DropZone onClick={attachMockPayFile} />
                <div
                  className="mt-2.5 rounded-md px-3 py-2.5 text-xs"
                  style={{
                    border: "1px solid var(--aca-gray-100)",
                    color: "var(--aca-gray-400)",
                  }}
                >
                  아직 업로드된 페이 문서가 없습니다.
                </div>
              </>
            )}
          </PanelSection>

          <PanelSection
            title="전월 강사 지급액 파일 업로드"
            subtitle="전월 강사지급액이 있으면 넣어주세요. 비율을 자동으로 입력합니다."
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
                onClick={uploaded ? attachMockPrevPayoutFile : undefined}
              />
            )}
          </PanelSection>
        </div>
      </div>

      <div
        className="flex gap-2 px-6 py-4"
        style={{
          borderTop: "1px solid var(--aca-gray-100)",
          background: "var(--aca-white)",
        }}
      >
        <button
          type="button"
          onClick={resetAll}
          className="shrink-0 cursor-pointer rounded-md px-3.5 text-[15px] font-semibold"
          style={{
            height: 44,
            background: "var(--aca-white)",
            color: "var(--aca-gray-500)",
            border: "1px solid var(--aca-gray-200)",
          }}
        >
          초기화
        </button>
        <button
          type="button"
          disabled={!canBuild}
          onClick={buildSettlement}
          className="flex-1 cursor-pointer rounded-md px-3.5 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            height: 44,
            background: "var(--aca-black)",
            color: "var(--aca-white)",
            border: "none",
          }}
        >
          정산 데이터 만들기
        </button>
      </div>
    </div>
  );
}
