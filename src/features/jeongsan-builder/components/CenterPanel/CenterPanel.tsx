import { InstructorCardHeader } from "@/features/jeongsan-builder/components/CenterPanel/InstructorCardHeader";
import { SettlementItemTable } from "@/features/jeongsan-builder/components/CenterPanel/SettlementItemTable";
import { SummaryBar } from "@/features/jeongsan-builder/components/CenterPanel/SummaryBar";
import { MOCK_INSTRUCTOR_SUMMARY } from "@/features/jeongsan-builder/mocks";

export function CenterPanelFilled() {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col"
      style={{ background: "var(--aca-white)" }}
    >
      <SummaryBar />
      <InstructorCardHeader summary={MOCK_INSTRUCTOR_SUMMARY} />
      <SettlementItemTable />
    </div>
  );
}
