interface StepIndicatorProps {
  step: number;
  label: string;
  active?: boolean;
  done?: boolean;
}

export function StepIndicator({ step, label, active, done }: StepIndicatorProps) {
  const filled = active || done;
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold"
        style={{
          background: filled ? "var(--aca-blue-primary)" : "var(--aca-white)",
          color: filled ? "var(--aca-white)" : "var(--aca-gray-400)",
          borderColor: filled ? "var(--aca-blue-primary)" : "var(--aca-gray-200)",
        }}
      >
        {step}
      </div>
      <span
        className="text-sm"
        style={{
          fontWeight: active ? 600 : 500,
          color: active ? "var(--aca-black)" : "var(--aca-gray-400)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function StepConnector({ done }: { done?: boolean }) {
  return (
    <div
      className="ml-[11.5px] h-3.5 w-[1.5px]"
      style={{ background: done ? "var(--aca-blue-primary)" : "var(--aca-gray-200)" }}
    />
  );
}
