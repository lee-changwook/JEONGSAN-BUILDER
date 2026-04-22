import { WorkbenchShell } from "@/jeongsan/features/components/workbench-shell";

export default function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkbenchShell>{children}</WorkbenchShell>;
}
