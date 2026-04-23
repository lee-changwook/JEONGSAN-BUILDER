interface StepIndicatorProps {
  label: string;
  active?: boolean;
  done?: boolean;
}

export function StepIndicator({ label, active, done }: StepIndicatorProps) {
  const filled = active || done;
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] ${
          filled
            ? "border-[var(--aca-blue-primary)] bg-[var(--aca-blue-primary)]"
            : "border-[var(--aca-gray-200)] bg-[var(--aca-white)]"
        }`}
      >
        {done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 3.5L3.8 6.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {active && !done && (
          <div className="size-2 rounded-full bg-[var(--aca-white)]" />
        )}
      </div>
      <span
        className={`text-sm ${
          active
            ? "font-semibold text-[var(--aca-black)]"
            : "font-medium text-[var(--aca-gray-400)]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function StepConnector({ done }: { done?: boolean }) {
  return (
    <div
      className={`ml-[11.5px] h-3.5 w-[1.5px] ${
        done ? "bg-[var(--aca-blue-primary)]" : "bg-[var(--aca-gray-200)]"
      }`}
    />
  );
}
