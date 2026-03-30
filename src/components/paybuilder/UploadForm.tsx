'use client';

import { type DragEvent, type FormEvent, type RefObject } from 'react';
import { CarryOverFile } from '@/components/paybuilder/CarryOverFile';
import { FileDropZone } from '@/components/paybuilder/FileDropZone';
import { UploadSettings } from '@/components/paybuilder/UploadSettings';

type Props = {
  selectedFiles: File[];
  carryOverFile: File | null;
  year: number;
  month: number;
  feeRate: number;
  loading: boolean;
  error: string | null;
  acaInputRef: RefObject<HTMLInputElement | null>;
  carryOverInputRef: RefObject<HTMLInputElement | null>;
  onAcaDrop: (event: DragEvent<HTMLDivElement>) => void;
  onCarryOverDrop: (event: DragEvent<HTMLDivElement>) => void;
  onRemoveAcaFile: (key: string) => void;
  onBrowseAca: (files: File[]) => void;
  onCarryOverChange: (file: File | null) => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onFeeRateChange: (rate: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function UploadForm({
  selectedFiles,
  carryOverFile,
  year,
  month,
  feeRate,
  loading,
  error,
  acaInputRef,
  carryOverInputRef,
  onAcaDrop,
  onCarryOverDrop,
  onRemoveAcaFile,
  onBrowseAca,
  onCarryOverChange,
  onYearChange,
  onMonthChange,
  onFeeRateChange,
  onSubmit,
}: Props) {
  return (
    <section className="contents">
      <form onSubmit={onSubmit} className="grid gap-4 min-w-0">
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-100 grid gap-3.5 min-w-0">
          <div className="grid gap-1">
            <div className="text-[15px] font-bold">반별 엑셀 업로드</div>
            <div className="text-gray-500 text-[13px] leading-relaxed">이번 달 반별 출결 파일을 업로드해주세요</div>
          </div>

          <UploadSettings
            year={year}
            month={month}
            feeRate={feeRate}
            loading={loading}
            onYearChange={onYearChange}
            onMonthChange={onMonthChange}
            onFeeRateChange={onFeeRateChange}
          />

          <FileDropZone
            selectedFiles={selectedFiles}
            loading={loading}
            inputRef={acaInputRef}
            onDrop={onAcaDrop}
            onRemove={onRemoveAcaFile}
            onBrowseSelect={onBrowseAca}
          />
        </div>

        <div className="h-px bg-gray-200" />

        <CarryOverFile
          carryOverFile={carryOverFile}
          loading={loading}
          inputRef={carryOverInputRef}
          onDrop={onCarryOverDrop}
          onChange={onCarryOverChange}
        />

        <div className="grid gap-2">
          <button
            className="w-full rounded-[10px] border border-transparent bg-gray-900 text-white px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors duration-150 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-default"
            type="submit"
            disabled={loading}
          >
            {loading ? '빌드 중...' : '빌드 시작'}
          </button>
        </div>
      </form>
      {error ? <p className="text-red-600 text-[13px] mt-1">{error}</p> : null}
    </section>
  );
}
