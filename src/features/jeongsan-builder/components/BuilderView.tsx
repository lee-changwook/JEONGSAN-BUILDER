"use client";

import { CenterEmpty } from "@/features/jeongsan-builder/components/CenterPanel/CenterEmpty";
import { CenterPanelFilled } from "@/features/jeongsan-builder/components/CenterPanel/CenterPanel";
import { LeftPanel } from "@/features/jeongsan-builder/components/LeftPanel/LeftPanel";
import { RightPanel } from "@/features/jeongsan-builder/components/RightPanel/RightPanel";
import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";

export function BuilderView() {
  const uploaded = useBuilderStore((s) => s.uploaded);

  return (
    <div
      className="jb2-scope flex h-screen w-full overflow-hidden"
      style={{ background: "var(--aca-gray-10)", color: "var(--aca-black)" }}
    >
      <LeftPanel />
      {uploaded ? <CenterPanelFilled /> : <CenterEmpty />}
      <RightPanel empty={!uploaded} />
    </div>
  );
}
