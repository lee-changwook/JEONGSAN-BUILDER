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

  const borderColor = isError
    ? "var(--aca-red-primary)"
    : isHover
      ? "var(--aca-blue-primary)"
      : "var(--aca-gray-200)";
  const bgColor = isError
    ? "var(--aca-red-10)"
    : isHover
      ? "var(--aca-blue-10)"
      : "var(--aca-white)";
  const iconColor = isError ? "var(--aca-red-primary)" : "var(--aca-gray-500)";
  const labelColor = isError ? "var(--aca-red-primary)" : "var(--aca-gray-600)";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-lg border-[1.5px] border-dashed transition-all ${
        small ? "px-3.5 py-[22px]" : "px-3.5 py-[26px]"
      }`}
      style={{ borderColor, background: bgColor }}
    >
      <div
        className="flex size-8 items-center justify-center rounded-full border"
        style={{
          background: "var(--aca-white)",
          borderColor: "var(--aca-gray-100)",
          color: iconColor,
        }}
      >
        <Upload className="size-4" />
      </div>
      <div className="text-[13px] font-medium" style={{ color: labelColor }}>
        파일을 드래그하거나 클릭하여 업로드
      </div>
      <div className="text-[11px]" style={{ color: "var(--aca-gray-400)" }}>
        {accept}
      </div>
    </button>
  );
}
