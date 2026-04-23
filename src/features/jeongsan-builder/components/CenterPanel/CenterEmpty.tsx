import { File as FileIcon } from "lucide-react";

export function CenterEmpty() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--aca-gray-10)] p-10">
      <div className="flex max-w-[520px] flex-col items-center gap-3.5 text-center">
        <div className="flex size-16 items-center justify-center rounded-xl border border-dashed border-[var(--aca-gray-200)] bg-[var(--aca-white)] text-[var(--aca-gray-300)]">
          <FileIcon className="size-7" />
        </div>
        <div className="text-[32px] font-black leading-[1.3] tracking-[-0.5px] text-[var(--aca-black)]">
          정산 데이터가 아직 생성되지 않았습니다.
        </div>
        <div className="text-lg font-normal leading-[1.55] text-[var(--aca-gray-500)]">
          왼쪽 패널에서 정산 데이터를 만들면 표시됩니다.
        </div>
      </div>
    </div>
  );
}
