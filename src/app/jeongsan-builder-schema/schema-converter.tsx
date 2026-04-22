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
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const parsedJson = useMemo(() => JSON.stringify(parsed, null, 2), [parsed]);

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

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
          <input
            className="mt-3 block w-full border border-neutral-300 p-2 text-sm"
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />
          {initialParsed && (
            <p className="mt-3 text-sm text-neutral-600">
              기본 표시: {initialParsed.sourceFileName}
            </p>
          )}
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
