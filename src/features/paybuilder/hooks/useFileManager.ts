"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";

export function useFileManager() {
  const [acaFiles, setAcaFiles] = useState<FileList | null>(null);
  const [carryOverFile, setCarryOverFile] = useState<File | null>(null);
  const acaInputRef = useRef<HTMLInputElement | null>(null);
  const carryOverInputRef = useRef<HTMLInputElement | null>(null);
  const addCourseInputRef = useRef<HTMLInputElement | null>(null);

  const selectedFiles = useMemo(() => (acaFiles ? Array.from(acaFiles) : []), [acaFiles]);

  function mergeFiles(incoming: File[]) {
    const deduped = new Map<string, File>();
    for (const file of [...selectedFiles, ...incoming]) {
      deduped.set(`${file.name}-${file.size}-${file.lastModified}`, file);
    }
    const dataTransfer = new DataTransfer();
    deduped.forEach((file) => dataTransfer.items.add(file));
    setAcaFiles(dataTransfer.files);
  }

  function removeAcaFile(targetKey: string) {
    const dataTransfer = new DataTransfer();
    selectedFiles
      .filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== targetKey)
      .forEach((file) => dataTransfer.items.add(file));
    setAcaFiles(dataTransfer.files);
  }

  // The original checked `if (loading)` but that's redundant —
  // the drop zone disables pointer-events when loading, preventing this from firing.
  function handleAcaDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files).filter((f) => f.name.endsWith(".xlsx"));
    if (files.length > 0) {
      mergeFiles(files);
    }
  }

  function handleCarryOverDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files).find((candidate) => candidate.name.endsWith(".xlsx")) ?? null;
    setCarryOverFile(file);
  }

  return {
    selectedFiles,
    carryOverFile,
    acaInputRef,
    carryOverInputRef,
    addCourseInputRef,
    mergeFiles,
    removeAcaFile,
    handleAcaDrop,
    handleCarryOverDrop,
    setCarryOverFile
  };
}
