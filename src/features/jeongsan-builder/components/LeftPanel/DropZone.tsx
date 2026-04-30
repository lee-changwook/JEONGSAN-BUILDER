"use client";

import { useState, type DragEvent } from "react";
import { Upload } from "lucide-react";

type DropZoneState = "empty" | "hover" | "error";

interface DropZoneProps {
  accept?: string;
  acceptExtensions?: string[];
  small?: boolean;
  state?: DropZoneState;
  disabled?: boolean;
  onClick?: () => void;
  onFileDrop?: (file: File) => void;
}

export function DropZone({
  accept = ".xlsx, .xls 파일",
  acceptExtensions = [".xlsx", ".xls"],
  small,
  state = "empty",
  disabled = false,
  onClick,
  onFileDrop,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const isError = state === "error";
  const isHover = state === "hover" || isDragOver;

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

  function isAcceptedFile(file: File) {
    if (acceptExtensions.length === 0) return true;
    const lowerName = file.name.toLowerCase();
    return acceptExtensions.some((ext) => lowerName.endsWith(ext.toLowerCase()));
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    if (disabled || !onFileDrop) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    if (!isDragOver) setIsDragOver(true);
  }

  function handleDragEnter(event: DragEvent<HTMLButtonElement>) {
    if (disabled || !onFileDrop) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
    if (disabled || !onFileDrop) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    if (disabled || !onFileDrop) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    if (!isAcceptedFile(file)) return;
    onFileDrop(file);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      disabled={disabled}
      className={`flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-lg border-[1.5px] border-dashed transition-all ${borderClass} ${bgClass} ${
        small ? "px-3.5 py-[22px]" : "px-3.5 py-[26px]"
      } disabled:cursor-not-allowed disabled:opacity-60`}
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
