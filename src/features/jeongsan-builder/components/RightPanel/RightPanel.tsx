"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { InstructorRow } from "@/features/jeongsan-builder/components/RightPanel/InstructorRow";
import { RightPanelFooter } from "@/features/jeongsan-builder/components/RightPanel/RightPanelFooter";
import {
  RightPanelSearch,
  type SortOrder,
} from "@/features/jeongsan-builder/components/RightPanel/RightPanelSearch";
import { useBuilderStore } from "@/features/jeongsan-builder/store/useBuilderStore";
import { formatKRW } from "@/features/jeongsan-builder/calculator";
import {
  buildSettlementExport,
  downloadArtifact,
  type ExportMode,
} from "@/features/jeongsan-builder/exporter";

interface RightPanelProps {
  empty?: boolean;
}

export function RightPanel({ empty }: RightPanelProps) {
  const calculator = useBuilderStore((s) => s.calculator);
  const search = useBuilderStore((s) => s.instructorSearch);
  const setSearch = useBuilderStore((s) => s.setInstructorSearch);
  const activeTeacherId = useBuilderStore((s) => s.activeTeacherId);
  const setActiveTeacherId = useBuilderStore((s) => s.setActiveTeacherId);
  const exportChecks = useBuilderStore((s) => s.exportChecks);
  const toggleExportCheck = useBuilderStore((s) => s.toggleExportCheck);
  const addTeacher = useBuilderStore((s) => s.addTeacher);

  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherSubject, setNewTeacherSubject] = useState("");
  const [exporting, setExporting] = useState(false);

  const allRows =
    empty || !calculator
      ? []
      : calculator.getTeachers().map((teacher) => {
          const summary = calculator.getTeacherSummary(teacher.id);
          const net = summary?.net ?? 0;
          return {
            id: teacher.id,
            name: teacher.name,
            subject: teacher.subjectLabel,
            amount: summary ? formatKRW(net) : "-",
            net,
          };
        });

  const query = search.trim().toLowerCase();
  const searched =
    query === ""
      ? allRows
      : allRows.filter(
          (r) =>
            r.name.toLowerCase().includes(query) ||
            r.subject.toLowerCase().includes(query),
        );

  const filtered =
    sortOrder === "net-desc"
      ? [...searched].sort((a, b) => b.net - a.net)
      : sortOrder === "net-asc"
        ? [...searched].sort((a, b) => a.net - b.net)
        : searched;

  const selectedExportCount = exportChecks.size;

  const canSubmit = newTeacherName.trim().length > 0;

  function resetForm() {
    setNewTeacherName("");
    setNewTeacherSubject("");
  }

  function handleToggleForm() {
    if (addFormOpen) {
      resetForm();
      setAddFormOpen(false);
    } else {
      setAddFormOpen(true);
    }
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const createdId = addTeacher({
      name: newTeacherName,
      subjectLabel: newTeacherSubject,
    });
    if (createdId) {
      resetForm();
      setAddFormOpen(false);
    }
  }

  function handleCancel() {
    resetForm();
    setAddFormOpen(false);
  }

  async function runExport(mode: ExportMode) {
    if (!calculator || exporting) return;
    setExporting(true);
    try {
      const artifact = await buildSettlementExport({
        calculator,
        mode,
        teacherIds: mode === "all" ? undefined : [...exportChecks],
      });
      downloadArtifact(artifact);
    } catch (error) {
      console.error("[jeongsan-builder] export failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "엑셀 내보내기에 실패했습니다.";
      alert(message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <aside className="flex h-full w-[320px] min-w-[300px] shrink-0 flex-col border-l border-[var(--aca-gray-100)] bg-[var(--aca-gray-10)] shadow-[-5px_0_10px_0_rgba(15,18,31,0.05)]">
      {/* Header */}
      <div className="border-b border-[var(--aca-gray-100)] bg-[var(--aca-white)] px-3.5 py-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div
            className={`text-sm font-bold ${
              empty ? "text-[var(--aca-gray-400)]" : "text-[var(--aca-black)]"
            }`}
          >
            강사
          </div>
          <div
            className={`text-xs font-semibold ${
              empty ? "text-[var(--aca-gray-300)]" : "text-[var(--aca-gray-500)]"
            }`}
          >
            {empty ? 0 : filtered.length}
          </div>
        </div>
        <RightPanelSearch
          value={search}
          onChange={setSearch}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          disabled={empty}
        />
        <button
          type="button"
          disabled={empty}
          onClick={handleToggleForm}
          aria-expanded={addFormOpen}
          className={`mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-[4px] border font-[inherit] text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
            empty ? "cursor-not-allowed" : "cursor-pointer"
          } ${
            addFormOpen
              ? "border-[var(--aca-blue-primary)] bg-[var(--aca-blue-primary)] text-[var(--aca-white)]"
              : "border-[var(--aca-blue-200)] bg-[var(--aca-blue-100)] text-[var(--aca-blue-primary)]"
          }`}
        >
          <Plus
            className={`size-3.5 transition-transform ${
              addFormOpen ? "rotate-45" : "rotate-0"
            }`}
          />
          정산 대상 추가
        </button>

        {addFormOpen && !empty && (
          <div className="mt-2.5 flex flex-col gap-2 rounded-[6px] border border-[var(--aca-gray-100)] bg-[var(--aca-gray-10)] p-3">
            <div className="flex flex-col gap-1">
              <label
                className="text-[11px] font-semibold text-[var(--aca-gray-600)]"
                htmlFor="new-teacher-name"
              >
                정산 대상 이름 *
              </label>
              <input
                id="new-teacher-name"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) handleSubmit();
                  if (e.key === "Escape") handleCancel();
                }}
                placeholder="예: 김강사"
                autoFocus
                className="h-8 w-full rounded-[4px] border border-[var(--aca-gray-200)] bg-[var(--aca-white)] px-2.5 font-[inherit] text-[13px] text-[var(--aca-black)] shadow-[inset_0_0_0_1px_var(--aca-gray-200)] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                className="text-[11px] font-semibold text-[var(--aca-gray-600)]"
                htmlFor="new-teacher-subject"
              >
                과목 (선택)
              </label>
              <input
                id="new-teacher-subject"
                value={newTeacherSubject}
                onChange={(e) => setNewTeacherSubject(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) handleSubmit();
                  if (e.key === "Escape") handleCancel();
                }}
                placeholder="예: 수학"
                className="h-8 w-full rounded-[4px] border-none bg-[var(--aca-white)] px-2.5 font-[inherit] text-[13px] text-[var(--aca-black)] shadow-[inset_0_0_0_1px_var(--aca-gray-200)] outline-none"
              />
            </div>

            <div className="mt-1 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="h-7 cursor-pointer rounded-[4px] border border-[var(--aca-gray-200)] bg-[var(--aca-white)] px-3 text-[12px] font-semibold text-[var(--aca-gray-600)]"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="h-7 cursor-pointer rounded-[4px] border-none bg-[var(--aca-black)] px-3 text-[12px] font-semibold text-[var(--aca-white)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                완료
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      {empty ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center text-xs leading-[1.6] text-[var(--aca-gray-400)]">
            <div className="mb-1 text-[13px] font-semibold text-[var(--aca-gray-500)]">
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
            <div className="flex flex-col items-center justify-center gap-1 p-8 text-center text-xs text-[var(--aca-gray-400)]">
              <div className="text-[13px] font-semibold text-[var(--aca-gray-500)]">
                검색 결과가 없습니다
              </div>
              <div>다른 키워드로 시도해 보세요</div>
            </div>
          ) : (
            filtered.map((row) => (
              <InstructorRow
                key={row.id}
                name={row.name}
                subject={row.subject}
                amount={row.amount}
                dot="green"
                active={row.id === activeTeacherId}
                exportChecked={exportChecks.has(row.id)}
                onClick={() => setActiveTeacherId(row.id)}
                onToggleExport={() => toggleExportCheck(row.id)}
              />
            ))
          )}
        </div>
      )}

      <RightPanelFooter
        disabled={empty || !calculator}
        selectedExportCount={selectedExportCount}
        exporting={exporting}
        onExportAll={() => void runExport("all")}
        onExportPerFile={() => void runExport("per-file")}
        onExportPerSheet={() => void runExport("per-sheet")}
      />
    </aside>
  );
}
