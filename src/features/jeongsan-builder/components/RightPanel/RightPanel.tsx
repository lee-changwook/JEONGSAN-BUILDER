"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";

import { InstructorRow } from "@/features/jeongsan-builder/components/RightPanel/InstructorRow";
import { RightPanelFooter } from "@/features/jeongsan-builder/components/RightPanel/RightPanelFooter";
import { RightPanelSearch } from "@/features/jeongsan-builder/components/RightPanel/RightPanelSearch";
import { MOCK_INSTRUCTORS } from "@/features/jeongsan-builder/mocks";
import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";

interface RightPanelProps {
  empty?: boolean;
}

export function RightPanel({ empty }: RightPanelProps) {
  const search = useBuilderStore((s) => s.instructorSearch);
  const setSearch = useBuilderStore((s) => s.setInstructorSearch);
  const activeInstructor = useBuilderStore((s) => s.activeInstructor);
  const setActiveInstructor = useBuilderStore((s) => s.setActiveInstructor);
  const exportChecks = useBuilderStore((s) => s.exportChecks);
  const toggleExportCheck = useBuilderStore((s) => s.toggleExportCheck);

  const filtered = useMemo(() => {
    if (empty) return [];
    const query = search.trim().toLowerCase();
    if (!query) return MOCK_INSTRUCTORS;
    return MOCK_INSTRUCTORS.filter(
      (it) =>
        it.name.toLowerCase().includes(query) ||
        it.subject.toLowerCase().includes(query),
    );
  }, [search, empty]);

  const selectedExportCount = exportChecks.size;

  return (
    <aside
      className="flex h-full w-[320px] min-w-[300px] shrink-0 flex-col"
      style={{
        background: "var(--aca-gray-10)",
        borderLeft: "1px solid var(--aca-gray-100)",
        boxShadow: "-5px 0 10px 0 rgba(15,18,31,0.05)",
      }}
    >
      {/* Header */}
      <div
        className="px-3.5 py-3.5"
        style={{
          background: "var(--aca-white)",
          borderBottom: "1px solid var(--aca-gray-100)",
        }}
      >
        <div className="mb-2.5 flex items-center justify-between">
          <div
            className="text-sm font-bold"
            style={{ color: empty ? "var(--aca-gray-400)" : "var(--aca-black)" }}
          >
            강사
          </div>
          <div
            className="text-xs font-semibold"
            style={{
              color: empty ? "var(--aca-gray-300)" : "var(--aca-gray-500)",
            }}
          >
            {empty ? 0 : filtered.length}
          </div>
        </div>
        <RightPanelSearch value={search} onChange={setSearch} disabled={empty} />
        <button
          type="button"
          disabled={empty}
          className="mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-[4px] text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: "var(--aca-blue-100)",
            color: "var(--aca-blue-primary)",
            border: "1px solid var(--aca-blue-200)",
            fontFamily: "inherit",
            cursor: empty ? "not-allowed" : "pointer",
          }}
        >
          <Plus className="size-3.5" />
          정산 대상 추가
        </button>
      </div>

      {/* Body */}
      {empty ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div
            className="text-center text-xs leading-[1.6]"
            style={{ color: "var(--aca-gray-400)" }}
          >
            <div
              className="mb-1 text-[13px] font-semibold"
              style={{ color: "var(--aca-gray-500)" }}
            >
              데이터가 없습니다
            </div>
            <div>
              정산 데이터를 생성하면
              <br />
              강사 목록이 표시됩니다
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-1 p-8 text-center text-xs"
              style={{ color: "var(--aca-gray-400)" }}
            >
              <div
                className="text-[13px] font-semibold"
                style={{ color: "var(--aca-gray-500)" }}
              >
                검색 결과가 없습니다
              </div>
              <div>다른 키워드로 시도해 보세요</div>
            </div>
          ) : (
            filtered.map((instructor) => (
              <InstructorRow
                key={instructor.name}
                {...instructor}
                active={instructor.name === activeInstructor}
                exportChecked={exportChecks.has(instructor.name)}
                onClick={() => setActiveInstructor(instructor.name)}
                onToggleExport={() => toggleExportCheck(instructor.name)}
              />
            ))
          )}
        </div>
      )}

      <RightPanelFooter
        disabled={empty}
        selectedExportCount={selectedExportCount}
      />
    </aside>
  );
}
