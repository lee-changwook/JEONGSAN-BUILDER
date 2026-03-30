'use client';

import { type FormEvent, useEffect, useRef } from 'react';
import { useFileManager } from '@/features/paybuilder/use-file-manager';
import { useSettlement } from '@/features/paybuilder/use-settlement';
import { FlowProgress } from '@/components/paybuilder/FlowProgress';
import { UploadForm } from '@/components/paybuilder/UploadForm';
import { SettlementStats } from '@/components/paybuilder/SettlementStats';
import { CourseList } from '@/components/paybuilder/CourseList';
import { CourseDetail } from '@/components/paybuilder/CourseDetail';
import { StudentTable } from '@/components/paybuilder/StudentTable';

export function PaybuilderEditor() {
  const {
    selectedFiles,
    carryOverFile,
    acaInputRef,
    carryOverInputRef,
    addCourseInputRef,
    mergeFiles,
    removeAcaFile,
    handleAcaDrop,
    handleCarryOverDrop,
    setCarryOverFile,
  } = useFileManager();
  const resultSectionRef = useRef<HTMLDivElement | null>(null);
  const hadSettlementRef = useRef(false);
  const {
    settlement,
    selectedCourseId,
    selectedCourse,
    stats,
    year,
    month,
    feeRate,
    loading,
    exporting,
    error,
    setYear,
    setMonth,
    setSelectedCourseId,
    handleFeeRateChange,
    handleSubmit,
    appendCoursesFromFiles,
    addStudent,
    updateCourse,
    updateStudent,
    removeStudent,
    handleDownload,
  } = useSettlement(selectedFiles.length);

  useEffect(() => {
    if (settlement && !hadSettlementRef.current) {
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    hadSettlementRef.current = Boolean(settlement);
  }, [settlement]);

  return (
    <div className="grid grid-cols-[380px_minmax(0,1fr)] min-h-[calc(100vh-56px)]">
      <aside className="sticky top-14 h-[calc(100vh-56px)] overflow-y-auto border-r border-gray-200 bg-white p-6 flex flex-col gap-5 min-w-0">
        <FlowProgress
          stage={settlement ? 'parsed' : 'upload'}
          steps={[
            { label: '반별 엑셀 업로드', value: selectedFiles.length > 0 ? `${selectedFiles.length}개` : undefined },
            { label: '전월 미납 업로드', value: carryOverFile ? '포함' : undefined },
            { label: '강좌별매출 생성' },
          ]}
        />

        <UploadForm
          selectedFiles={selectedFiles}
          carryOverFile={carryOverFile}
          year={year}
          month={month}
          feeRate={feeRate}
          loading={loading}
          error={error}
          acaInputRef={acaInputRef}
          carryOverInputRef={carryOverInputRef}
          onAcaDrop={handleAcaDrop}
          onCarryOverDrop={handleCarryOverDrop}
          onRemoveAcaFile={removeAcaFile}
          onBrowseAca={mergeFiles}
          onCarryOverChange={setCarryOverFile}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onFeeRateChange={handleFeeRateChange}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void handleSubmit(selectedFiles, carryOverFile);
          }}
        />
      </aside>

      <div className="p-6 px-7 overflow-y-auto bg-[#f8f9fb]">
        {settlement ? (
          <div ref={resultSectionRef} className="grid gap-5">
            <div className="flex justify-between items-center gap-4 px-5 py-4 bg-gray-900 border border-[#333] rounded-[10px]">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="text-base font-bold text-white whitespace-nowrap shrink-0">
                  {settlement.year}년 {settlement.month}월 {settlement.campusName}
                </div>
                {stats ? <SettlementStats stats={stats} /> : null}
              </div>
              <div className="flex gap-2 shrink-0">
                <input
                  ref={addCourseInputRef}
                  className="hidden"
                  type="file"
                  accept=".xlsx"
                  multiple
                  disabled={loading || exporting}
                  onChange={(event) => {
                    const files = event.target.files ? Array.from(event.target.files) : [];
                    if (files.length > 0) {
                      void appendCoursesFromFiles(files, mergeFiles);
                    }
                    event.currentTarget.value = '';
                  }}
                />
                <button
                  className="rounded-md border border-white/20 bg-white/[0.08] text-white/80 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors duration-150 hover:bg-white/[0.15] disabled:opacity-40 disabled:cursor-default"
                  type="button"
                  disabled={loading || exporting}
                  onClick={() => addCourseInputRef.current?.click()}
                >
                  {loading ? '파싱 중...' : '강좌 추가'}
                </button>
                <button
                  className="rounded-md border border-transparent bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors duration-150 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-default"
                  type="button"
                  onClick={() => void handleDownload()}
                  disabled={exporting}
                >
                  {exporting ? '생성 중...' : 'xlsx 생성'}
                </button>
              </div>
            </div>

            <div className="grid gap-5 grid-cols-[240px_minmax(0,1fr)]">
              <CourseList
                courses={settlement.courses}
                selectedCourseId={selectedCourseId}
                onSelect={setSelectedCourseId}
              />

              {selectedCourse ? (
                <div className="grid gap-4 content-start">
                  <CourseDetail
                    course={selectedCourse}
                    onUpdate={(updater) => updateCourse(selectedCourse.id, updater)}
                  />
                  <StudentTable
                    course={selectedCourse}
                    feeRate={feeRate}
                    onUpdateStudent={(studentId, updater) =>
                      updateStudent(selectedCourse.id, studentId, updater)
                    }
                    onRemoveStudent={(studentId) => removeStudent(selectedCourse.id, studentId)}
                    onAddStudent={() => addStudent(selectedCourse.id)}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-gray-400 text-sm">
            <span>아직 빌드 결과가 없습니다</span>
          </div>
        )}
      </div>
    </div>
  );
}
