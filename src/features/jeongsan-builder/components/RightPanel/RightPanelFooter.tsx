interface FooterButtonProps {
  variant: "black" | "green";
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

function FooterButton({ variant, children, disabled, onClick }: FooterButtonProps) {
  const variantClass =
    variant === "black"
      ? "border-none bg-[var(--aca-black)] text-[var(--aca-white)]"
      : "border border-[#B6E4CB] bg-[var(--aca-green-light)] text-[var(--aca-green)]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-11 w-full cursor-pointer rounded-md px-3.5 text-[12px] font-semibold transition-opacity duration-100 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 ${variantClass}`}
    >
      {children}
    </button>
  );
}

interface RightPanelFooterProps {
  disabled?: boolean;
  selectedExportCount: number;
  exporting?: boolean;
  onExportAll?: () => void;
  onExportPerFile?: () => void;
  onExportPerSheet?: () => void;
}

export function RightPanelFooter({
  disabled,
  selectedExportCount,
  exporting,
  onExportAll,
  onExportPerFile,
  onExportPerSheet,
}: RightPanelFooterProps) {
  const hasSelection = selectedExportCount > 0;
  const isBusy = Boolean(exporting);
  const topDisabled = disabled || isBusy;
  const selectionDisabled = disabled || isBusy || !hasSelection;

  return (
    <div
      className={`flex flex-col gap-2 border-t border-[var(--aca-gray-100)] bg-[var(--aca-white)] px-3.5 py-3 ${
        disabled ? "pointer-events-none opacity-45" : "opacity-100"
      }`}
    >
      <FooterButton variant="black" disabled={topDisabled} onClick={onExportAll}>
        {isBusy ? "내보내는 중..." : "모든 강사의 정산 데이터를 한 시트에 저장"}
      </FooterButton>
      <FooterButton
        variant="green"
        disabled={selectionDisabled}
        onClick={onExportPerFile}
      >
        선택한 강사 정산 데이터를 파일별로 저장 ({selectedExportCount})
      </FooterButton>
      <FooterButton
        variant="green"
        disabled={selectionDisabled}
        onClick={onExportPerSheet}
      >
        선택한 강사 정산 데이터를 시트별로 저장 ({selectedExportCount})
      </FooterButton>
    </div>
  );
}
