"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useJeongsanBuilder } from "@/jeongsan/features/jeongsan-builder-provider";
import { ActionButton } from "@/jeongsan/features/components/jeongsan-ui";
import { TeacherSidebar } from "@/jeongsan/features/components/teacher-sidebar";

const SECTIONS = [
  { href: "/jeongsan/payout", label: "강사 정산" },
  { href: "/jeongsan/assistants", label: "조교지급액" },
] as const;

export function WorkbenchShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    settlement,
    selectedTeacherId,
    exportSelectedIds,
    setSelectedTeacherId,
    toggleExportSelected,
    setExportSelectAll,
    exporting,
    download,
    error,
  } = useJeongsanBuilder();

  useEffect(() => {
    if (!settlement) {
      router.replace("/jeongsan");
    }
  }, [settlement, router]);

  if (!settlement) {
    return (
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-[var(--jb-bg)] text-[var(--jb-muted)]">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden bg-[var(--jb-bg)] text-[var(--jb-text)]">
      <header className="flex shrink-0 flex-col gap-3 border-b border-[var(--jb-line)] bg-[var(--jb-field)] px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--jb-muted)]">작업대</div>
          <div className="truncate text-lg font-semibold text-[var(--jb-text)]">
            {settlement.year}년 {settlement.month}월 · 강사 {settlement.teachers.length}명
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="편집 구역">
          {SECTIONS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "rounded-lg bg-[var(--jb-accent)] px-3 py-1.5 text-[13px] font-medium text-white shadow-sm"
                    : "rounded-lg border border-transparent px-3 py-1.5 text-[13px] font-normal text-[var(--jb-muted)] hover:border-[var(--jb-line)] hover:bg-white"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            tone="secondary"
            disabled={exporting || exportSelectedIds.length === 0}
            onClick={() => download("selected")}
          >
            {exporting ? "내보내는 중…" : `선택 강사 엑셀 (${exportSelectedIds.length})`}
          </ActionButton>
          <ActionButton tone="primary" disabled={exporting} onClick={() => download("all")}>
            전체 엑셀
          </ActionButton>
          <Link
            href="/jeongsan"
            className="rounded-lg border border-[var(--jb-line)] bg-white px-3 py-2 text-sm font-medium text-[var(--jb-muted)] hover:bg-[var(--jb-field)]"
          >
            파일 다시
          </Link>
        </div>
      </header>

      {error ? (
        <div className="shrink-0 border-b border-[var(--jb-danger)]/25 bg-red-50 px-4 py-2 text-sm text-[var(--jb-danger)]">{error}</div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="flex h-full min-h-0 w-[min(100%,300px)] shrink-0 flex-col overflow-hidden border-r border-[var(--jb-line)] bg-[var(--jb-field)] px-3 py-4">
          <div className="mb-3 shrink-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--jb-muted)]">강사 선택</div>
            <p className="m-0 mt-1 text-[11px] leading-snug text-[var(--jb-muted)]">
              편집할 강사를 고르고, 엑셀에 넣을 강사는 체크하세요.
            </p>
          </div>
          <TeacherSidebar
            teachers={settlement.teachers}
            selectedTeacherId={selectedTeacherId}
            exportSelectedIds={exportSelectedIds}
            onSelectTeacher={setSelectedTeacherId}
            onToggleExport={toggleExportSelected}
            onSelectAllExport={setExportSelectAll}
          />
        </aside>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain bg-[var(--jb-surface)] p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
