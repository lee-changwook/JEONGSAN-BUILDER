"use client";

import { Upload } from "lucide-react";

type DropZoneState = "empty" | "hover" | "error";

interface DropZoneProps {
  accept?: string;
  small?: boolean;
  state?: DropZoneState;
  onClick?: () => void;
}

export function DropZone({
  accept = ".xlsx, .xls 파일",
  small,
  state = "empty",
  onClick,
}: DropZoneProps) {
  const isError = state === "error";
  const isHover = state === "hover";

  const borderClass = isError
    ? "border-[var(--aca-red-primary)]"
    : isHover
      ? "border-[var(--aca-blue-primary)]"
      : "border-[var(--aca-gray-200)]";
  const bgClass = isError
    ? "bg-[var(--aca-red-10)]"
    : isHover
      ? "bg-[var(--aca-blue-10)]"
      : "bg-[var(--aca-white)]";
  const iconColorClass = isError
    ? "text-[var(--aca-red-primary)]"
    : "text-[var(--aca-gray-500)]";
  const labelColorClass = isError
    ? "text-[var(--aca-red-primary)]"
    : "text-[var(--aca-gray-600)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-lg border-[1.5px] border-dashed transition-all ${borderClass} ${bgClass} ${
        small ? "px-3.5 py-[22px]" : "px-3.5 py-[26px]"
      }`}
    >
      <div
        className={`flex size-8 items-center justify-center rounded-full border border-[var(--aca-gray-100)] bg-[var(--aca-white)] ${iconColorClass}`}
      >
        <Upload className="size-4" />
      </div>
      <div className={`text-[13px] font-medium ${labelColorClass}`}>
        파일을 드래그하거나 클릭하여 업로드
      </div>
      <div className="text-[11px] text-[var(--aca-gray-400)]">
        {accept}
      </div>
    </button>
  );
}
