import type { CourseData, AttendanceStatus } from '@/features/validator/types';
import type { CellHighlight, AnalysisRow, CourseReport } from '@/features/validator/types';

const BILLABLE_STATUSES: AttendanceStatus[] = ['present', 'late', 'dongYoung', 'bogang'];

function isBillable(status: AttendanceStatus): boolean {
  return BILLABLE_STATUSES.includes(status);
}

function computeRow(
  student: { name: string; school: string; attendance: Record<string, AttendanceStatus>; discount: number; unpaidAmount: number; status: 'active' | 'jeonban' | 'toewon'; nabipAmount: number },
  dates: string[],
  unitPrice: number,
  totalHoesu: number,
  gyojaeBi: number,
): AnalysisRow {
  const attendanceCells: AnalysisRow['attendanceCells'] = {};
  let billableCount = 0;

  for (const date of dates) {
    const value = student.attendance[date];
    if (value && isBillable(value)) billableCount++;
    attendanceCells[date] = { value: value ?? 'absent', highlight: null };
  }

  const gyesanAmount = Math.round((unitPrice * totalHoesu + gyojaeBi) * (1 - student.discount));
  const chayi = student.nabipAmount - gyesanAmount;

  let chayiHighlight: CellHighlight | null = null;
  if (chayi !== 0) {
    chayiHighlight = {
      severity: 'error',
      message: `납입액과 계산 금액 차이: ${chayi.toLocaleString()}원`,
    };
  }

  let unpaidHighlight: CellHighlight | null = null;
  if (student.unpaidAmount > 0) {
    unpaidHighlight = {
      severity: 'warning',
      message: `미납액: ${student.unpaidAmount.toLocaleString()}원`,
    };
  }

  return {
    studentName: student.name,
    school: student.school,
    status: student.status,
    attendanceCells,
    billableCount,
    discount: student.discount,
    unpaidAmount: student.unpaidAmount,
    gyesanAmount,
    nabipAmount: student.nabipAmount,
    chayi,
    unpaidHighlight,
    chayiHighlight,
    statusHighlight: null,
  };
}

function generateFindings(
  rows: AnalysisRow[],
  courseId: string,
  unitPrice: number,
  totalHoesu: number,
  gyojaeBi: number,
): CourseReport['findings'] {
  const findings: CourseReport['findings'] = [];
  let seq = 1;

  function addFinding(
    severity: CourseReport['findings'][number]['severity'],
    category: CourseReport['findings'][number]['category'],
    studentName: string,
    message: string,
    evidence: string,
    suggestion: string,
  ) {
    findings.push({
      id: `${courseId}-f-${String(seq++).padStart(3, '0')}`,
      severity,
      category,
      studentName,
      message,
      evidence,
      suggestion,
    });
  }

  for (const row of rows) {
    if (row.chayi !== 0) {
      const isGyojaebiIncluded = gyojaeBi > 0 && Math.abs(row.chayi) === gyojaeBi;
      if (isGyojaebiIncluded) {
        addFinding(
          'warning',
          'amount',
          row.studentName,
          '교재비가 포함되어 납입된 것으로 보입니다',
          `차이(${row.chayi.toLocaleString()}원)가 교재비(${gyojaeBi.toLocaleString()}원)와 일치`,
          '교재비 별도 청구 여부를 확인하세요',
        );
      } else {
        addFinding(
          'error',
          'amount',
          row.studentName,
          '청구 금액과 계산 금액 불일치',
          `계산: ${row.gyesanAmount.toLocaleString()}원 / 납입: ${row.nabipAmount.toLocaleString()}원 (차이: ${row.chayi.toLocaleString()}원)`,
          '회차별 일정, 회차별 수업료, 할인 여부를 재확인하세요',
        );
      }
    }

    const attendanceRate = totalHoesu > 0 ? row.billableCount / totalHoesu : 1;
    if (row.status === 'active' && attendanceRate < 0.5 && totalHoesu >= 4) {
      addFinding(
        'warning',
        'chulgyeol',
        row.studentName,
        `출석률 저조: ${(attendanceRate * 100).toFixed(0)}%`,
        `총 ${totalHoesu}회 중 ${row.billableCount}회 출석`,
        '학생 상담 및 환불 검토가 필요합니다',
      );
    }

    if (row.discount > 0 && row.chayi > 0 && Math.abs(row.chayi) >= (unitPrice * totalHoesu + gyojaeBi) * row.discount * 0.8) {
      addFinding(
        'error',
        'amount',
        row.studentName,
        '할인 적용이 납입액에 반영되지 않은 것으로 보입니다',
        `할인율: ${(row.discount * 100).toFixed(0)}% / 차이: ${row.chayi.toLocaleString()}원`,
        '할인율 적용 여부를 재확인하세요',
      );
    }

    if (row.unpaidAmount > 0) {
      addFinding(
        'warning',
        'sunap',
        row.studentName,
        `미납액 ${row.unpaidAmount.toLocaleString()}원이 존재합니다`,
        `납입: ${row.nabipAmount.toLocaleString()}원 / 미납: ${row.unpaidAmount.toLocaleString()}원`,
        '미납 사유를 확인하고 수납 처리하세요',
      );
    }

    if (row.status === 'jeonban') {
      addFinding(
        'info',
        'student-status',
        row.studentName,
        '전반 예정/완료 학생입니다',
        `현재 상태: 전반 / 납입액: ${row.nabipAmount.toLocaleString()}원`,
        '전반 후 강좌 변경 사항을 확인하세요',
      );
    }
  }

  const activeRows = rows.filter((r) => r.status === 'active');
  if (activeRows.length >= 3) {
    const amounts = activeRows.map((r) => r.nabipAmount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length;
    const stddev = Math.sqrt(variance);

    if (stddev > 0) {
      for (const row of activeRows) {
        const zScore = Math.abs(row.nabipAmount - mean) / stddev;
        if (zScore > 1.5) {
          addFinding(
            'warning',
            'sunap',
            row.studentName,
            '납입액이 다른 학생 대비 이상치입니다',
            `납입: ${row.nabipAmount.toLocaleString()}원 / 평균: ${Math.round(mean).toLocaleString()}원 (z=${zScore.toFixed(1)})`,
            '납입 금액을 재확인하세요',
          );
        }
      }
    }
  }

  return findings;
}

export function computeCourseReport(courseData: CourseData, dates: string[]): CourseReport {
  const { course, students, rule } = courseData;

  const rows = students.map((s) => computeRow(s, dates, rule.unitPrice, rule.totalHoesu, rule.gyojaeBi));

  const findings = generateFindings(rows, course.id, rule.unitPrice, rule.totalHoesu, rule.gyojaeBi);

  const activeRows = rows.filter((r) => r.status === 'active');
  const summary: CourseReport['summary'] = {
    totalStudents: rows.length,
    activeStudents: activeRows.length,
    totalGyesan: rows.reduce((a, r) => a + r.gyesanAmount, 0),
    totalNabip: rows.reduce((a, r) => a + r.nabipAmount, 0),
    totalChayi: rows.reduce((a, r) => a + r.chayi, 0),
    errorCount: findings.filter((f) => f.severity === 'error').length,
    warningCount: findings.filter((f) => f.severity === 'warning').length,
    infoCount: findings.filter((f) => f.severity === 'info').length,
  };

  return {
    courseId: course.id,
    courseName: course.name,
    rows,
    summary,
    findings,
  };
}
