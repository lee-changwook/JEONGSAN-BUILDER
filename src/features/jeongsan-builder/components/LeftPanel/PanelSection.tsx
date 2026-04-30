import type { ReactNode } from "react";

interface PanelSectionProps {
  title: string;
  subtitle?: ReactNode;
  muted?: boolean;
  children: ReactNode;
}

export function PanelSection({ title, subtitle, muted, children }: PanelSectionProps) {
  return (
    <div
      className={`rounded-md border border-[var(--aca-gray-100)] bg-[var(--aca-white)] p-4 ${
        muted ? "opacity-55" : "opacity-100"
      }`}
    >
      <div className="mb-1 text-[15px] font-bold text-[var(--aca-black)]">
        {title}
      </div>
      {subtitle && (
        <div className="mb-3.5 text-xs leading-[1.55] text-[var(--aca-gray-500)]">
          {subtitle}
        </div>
      )}
      {children}
    </div>
  );
}
