import { File as FileIcon } from "lucide-react";

export function CenterEmpty() {
  return (
    <div
      className="flex flex-1 items-center justify-center p-10"
      style={{ background: "var(--aca-gray-10)" }}
    >
      <div className="flex max-w-[520px] flex-col items-center gap-3.5 text-center">
        <div
          className="flex size-16 items-center justify-center rounded-xl"
          style={{
            background: "var(--aca-white)",
            border: "1px dashed var(--aca-gray-200)",
            color: "var(--aca-gray-300)",
          }}
        >
          <FileIcon className="size-7" />
        </div>
        <div
          className="text-[32px] leading-[1.3] tracking-[-0.5px]"
          style={{ color: "var(--aca-black)", fontWeight: 900 }}
        >
          정산 데이터가 아직 생성되지 않았습니다.
        </div>
        <div
          className="text-lg leading-[1.55]"
          style={{ color: "var(--aca-gray-500)", fontWeight: 400 }}
        >
          왼쪽 패널에서 정산 데이터를 만들면 표시됩니다.
        </div>
      </div>
    </div>
  );
}
