'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void | Promise<void>;
  accepted?: string;
}

export function FileUpload({ onFileSelect, accepted }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = (accepted ?? '.xlsx,.xls')
    .split(',')
    .map((ext) => ext.trim().toLowerCase());

  function isAcceptedFile(f: File): boolean {
    const name = f.name.toLowerCase();
    return allowedExtensions.some((ext) => name.endsWith(ext));
  }

  function handleFile(f: File) {
    if (!isAcceptedFile(f)) return;
    setFile(f);
    onFileSelect(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function handleClick() {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }

  if (file) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-3.5 bg-emerald-50 border border-green-200 rounded-xl cursor-pointer transition-colors hover:bg-green-100 hover:border-green-300"
        onClick={handleClick}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-emerald-50 border border-green-200 rounded-lg flex items-center justify-center text-lg text-emerald-500 shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</div>
            <div className="text-[13px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">클릭 또는 드래그앤드롭으로 다시 업로드</span>
        <input
          ref={inputRef}
          type="file"
          accept={accepted ?? '.xlsx,.xls'}
          className="hidden"
          onChange={handleChange}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-2 border-dashed border-gray-300 rounded-xl p-5 text-center bg-white cursor-pointer transition-colors hover:border-gray-400',
        dragging && 'border-gray-400'
      )}
      onClick={handleClick}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-500">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M16 6v14M10 12l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 22v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-sm text-gray-500">파일을 드래그하거나 클릭하여 업로드</div>
      <div className="text-[13px] text-gray-400 mt-1">{accepted ?? '.xlsx, .xls 파일'}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accepted ?? '.xlsx,.xls'}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
