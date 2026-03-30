import type { SettlementMonth } from '@/features/paybuilder/types';
import type {
  LayoutArrearsBlock,
  LayoutRowGroup,
  LayoutTeacherGroup,
  RenderCourse,
  TemplateBlockLibrary
} from './types';

function partitionCourses(courses: SettlementMonth["courses"]) {
  return courses.map((course) => {
    const regularStudents = course.students.filter((student) => !student.isCarryOver);
    const carryStudents = course.students.filter((student) => student.isCarryOver);
    return {
      course,
      regularCourse: regularStudents.length > 0 ? { ...course, students: regularStudents } : null,
      carryCourse: carryStudents.length > 0 ? { ...course, students: carryStudents } : null
    };
  });
}

export function buildLayoutPlan(
  settlement: SettlementMonth,
  library: TemplateBlockLibrary
): { teacherGroups: LayoutTeacherGroup[]; rowGroups: LayoutRowGroup[] } {
  const teacherGroupsByName = new Map<string, LayoutTeacherGroup>();

  for (const entry of partitionCourses(settlement.courses)) {
    const teacherName = entry.course.teacherName || "강사 미정";
    if (!teacherGroupsByName.has(teacherName)) {
      teacherGroupsByName.set(teacherName, {
        teacherName,
        regularRows: [],
        arrearsBlock: null
      });
    }

    const group = teacherGroupsByName.get(teacherName);
    if (!group) {
      continue;
    }

    if (entry.regularCourse) {
      const currentRow = group.regularRows[group.regularRows.length - 1];
      if (!currentRow || currentRow.courses.length >= 4) {
        group.regularRows.push({ courses: [entry.regularCourse as RenderCourse] });
      } else {
        currentRow.courses.push(entry.regularCourse as RenderCourse);
      }
    }

    if (entry.carryCourse) {
      if (!group.arrearsBlock) {
        group.arrearsBlock = {
          teacherName,
          courses: []
        };
      }
      group.arrearsBlock.courses.push(entry.carryCourse as RenderCourse);
    }
  }

  const teacherGroups = Array.from(teacherGroupsByName.values()).filter((group) => group.regularRows.length > 0 || group.arrearsBlock);
  const rowGroups: LayoutRowGroup[] = [];
  const mixedRegularSlots = new Set(library.mixedBlocks.map((block) => block.regularSlots));

  for (const teacherGroup of teacherGroups) {
    const lastRegularRow = teacherGroup.regularRows[teacherGroup.regularRows.length - 1] ?? null;
    const shouldInlineArrears =
      teacherGroup.arrearsBlock !== null &&
      lastRegularRow !== null &&
      mixedRegularSlots.has(lastRegularRow.courses.length);

    const regularRows = shouldInlineArrears ? teacherGroup.regularRows.slice(0, -1) : teacherGroup.regularRows;
    for (const row of regularRows) {
      rowGroups.push({
        kind: "regular",
        teacherName: teacherGroup.teacherName,
        row
      });
    }

    if (shouldInlineArrears && lastRegularRow && teacherGroup.arrearsBlock) {
      rowGroups.push({
        kind: "mixed",
        teacherName: teacherGroup.teacherName,
        row: lastRegularRow,
        block: teacherGroup.arrearsBlock as LayoutArrearsBlock
      });
      continue;
    }

    if (teacherGroup.arrearsBlock) {
      rowGroups.push({
        kind: "arrears",
        teacherName: teacherGroup.teacherName,
        block: teacherGroup.arrearsBlock
      });
    }
  }

  return { teacherGroups, rowGroups };
}
