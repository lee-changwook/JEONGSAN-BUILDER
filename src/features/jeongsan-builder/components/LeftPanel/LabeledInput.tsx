"use client";

interface LabeledInputProps {
  label: string;
  value: string | number;
  onChange?: (value: string) => void;
  align?: "left" | "right";
}

export function LabeledInput({ label, value, onChange, align = "left" }: LabeledInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs font-medium"
        style={{ color: "var(--aca-gray-500)" }}
      >
        {label}
      </label>
      <div
        className="flex h-[27px] items-center rounded-[4px] px-2"
        style={{
          border: `1px solid ${value ? "var(--aca-gray-300)" : "var(--aca-gray-200)"}`,
          background: "var(--aca-white)",
        }}
      >
        <input
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full min-w-0 border-none bg-transparent p-0 text-[13px] outline-none"
          style={{
            color: "var(--aca-black)",
            textAlign: align,
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}
