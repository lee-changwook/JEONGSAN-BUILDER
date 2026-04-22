import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { buildTeacherSettlementMonth } from "@/jeongsan/features/build-teacher-settlement";
import { parsePayDocuments } from "@/jeongsan/features/pay-document-parser";
import { readPreviousPayoutWorkbook } from "@/jeongsan/features/previous-payout-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));
    const payDocuments = formData
      .getAll("payDocuments")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const previousPayout = formData.get("previousPayout");

    if (!year || !month || payDocuments.length === 0) {
      return NextResponse.json({ message: "대상 연월과 페이문서를 입력해 주세요." }, { status: 400 });
    }

    const sources = await Promise.all(
      payDocuments.map(async (file) => ({
        name: file.name,
        buffer: Buffer.from(await file.arrayBuffer()) as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0],
      })),
    );

    const parsedDocuments = await parsePayDocuments({
      year,
      month,
      files: sources,
    });

    const previous =
      previousPayout instanceof File && previousPayout.size > 0
        ? await readPreviousPayoutWorkbook(
            Buffer.from(await previousPayout.arrayBuffer()) as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0],
          )
        : null;

    const settlement = buildTeacherSettlementMonth({
      year,
      month,
      documents: parsedDocuments.documents,
      warnings: parsedDocuments.warnings,
      previous,
      previousFileName: previousPayout instanceof File ? previousPayout.name : null,
      hasPreviousPayoutFile: Boolean(previous && previous.rows.length > 0),
    });

    return NextResponse.json({
      settlement,
      warnings: settlement.warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "정산 데이터 생성에 실패했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
