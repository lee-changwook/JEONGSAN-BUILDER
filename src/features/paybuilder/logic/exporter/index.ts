import path from "node:path";
import ExcelJS from "exceljs";
import { writeMetaSheet } from "../meta";
import { cloneWorksheetShell, loadTemplateWorkbook } from "../template";
import type { SettlementMonth } from '@/features/paybuilder/types';
import { fileNameLabel, monthLabel, sheetMonthLabel } from "../utils";
import { copyTemplateBlock } from "./cells";
import { buildLayoutPlan } from "./layout";
import { renderArrearsBlock, renderMixedRowGroup, renderRegularRowGroup } from "./renderers";
import { extractTemplateBlockLibrary, selectMixedBlock, selectRegularBlock } from "./template-library";

function buildSummaryLabel(settlement: SettlementMonth) {
  return `${settlement.month}월${settlement.campusName} 총매출\n(카드수수료제외)`;
}

function normalizeWorkbook(workbook: ExcelJS.Workbook, outputSheet: ExcelJS.Worksheet) {
  outputSheet.views = [
    {
      rightToLeft: false,
      state: "frozen",
      xSplit: 0,
      ySplit: 1,
      topLeftCell: "A2",
      showRuler: true,
      showRowColHeaders: true,
      showGridLines: true,
      zoomScale: 85,
      zoomScaleNormal: 85,
      activeCell: "A2"
    }
  ];
  outputSheet.autoFilter = `A3:AE${Math.max(3, outputSheet.rowCount)}`;

  workbook.views = [
    {
      x: 0,
      y: 0,
      width: 18000,
      height: 12000,
      visibility: "visible",
      activeTab: 0,
      firstSheet: 0
    }
  ];
  if (workbook.definedNames) {
    workbook.definedNames.model = [];
  }
}

export async function buildWorkbook(settlement: SettlementMonth) {
  const templatePath = path.join(process.cwd(), "public", "paybuilder-template.xlsx");
  const { sourceSheet } = await loadTemplateWorkbook(templatePath);
  const blockLibrary = extractTemplateBlockLibrary(sourceSheet);
  const { rowGroups } = buildLayoutPlan(settlement, blockLibrary);
  const workbook = new ExcelJS.Workbook();
  const targetName = sheetMonthLabel(settlement.year, settlement.month, settlement.campusName);
  const outputSheet = cloneWorksheetShell(sourceSheet, workbook, targetName);

  copyTemplateBlock(sourceSheet, outputSheet, 1, 1, 1);
  outputSheet.getCell("A1").value = `${monthLabel(settlement.year, settlement.month)} ${settlement.campusName} 강좌별 매출`;
  outputSheet.getCell("U1").value = buildSummaryLabel(settlement);

  const totalFormulaRefs: string[] = [];
  let cursor = 2;

  for (const group of rowGroups) {
    if (group.kind === "regular") {
      const rendered = renderRegularRowGroup(
        sourceSheet,
        outputSheet,
        settlement,
        group.teacherName,
        group.row,
        selectRegularBlock(blockLibrary, group.row.courses),
        cursor
      );
      totalFormulaRefs.push(...rendered.totalRefs);
      cursor = rendered.nextRow;
      continue;
    }

    if (group.kind === "mixed") {
      const mixedBlock = selectMixedBlock(blockLibrary, group.row, group.block);
      if (mixedBlock) {
        const rendered = renderMixedRowGroup(
          sourceSheet,
          outputSheet,
          settlement,
          group.teacherName,
          group.row,
          group.block,
          mixedBlock,
          cursor
        );
        totalFormulaRefs.push(...rendered.totalRefs);
        cursor = rendered.nextRow;
        continue;
      }

      const regularRendered = renderRegularRowGroup(
        sourceSheet,
        outputSheet,
        settlement,
        group.teacherName,
        group.row,
        selectRegularBlock(blockLibrary, group.row.courses),
        cursor
      );
      totalFormulaRefs.push(...regularRendered.totalRefs);
      cursor = regularRendered.nextRow;
    }

    const arrearsRendered = renderArrearsBlock(
      sourceSheet,
      outputSheet,
      settlement,
      group.block,
      blockLibrary.arrearsBlock,
      cursor
    );
    totalFormulaRefs.push(...arrearsRendered.totalRefs);
    cursor = arrearsRendered.nextRow;
  }

  const totalNetPay = settlement.courses.reduce(
    (sum, course) => sum + course.students.reduce((courseSum, student) => courseSum + student.payAmount, 0),
    0
  );
  const totalValue = totalFormulaRefs.length > 0 ? { formula: totalFormulaRefs.join("+"), result: totalNetPay } : totalNetPay;
  outputSheet.getCell("X1").value = totalValue;
  outputSheet.getCell("Y1").value = totalValue;

  for (let row = cursor; row < cursor + 8; row += 1) {
    outputSheet.getRow(row);
  }

  normalizeWorkbook(workbook, outputSheet);
  await writeMetaSheet(workbook, settlement);

  return {
    workbook,
    fileName: fileNameLabel(settlement.year, settlement.month, settlement.campusName)
  };
}
