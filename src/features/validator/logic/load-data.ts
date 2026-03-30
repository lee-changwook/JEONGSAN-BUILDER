import { loadTikitaData } from '@/mocks/tikita-data';
import { parseAcaExcel } from '@/mocks/aca-data';
import type { CourseData, DataSource, StudentRow } from '@/features/validator/types';

export function loadCourseData(
  dataSource: DataSource,
  gangjwaIds: string[],
): {
  loadedData: CourseData[];
  acaSpreadsheetData: Record<string, StudentRow[]>;
} {
  if (dataSource === 'tikita') {
    return {
      loadedData: loadTikitaData(gangjwaIds),
      acaSpreadsheetData: {},
    };
  }

  const data = parseAcaExcel();
  const acaSpreadsheetData: Record<string, StudentRow[]> = {};
  data.forEach((cd) => {
    acaSpreadsheetData[cd.course.id] = cd.students.map((s) => ({ ...s }));
  });
  return { loadedData: data, acaSpreadsheetData };
}
