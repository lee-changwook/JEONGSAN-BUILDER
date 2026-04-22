"use client";

import { useMemo, useState } from "react";
import { parsePayDocumentWorkbook } from "./pay-document-parser";
import type { PayDocumentParseResult } from "./schema";

export default function SchemaConverter({
  initialParsed,
  schemaSource,
}: {
  initialParsed: PayDocumentParseResult | null;
  schemaSource: string;
}) {
  const [parsed, setParsed] = useState<PayDocumentParseResult | null>(initialParsed);
  const [fileName, setFileName] = useState<string | null>(initialParsed?.sourceFileName ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const parsedJson = useMemo(() => JSON.stringify(parsed, null, 2), [parsed]);

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    setFileName(file.name);
    setIsParsing(true);
    setError(null);
    try {
      setParsed(parsePayDocumentWorkbook(file.name, await file.arrayBuffer()));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "엑셀 변환에 실패했습니다.");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <main className="min-h-screen bg-white p-6 text-neutral-950">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold">정산빌더 도메인 스키마</h1>
        <p className="mt-2 text-sm text-neutral-600">
          첨부 엑셀을 실제로 파싱한 결과와, 그 결과가 따라야 하는 schema.ts를 같이 봅니다.
        </p>

        <section className="mt-6 border border-neutral-300 p-4">
          <h2 className="text-base font-semibold">엑셀 넣으면 JSON 변환</h2>
          <label className="mt-3 flex cursor-pointer items-center border border-neutral-300 text-sm">
            <span className="shrink-0 border-r border-neutral-300 bg-neutral-100 px-3 py-2 text-neutral-700">
              파일 선택
            </span>
            <span className="px-3 py-2 text-neutral-500">
              {fileName ?? "선택된 파일 없음"}
            </span>
            <input
              className="sr-only"
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {isParsing && <p className="mt-3 text-sm text-neutral-600">변환 중...</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>

        <section className="mt-6">
          <h2 className="text-base font-semibold">변환 JSON</h2>
          <pre className="mt-3 max-h-[560px] overflow-auto border border-neutral-300 bg-neutral-50 p-4 text-xs leading-5">
            <code>{parsed ? parsedJson : "아직 업로드된 엑셀이 없습니다."}</code>
          </pre>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-semibold">실제 schema.ts</h2>
          <pre className="mt-3 max-h-[560px] overflow-auto border border-neutral-300 bg-neutral-50 p-4 text-xs leading-5">
            <code>{schemaSource}</code>
          </pre>
        </section>
      </div>
    </main>
  );
}
