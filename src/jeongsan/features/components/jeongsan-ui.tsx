"use client";

import { type DragEvent, useEffect, useRef } from "react";
import { isOpenXmlSpreadsheetFile } from "@/jeongsan/features/utils";

export function formatCurrency(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

/**
 * 브라우저 기본 체크박스에 가깝게 표시합니다. `indeterminate`는 「전체」 부분 선택용.
 */
export function Checkbox({
  checked,
  indeterminate,
  className = "",
  children,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  indeterminate?: boolean;
  children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 ${className}`}>
      <input
        {...props}
        ref={inputRef}
        type="checkbox"
        checked={checked}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border border-[var(--jb-line)] accent-[var(--jb-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--jb-accent)]/25"
      />
      {children}
    </label>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded-lg border border-[var(--jb-line)] bg-[var(--jb-field)] px-3 py-2 text-[13px] leading-tight text-[var(--jb-text)] placeholder:text-[var(--jb-muted)] ${className}`}
    />
  );
}

export function DenseInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={`h-7 w-full min-w-0 rounded border border-[var(--jb-line)] bg-white px-1.5 py-0.5 text-[11px] leading-snug text-[var(--jb-text)] ${className}`}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return (
    <textarea
      {...props}
      className={`min-h-24 w-full rounded-lg border border-[var(--jb-line)] bg-[var(--jb-field)] px-3 py-2 text-[13px] leading-relaxed text-[var(--jb-text)] placeholder:text-[var(--jb-muted)] ${className}`}
    />
  );
}

export function ActionButton({
  tone = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "ghost"; className?: string }) {
  const toneClass =
    tone === "primary"
      ? "border-transparent bg-[var(--jb-accent)] text-white shadow-sm"
      : tone === "secondary"
        ? "border border-[var(--jb-accent)]/25 bg-[var(--jb-accent-soft)] text-[var(--jb-text)]"
        : "border border-[var(--jb-line)] bg-[var(--jb-field)] text-[var(--jb-text)]";
  return (
    <button
      {...props}
      className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${toneClass} ${className}`}
    />
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber" | "danger";
}) {
  const boxClass =
    tone === "danger"
      ? "rounded-[18px] border border-[var(--jb-danger)]/25 bg-[rgba(220,38,38,0.06)] p-3.5"
      : tone === "amber"
        ? "rounded-[18px] border border-amber-200 bg-amber-50/80 p-3.5"
        : "rounded-[18px] border border-[var(--jb-line)] bg-[var(--jb-field)] p-3.5";
  const labelClass =
    tone === "danger" ? "text-xs text-[var(--jb-danger)]" : tone === "amber" ? "text-xs text-amber-900/80" : "text-xs text-[var(--jb-muted)]";
  const valueClass =
    tone === "danger"
      ? "mt-1.5 text-xl font-medium tabular-nums text-[var(--jb-danger)]"
      : tone === "amber"
        ? "mt-1.5 text-xl font-medium tabular-nums text-amber-950"
        : "mt-1.5 text-xl font-medium tabular-nums text-[var(--jb-text)]";

  return (
    <div className={boxClass}>
      <div className={labelClass}>{label}</div>
      <div className={valueClass}>{value}</div>
    </div>
  );
}

function fileMergeKey(file: File) {
  return `${file.name}::${file.size}`;
}

function mergeSpreadsheetFiles(files: File[], incoming: File[]) {
  const map = new Map<string, File>();
  for (const f of files) {
    map.set(fileMergeKey(f), f);
  }
  for (const f of incoming.filter(isOpenXmlSpreadsheetFile)) {
    map.set(fileMergeKey(f), f);
  }
  return Array.from(map.values());
}

export function PayDocumentsDropZone({ files, onFiles }: { files: File[]; onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const dropped = Array.from(event.dataTransfer.files);
    if (dropped.length === 0) {
      return;
    }
    onFiles(mergeSpreadsheetFiles(files, dropped));
  }

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className="grid gap-3 rounded-2xl border border-dashed border-[var(--jb-line)] bg-[var(--jb-field)] p-4"
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
        onChange={(event) => onFiles(mergeSpreadsheetFiles(files, Array.from(event.target.files ?? [])))}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium text-[var(--jb-text)]">페이 문서</div>
          <p className="m-0 mt-1 text-xs text-[var(--jb-muted)] leading-relaxed">
            각 행정관에서 만든 페이 문서를 넣습니다. 여러 파일을 이어서 추가할 수 있습니다.
          </p>
        </div>
        <ActionButton tone="ghost" onClick={() => inputRef.current?.click()}>
          파일 추가
        </ActionButton>
      </div>
      <div className="flex max-h-[220px] min-h-[72px] flex-col gap-2 overflow-y-auto pr-1">
        {files.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--jb-line)] bg-white px-3 py-6 text-xs text-[var(--jb-muted)]">
            여기에 `.xlsx` / `.xlsm`을 끌어놓거나 파일 추가를 눌러 주세요.
          </div>
        ) : (
          files.map((file, index) => (
            <div
              key={fileMergeKey(file)}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--jb-line)] bg-white px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="break-all text-[13px] font-medium leading-tight">{file.name}</div>
                <div className="text-xs text-[var(--jb-muted)]">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
              <button
                type="button"
                aria-label={`${file.name} 삭제`}
                onClick={() => onFiles(files.filter((_, i) => i !== index))}
                className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--jb-line)] bg-[var(--jb-field)] p-0 text-[18px] leading-none text-[var(--jb-text)]"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function FileDropZone({
  title,
  files,
  multiple = false,
  accent = false,
  compact = false,
  onFiles,
}: {
  title: string;
  files: File[];
  multiple?: boolean;
  accent?: boolean;
  compact?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function resetFileInput() {
    const input = inputRef.current;
    if (input) {
      input.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const dropped = Array.from(event.dataTransfer.files).filter(isOpenXmlSpreadsheetFile);
    if (dropped.length === 0) {
      return;
    }
    onFiles(multiple ? dropped : dropped.slice(0, 1));
  }

  function removeAt(index: number) {
    onFiles(multiple ? files.filter((_, i) => i !== index) : []);
    resetFileInput();
  }

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className={
        accent || compact
          ? "rounded-[10px] border border-dashed border-[var(--jb-line)] bg-[var(--jb-field)] p-4"
          : "rounded-[10px] border border-dashed border-[var(--jb-line)] bg-[var(--jb-field)] p-5"
      }
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []).filter(isOpenXmlSpreadsheetFile);
          onFiles(multiple ? picked : picked.slice(0, 1));
          resetFileInput();
        }}
      />
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[13px] font-medium text-[var(--jb-text)]">{title}</div>
          <ActionButton tone="ghost" onClick={() => inputRef.current?.click()}>
            파일 선택
          </ActionButton>
        </div>
        {files.length > 0 ? (
          <div className="flex flex-col gap-2">
            {files.map((file, index) => (
              <div
                key={fileMergeKey(file)}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--jb-line)] bg-white px-2.5 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="break-all text-[13px] font-medium leading-tight">{file.name}</div>
                  <div className="text-xs text-[var(--jb-muted)]">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button
                  type="button"
                  aria-label={`${file.name} 삭제`}
                  onClick={() => removeAt(index)}
                  className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--jb-line)] bg-[var(--jb-field)] p-0 text-[18px] leading-none text-[var(--jb-text)]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={`rounded-lg bg-white px-3 text-xs text-[var(--jb-muted)] ${compact ? "py-3" : "py-8"}`}>
            여기에 `.xlsx` 또는 `.xlsm` 파일을 끌어놓거나 파일 선택을 눌러 주세요.
          </div>
        )}
      </div>
    </div>
  );
}

const uploadSelectClass =
  "h-9 shrink-0 cursor-pointer rounded-lg border border-[var(--jb-line)] bg-[var(--jb-field)] px-3 text-[13px] tabular-nums text-[var(--jb-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--jb-accent)]/25";

export function UploadSettings({
  year,
  month,
  onYearChange,
  onMonthChange,
}: {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}) {
  const currentY = new Date().getFullYear();
  const yRaw = Number.isFinite(year) ? year : currentY;
  const mo = Math.min(12, Math.max(1, Number.isFinite(month) ? month : 1));
  const yearMin = Math.min(currentY - 20, yRaw);
  const yearMax = Math.max(currentY + 3, yRaw);
  const years = Array.from(
    { length: yearMax - yearMin + 1 },
    (_, i) => yearMin + i,
  );

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <span className="shrink-0 text-sm font-medium leading-none text-[var(--jb-muted)]">
        대상 연·월
      </span>
      <div className="flex items-center gap-2">
        <label className="shrink-0">
          <span className="sr-only">대상 연도</span>
          <select
            className={`${uploadSelectClass} w-[7.5rem]`}
            value={yRaw}
            onChange={(event) => onYearChange(Number(event.target.value))}
            aria-label="대상 연도"
          >
            {years.map((yy) => (
              <option key={yy} value={yy}>
                {yy}년
              </option>
            ))}
          </select>
        </label>
        <label className="shrink-0">
          <span className="sr-only">대상 월</span>
          <select
            className={`${uploadSelectClass} w-[5.5rem]`}
            value={mo}
            onChange={(event) => onMonthChange(Number(event.target.value))}
            aria-label="대상 월"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
