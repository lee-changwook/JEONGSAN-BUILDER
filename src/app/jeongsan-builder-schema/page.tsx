import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parsePayDocumentWorkbook } from "./pay-document-parser";
import SchemaConverter from "./schema-converter";

export default function JeongsanBuilderSchemaPage() {
  const schemaSource = readFileSync(
    join(process.cwd(), "src/app/jeongsan-builder-schema/schema.ts"),
    "utf8",
  );
  const testFilePath = "/Users/cwstha04/Downloads/강좌별매출_조직_2026-04-2.xlsx";
  const initialParsed = parsePayDocumentWorkbook(
    basename(testFilePath),
    readFileSync(testFilePath),
  );

  return (
    <SchemaConverter
      initialParsed={initialParsed}
      schemaSource={schemaSource}
    />
  );
}
