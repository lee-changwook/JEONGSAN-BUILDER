import { NextRequest, NextResponse } from "next/server";
import { buildExportWorkbook } from "@/jeongsan/features/exporter";
import type { TeacherSettlementMonth } from "@/jeongsan/features/types";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      settlement: TeacherSettlementMonth;
      mode: "teacher" | "all" | "selected";
      teacherId?: string;
      teacherIds?: string[];
    };

    const { workbook, fileName } = await buildExportWorkbook(
      payload.settlement,
      payload.mode,
      payload.teacherId,
      payload.teacherIds,
    );
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "엑셀 생성에 실패했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
