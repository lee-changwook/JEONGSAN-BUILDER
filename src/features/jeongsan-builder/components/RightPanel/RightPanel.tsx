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
          className="mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-[4px] text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: addFormOpen
              ? "var(--aca-blue-primary)"
              : "var(--aca-blue-100)",
            color: addFormOpen ? "var(--aca-white)" : "var(--aca-blue-primary)",
            border: `1px solid ${addFormOpen ? "var(--aca-blue-primary)" : "var(--aca-blue-200)"}`,
            fontFamily: "inherit",
            cursor: empty ? "not-allowed" : "pointer",
          }}
        >
          <Plus
            className="size-3.5 transition-transform"
            style={{ transform: addFormOpen ? "rotate(45deg)" : "none" }}
          />
          정산 대상 추가
        </button>

        {addFormOpen && !empty && (
          <div
            className="mt-2.5 flex flex-col gap-2 rounded-[6px] p-3"
            style={{
              background: "var(--aca-gray-10)",
              border: "1px solid var(--aca-gray-100)",
            }}
          >
            <div className="flex flex-col gap-1">
              <label
                className="text-[11px] font-semibold"
                style={{ color: "var(--aca-gray-600)" }}
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
                className="h-8 w-full rounded-[4px] border-none bg-[var(--aca-white)] px-2.5 text-[13px] outline-none"
                style={{
                  fontFamily: "inherit",
                  color: "var(--aca-black)",
                  border: "1px solid var(--aca-gray-200)",
                  boxShadow: "inset 0 0 0 1px var(--aca-gray-200)",
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                className="text-[11px] font-semibold"
                style={{ color: "var(--aca-gray-600)" }}
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
                className="h-8 w-full rounded-[4px] border-none bg-[var(--aca-white)] px-2.5 text-[13px] outline-none"
                style={{
                  fontFamily: "inherit",
                  color: "var(--aca-black)",
                  boxShadow: "inset 0 0 0 1px var(--aca-gray-200)",
                }}
              />
            </div>

            <div className="mt-1 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="h-7 cursor-pointer rounded-[4px] px-3 text-[12px] font-semibold"
                style={{
                  background: "var(--aca-white)",
                  color: "var(--aca-gray-600)",
                  border: "1px solid var(--aca-gray-200)",
                }}
              >
                취소
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="h-7 cursor-pointer rounded-[4px] px-3 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "var(--aca-black)",
                  color: "var(--aca-white)",
                  border: "none",
                }}
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
        disabled={empty}
        selectedExportCount={selectedExportCount}
      />
    </aside>
  );
}
