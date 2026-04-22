interface FooterButtonProps {
  variant: "black" | "green";
  children: React.ReactNode;
  disabled?: boolean;
}

function FooterButton({ variant, children, disabled }: FooterButtonProps) {
  const palette =
    variant === "black"
      ? {
        background: "var(--aca-black)",
        color: "var(--aca-white)",
        border: "none",
      }
      : {
        background: "var(--aca-green-light)",
        color: "var(--aca-green)",
        border: "1px solid #B6E4CB",
      };

  return (
    <button
      type="button"
      disabled={disabled}
      className="w-full rounded-md px-3.5 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      style={{ height: 44, ...palette }}
    >
      {children}
    </button>
  );
}

interface RightPanelFooterProps {
  disabled?: boolean;
  selectedExportCount: number;
}

export function RightPanelFooter({
  disabled,
  selectedExportCount,
}: RightPanelFooterProps) {
  return (
    <div
      className="flex flex-col gap-2 px-3.5 py-3"
      style={{
        background: "var(--aca-white)",
        borderTop: "1px solid var(--aca-gray-100)",
        opacity: disabled ? 0.45 : 1,
        pointerEvents: disabled ? "none" : undefined,
      }}
    >
      <FooterButton variant="black" disabled={disabled}>
        모든 강사의 정산 데이터를 한 시트에 저장
      </FooterButton>
      <FooterButton variant="green" disabled={disabled}>
        선택한 강사 정산 데이터를 파일별로 저장 ({selectedExportCount})
      </FooterButton>
      <FooterButton variant="green" disabled={disabled}>
        선택한 강사 정산 데이터를 시트별로 저장 ({selectedExportCount})
      </FooterButton>
    </div>
  );
}
