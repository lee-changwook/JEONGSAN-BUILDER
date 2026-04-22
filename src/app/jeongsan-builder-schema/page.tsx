import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parsePayDocumentWorkbook } from "./pay-document-parser";
import type { PayDocumentParseResult } from "./schema";
import SchemaConverter from "./schema-converter";

// 개발자 로컬에서만 존재하는 데모 파일. 빌드/배포 환경에서는 없으므로 graceful fallback.
const DEMO_FILE_PATH = "/Users/woogy/Downloads/강좌별매출_조직_2026-04.xlsx";

export default function JeongsanBuilderSchemaPage() {
  const schemaSource = readFileSync(
    join(process.cwd(), "src/app/jeongsan-builder-schema/schema.ts"),
    "utf8",
  );

  let initialParsed: PayDocumentParseResult | null = null;
  if (existsSync(DEMO_FILE_PATH)) {
    initialParsed = parsePayDocumentWorkbook(
      basename(DEMO_FILE_PATH),
      readFileSync(DEMO_FILE_PATH),
    );
  }

  return (
    <SchemaConverter
      initialParsed={initialParsed}
      schemaSource={schemaSource}
    />
  );
}
