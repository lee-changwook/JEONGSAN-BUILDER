'use client';

import { type DragEvent, type RefObject } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  selectedFiles: File[];
  loading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onRemove: (key: string) => void;
  onBrowseSelect: (files: File[]) => void;
};

export function FileDropZone({ selectedFiles, loading, inputRef, onDrop, onRemove, onBrowseSelect }: Props) {
  return (
    <div onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className="grid gap-2 min-w-0">
      <div
        className={cn(
          'border-2 border-dashed border-gray-200 rounded-xl p-5 text-center bg-white cursor-pointer transition-colors duration-150 hover:border-gray-400',
          loading && 'opacity-60 pointer-events-none',
        )}
        onClick={() => !loading && inputRef.current?.click()}
      >
        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-500">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 6v14M10 12l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 22v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-sm text-gray-500">파일을 드래그하거나 클릭하여 업로드</div>
        <div className="text-[13px] text-gray-400 mt-1">.xlsx, .xls 파일</div>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept=".xlsx"
          multiple
          disabled={loading}
          onChange={(event) => {
            const files = event.target.files ? Array.from(event.target.files) : [];
            if (files.length > 0) onBrowseSelect(files);
            event.currentTarget.value = '';
          }}
        />
      </div>

      <div className="grid gap-2 min-h-[240px] max-h-[240px] overflow-y-auto pr-1">
        {selectedFiles.length > 0 ? (
          selectedFiles.map((file, index) => {
            const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
            return (
              <div key={`${file.name}-${index}`} className="flex justify-between gap-3 px-2.5 py-2 rounded-lg border border-gray-200 bg-white">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[13px] leading-[1.3] overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</div>
                </div>
                <div className="flex items-center gap-2.5 whitespace-nowrap">
                  <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                  <button
                    type="button"
                    aria-label={`${file.name} 삭제`}
                    disabled={loading}
                    onClick={() => onRemove(fileKey)}
                    className="w-7 h-7 rounded-md border border-gray-200 bg-white text-gray-400 text-base cursor-pointer flex items-center justify-center p-0 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                  >
                    &times;
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-3.5 py-3 min-h-[72px] rounded-lg border border-dashed border-[#d8ccbb] text-gray-500 bg-white">
            아직 업로드된 반별 엑셀이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
