import * as XLSX from 'xlsx';
import {
  SueopAggregateInputSchema,
  type SueopAggregateInput,
  type HVectorCategory,
  type KonCategory,
} from '../sueop-aggregate/sueop-aggregate.validator-strategy.type';

// ─── User-Provided Config (fields ACA2000 CSV cannot provide) ───────────────

export type StudentHarinConfig = {
  studentName: string; // 학생 이름 (CSV에서 파싱된 이름과 매칭)
  harinPercentage: number; // 할인율 (e.g. 10 → 10% 할인)
};

export type Aca2000UserConfig = {
  sessionAmount: number; // 회차당 수강료
  textbookAmount?: number; // 교재비 (추가청구), 0 or undefined if none
  studentHarins?: StudentHarinConfig[]; // 학생별 할인율. 이름으로 매칭.
};

// ─── Parsed Row (intermediate) ──────────────────────────────────────────────

type ParsedStudentRow = {
  name: string;
  school: string;
  parentPhone: string;
  paymentMethod: string;
  nabipAmount: number;
  minapAmount: number;
  attendance: (HVectorCategory | null)[]; // one per date column, null = no data (future/empty)
};

type ParsedSheet = {
  courseName: string;
  year: number;
  month: number;
  dateColumns: { day: number; dayOfWeek: string; hoechaNumber: number }[];
  students: ParsedStudentRow[];
};

// ─── ACA2000 Attendance Mapping ─────────────────────────────────────────────

function mapAttendanceCode(code: string | null | undefined): HVectorCategory | null {
  if (!code || code.trim() === '') return null;
  const trimmed = code.trim();
  if (trimmed === '출') return 'chulseok-site';
  if (trimmed === '지') return 'jigak';
  if (trimmed === '결') return 'absent';
  if (trimmed === '동영') return 'chulseok-online';
  if (trimmed === '타') return 'other-boonban';
  if (trimmed === '미') return 'mihwagin';
  return null;
}

// ─── Amount Parsing ─────────────────────────────────────────────────────────

function parseAmountString(raw: string): { nabip: number; minap: number } {
  const cleaned = raw.replace(/"/g, '').trim();
  const parts = cleaned.split('/').map((s) => s.trim());
  if (parts.length !== 2) return { nabip: 0, minap: 0 };

  const nabip = parseInt(parts[0].replace(/,/g, ''), 10) || 0;
  const minap = parseInt(parts[1].replace(/,/g, ''), 10) || 0;
  return { nabip, minap };
}

// ─── Sheet Parser ───────────────────────────────────────────────────────────

function parseSheet(rows: string[][]): ParsedSheet {
  const courseName = (rows[0]?.[0] ?? '').trim();

  const monthHeader = (rows[4] ?? []).find((c) => c && c.includes('월'));
  const monthMatch = monthHeader?.match(/(\d+)월/);
  const month = monthMatch ? parseInt(monthMatch[1], 10) : 1;

  const downloadRow = rows[2]?.[0] ?? '';
  const yearMatch = downloadRow.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  const headerRow = rows[5] ?? [];
  const hoechaRow = rows[6] ?? [];

  const dateColumns: ParsedSheet['dateColumns'] = [];
  for (let i = 8; i < headerRow.length; i++) {
    const header = (headerRow[i] ?? '').trim();
    if (!header) continue;
    const match = header.match(/(\d+)\s+(\S+)/);
    if (match) {
      const hoechaStr = (hoechaRow[i] ?? '').trim();
      dateColumns.push({
        day: parseInt(match[1], 10),
        dayOfWeek: match[2],
        hoechaNumber: parseInt(hoechaStr, 10) || 0,
      });
    }
  }

  const students: ParsedStudentRow[] = [];
  for (let r = 7; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 8) continue;
    const name = (row[2] ?? '').trim();
    if (!name) continue;

    const amountStr = (row[7] ?? '').replace(/"/g, '');
    const { nabip, minap } = parseAmountString(amountStr);

    const attendance: (HVectorCategory | null)[] = [];
    for (let i = 0; i < dateColumns.length; i++) {
      attendance.push(mapAttendanceCode(row[8 + i]));
    }

    students.push({
      name,
      school: (row[3] ?? '').trim(),
      parentPhone: (row[5] ?? '').trim(),
      paymentMethod: (row[6] ?? '').replace(/"/g, '').trim(),
      nabipAmount: nabip,
      minapAmount: minap,
      attendance,
    });
  }

  return { courseName, year, month, dateColumns, students };
}

// ─── Convert to raw input (before Zod defaults) ────────────────────────────

function buildRawInput(parsed: ParsedSheet, config: Aca2000UserConfig): unknown {
  const hoechaKonId = 'aca-compat-kon-hoecha';
  const chugaKonId = 'aca-compat-kon-chuga';
  const chugaBoonId = 'aca-compat-boon-chuga';

  const boonMetas = parsed.dateColumns.map((col, i) => {
    const dateStr = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(col.day).padStart(2, '0')}`;
    return {
      nanoId: `aca-compat-boon-${i}`,
      name: `${col.day} ${col.dayOfWeek}`,
      amount: config.sessionAmount,
      dateStr,
    };
  });

  const kons: { nanoId: string; name: string; konCategory: KonCategory; gibonBoonAmount: number; gibonBoonNanoId: string }[] = [
    {
      nanoId: hoechaKonId,
      name: '회차',
      konCategory: 'hoecha',
      gibonBoonAmount: config.sessionAmount,
      gibonBoonNanoId: boonMetas[0]?.nanoId ?? '',
    },
  ];
  if (config.textbookAmount && config.textbookAmount > 0) {
    kons.push({
      nanoId: chugaKonId,
      name: '교재비',
      konCategory: 'chuga-cheonggu',
      gibonBoonAmount: config.textbookAmount,
      gibonBoonNanoId: chugaBoonId,
    });
  }

  const harinMap = new Map<string, number>();
  for (const sh of config.studentHarins ?? []) {
    harinMap.set(sh.studentName, sh.harinPercentage);
  }

  const sugangsaengs = parsed.students.map((student, si) => {
    const sgId = `aca-compat-sg-${si}`;
    const totalAmount = student.nabipAmount + student.minapAmount;

    // Per-student harin: lookup by name, or 0 if not configured.
    // hasHarinMarker from CSV can flag students for the UI even without a configured rate.
    const studentHarinRate = harinMap.get(student.name) ?? 0;
    const harinAmount = studentHarinRate > 0
      ? Math.round((totalAmount * studentHarinRate) / (100 - studentHarinRate))
      : 0;
    const preDiscountAmount = totalAmount + harinAmount;

    const connectedBoons = boonMetas.map((b) => ({
      boonNanoId: b.nanoId,
      konNanoId: hoechaKonId,
      boonName: b.name,
      boonIljeong: { startAt: b.dateStr, endAt: b.dateStr },
    }));

    const connectedChulseokWorkBranches = boonMetas
      .map((b, bi) => {
        const cat = student.attendance[bi];
        if (cat === null) return null;
        return {
          boonNanoId: b.nanoId,
          workNanoId: `aca-compat-work-${si}-${bi}`,
          workBranchNanoId: `aca-compat-wb-${si}-${bi}`,
          hVector: {
            hVectorNanoId: `aca-compat-hv-${si}-${bi}`,
            hVectorHwaginCategory: cat,
          },
        };
      })
      .filter(Boolean);

    const connectedKons: { category: KonCategory; nanoId: string; konName: string; gibonBoonNanoId: string }[] = [
      { category: 'hoecha', nanoId: hoechaKonId, konName: '회차', gibonBoonNanoId: boonMetas[0]?.nanoId ?? '' },
    ];
    if (config.textbookAmount && config.textbookAmount > 0) {
      connectedKons.push({ category: 'chuga-cheonggu', nanoId: chugaKonId, konName: '교재비', gibonBoonNanoId: chugaBoonId });
    }

    return {
      nanoId: sgId,
      name: student.name,
      connectedKons,
      connectedBoons,
      connectedChulseokWorkBranches,
      connectedSueomnyos: [
        {
          boonNanoId: null,
          cheongguName: `${student.name} 수업료`,
          cheongguTotalAmount: preDiscountAmount,
          cheongguTotalHarinAmount: harinAmount,
          cheongguTotalActualAmount: totalAmount,
          cheongguDisplayAmount: preDiscountAmount,
          cheongguNanoId: `aca-compat-cheonggu-${si}`,
          cheongguAt: null,
          bubunCheonggus: [
            {
              nanoId: `aca-compat-bc-${si}`,
              isChwiso: false,
              name: `${student.name} 수업료`,
              bubunCheongguAmount: preDiscountAmount,
              harinAmount,
              actualAmount: totalAmount,
              displayAmount: preDiscountAmount,
              nabipAmount: student.nabipAmount,
              minapAmount: student.minapAmount,
              sunap: null,
            },
          ],
        },
      ],
    };
  });

  const lastDay = new Date(parsed.year, parsed.month, 0).getDate();

  return {
    queryPeriod: {
      startAt: `${parsed.year}-${String(parsed.month).padStart(2, '0')}-01`,
      endAt: `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${lastDay}`,
    },
    sugangsaengs,
    sueop: {
      nanoId: 'aca-compat-sueop',
      name: parsed.courseName,
      amount: config.sessionAmount,
      kons,
      boons: [
        ...boonMetas.map((b) => ({ nanoId: b.nanoId, name: b.name, amount: config.sessionAmount })),
        ...(config.textbookAmount && config.textbookAmount > 0
          ? [{ nanoId: chugaBoonId, name: '교재비', amount: config.textbookAmount }]
          : []),
      ],
    },
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function parseAca2000Xlsx(
  fileBuffer: ArrayBuffer,
  config: Aca2000UserConfig,
): SueopAggregateInput {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  const parsed = parseSheet(rows);
  const raw = buildRawInput(parsed, config);
  return SueopAggregateInputSchema.parse(raw);
}

export function parseAca2000Csv(
  csvString: string,
  config: Aca2000UserConfig,
): SueopAggregateInput {
  const rows = csvString.split('\n').map((line) =>
    line.split(',').map((cell) => cell.trim()),
  );
  const parsed = parseSheet(rows);
  const raw = buildRawInput(parsed, config);
  return SueopAggregateInputSchema.parse(raw);
}

export { type ParsedSheet, type ParsedStudentRow };
