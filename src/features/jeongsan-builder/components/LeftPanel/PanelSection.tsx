import type { ReactNode } from "react";

interface PanelSectionProps {
  title: string;
  subtitle?: string;
  muted?: boolean;
  children: ReactNode;
}

export function PanelSection({ title, subtitle, muted, children }: PanelSectionProps) {
  return (
    <div
      className="rounded-md"
      style={{
        background: muted ? "transparent" : "var(--aca-white)",
        border: muted ? "none" : "1px solid var(--aca-gray-100)",
        padding: muted ? 0 : 16,
        opacity: muted ? 0.55 : 1,
      }}
    >
      <div
        className="mb-1 text-[15px] font-bold"
        style={{ color: "var(--aca-black)" }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          className="mb-3.5 text-xs leading-[1.55]"
          style={{ color: "var(--aca-gray-500)" }}
        >
          {subtitle}
        </div>
      )}
      {children}
    </div>
  );
}
