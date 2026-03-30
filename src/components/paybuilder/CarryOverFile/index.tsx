'use client';

import { type DragEvent, type RefObject } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  carryOverFile: File | null;
  loading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onChange: (file: File | null) => void;
};

export function CarryOverFile({ carryOverFile, loading, inputRef, onDrop, onChange }: Props) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-100 grid gap-3.5 min-w-0">
      <div className="grid gap-1">
        <div className="text-[15px] font-bold">전월 미납 업로드</div>
        <div className="text-gray-500 text-[13px] leading-relaxed">이전 달 생성 파일로 미납 정보를 이어받을 수 있습니다</div>
      </div>

      {carryOverFile ? (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3.5 bg-green-50 border border-green-200 rounded-xl cursor-pointer transition-colors duration-150 min-w-0 overflow-hidden hover:bg-green-100 hover:border-green-300"
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-emerald-50 border border-green-200 rounded-lg flex items-center justify-center text-emerald-500 shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">{carryOverFile.name}</div>
              <div className="text-[13px] text-gray-500">{(carryOverFile.size / 1024).toFixed(1)} KB</div>
            </div>
          </div>
          <button
            type="button"
            aria-label={`${carryOverFile.name} 삭제`}
            disabled={loading}
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="w-7 h-7 rounded-md border border-gray-200 bg-white text-gray-400 text-base cursor-pointer flex items-center justify-center p-0 shrink-0 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
          >
            &times;
          </button>
        </div>
      ) : (
        <div
          className={cn(
            'border-2 border-dashed border-gray-200 rounded-xl p-5 text-center bg-white cursor-pointer transition-colors duration-150 hover:border-gray-400',
            loading && 'opacity-60 pointer-events-none',
          )}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          onClick={() => !loading && inputRef.current?.click()}
        >
          <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-500">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 6v14M10 12l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 22v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-sm text-gray-500">파일을 드래그하거나 클릭하여 업로드</div>
          <div className="text-[13px] text-gray-400 mt-1">.xlsx 파일</div>
        </div>
      )}

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".xlsx"
        disabled={loading}
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}
