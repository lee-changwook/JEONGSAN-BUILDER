import ExcelJS from 'exceljs';
import type { FindingStatus, CourseData } from '@/features/validator/types';
import type { ValidationFinding } from '@/aca/domain/sueop/validator';

async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const severityLabel: Record<string, string> = {
  error: '에러',
  warning: '경고',
  info: '정보',
};

const statusLabel: Record<string, string> = {
  pending: '미처리',
  resolved: '해결',
  'on-hold': '보류',
};

function serializeEvidence(evidence: Record<string, string | number>): string {
  return Object.entries(evidence)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

export async function exportValidationReport(
  findings: ValidationFinding[],
  findingStatuses: Record<string, FindingStatus>,
  loadedData: CourseData[],
  month: string,
  dataSource: string,
): Promise<string> {
  const wb = new ExcelJS.Workbook();

  const summaryWs = wb.addWorksheet('요약');
  [
    [`SETTLA 검증 리포트 — ${month}`],
    [`데이터 소스: ${dataSource === 'tikita' ? '티키타' : 'ACA2000'}`],
    [],
    ['구분', '건수'],
    ['에러', findings.filter((f) => f.severity === 'error').length],
    ['경고', findings.filter((f) => f.severity === 'warning').length],
    ['정보', findings.filter((f) => f.severity === 'info').length],
    ['합계', findings.length],
    [],
    ['처리 현황', ''],
    ['해결', Object.values(findingStatuses).filter((s) => s === 'resolved').length],
    ['보류', Object.values(findingStatuses).filter((s) => s === 'on-hold').length],
    ['미처리', Object.values(findingStatuses).filter((s) => s === 'pending').length],
    [],
    ['검사 강좌', loadedData.length],
    ['검사 학생', loadedData.reduce((sum, cd) => sum + cd.students.length, 0)],
  ].forEach((row) => summaryWs.addRow(row));

  const detailWs = wb.addWorksheet('상세 결과');
  detailWs.addRow(['번호', '심각도', '카테고리', '내용', '사유', '근거', '제안', '처리상태']);
  findings.forEach((f, i) => {
    detailWs.addRow([
      i + 1,
      severityLabel[f.severity] ?? f.severity,
      f.category,
      f.message,
      f.reason,
      serializeEvidence(f.evidence),
      f.suggestion,
      statusLabel[findingStatuses[f.id] ?? 'pending'] ?? '미처리',
    ]);
  });

  for (const cd of loadedData) {
    const sheetName = cd.course.name.slice(0, 31);
    const courseWs = wb.addWorksheet(sheetName);
    const dates = Object.keys(cd.students[0]?.attendance ?? {});

    courseWs.addRow([cd.course.name, `강사: ${cd.course.teacher}`, `수업: ${cd.course.dayOfWeek} ${cd.course.time}`]);
    courseWs.addRow([]);
    const extraColHeader = dataSource === 'tikita' ? '할인' : '미납액';
    courseWs.addRow(['번호', '이름', '학교', '상태', extraColHeader, '납입액', '계산액', ...dates]);

    cd.students.forEach((s, i) => {
      const attendanceValues = dates.map((d) => {
        const v = s.attendance[d];
        if (v === 'present') return 'O';
        if (v === 'absent') return 'X';
        if (v === 'late') return '△';
        if (v === 'bogang') return '보';
        if (v === 'dongYoung') return '동';
        if (v === 'hyuGang') return '휴';
        return '-';
      });
      const extraColValue = dataSource === 'tikita'
        ? (s.discount > 0 ? `${Math.round(s.discount * 100)}%` : '-')
        : (s.unpaidAmount > 0 ? s.unpaidAmount : 0);
      courseWs.addRow([
        i + 1,
        s.name,
        s.school,
        s.status,
        extraColValue,
        s.nabipAmount,
        s.computedAmount,
        ...attendanceValues,
      ]);
    });
  }

  const sourceName = dataSource === 'tikita' ? '티키타' : 'ACA2000';
  const filename = `SETTLA_검증리포트_${sourceName}_${month}.xlsx`;
  await downloadWorkbook(wb, filename);
  return filename;
}
