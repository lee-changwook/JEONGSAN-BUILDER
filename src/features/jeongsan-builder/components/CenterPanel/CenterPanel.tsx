import { AddItemModal } from "@/features/jeongsan-builder/components/AddItemModal/AddItemModal";
import { InstructorCardHeader } from "@/features/jeongsan-builder/components/CenterPanel/InstructorCardHeader";
import { SettlementItemActions } from "@/features/jeongsan-builder/components/CenterPanel/SettlementItemActions";
import { SettlementItemTable } from "@/features/jeongsan-builder/components/CenterPanel/SettlementItemTable";
import { SummaryBar } from "@/features/jeongsan-builder/components/CenterPanel/SummaryBar";

export function CenterPanelFilled() {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col"
      style={{ background: "var(--aca-white)" }}
    >
      <SummaryBar />
      <InstructorCardHeader />
      <SettlementItemTable />
      <SettlementItemActions />
      <AddItemModal />
    </div>
  );
}
