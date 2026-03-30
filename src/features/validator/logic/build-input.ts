import type { SueopAggregateInput, HVectorCategory, KonCategory } from '@/aca/domain/sueop/validator';
import type { AttendanceStatus } from '@/features/validator/types';

export interface BuildInputParams {
  queryPeriodStart: string;
  queryPeriodEnd: string;
  courseName: string;
  sessionAmount: number;
  textbookAmount: number;
  hoechaSchedule: string[];
  students: {
    name: string;
    school: string;
    attendance: Record<string, AttendanceStatus>;
    nabipAmount: number;
    unpaidAmount: number;
    discountRate: number;
  }[];
}

function mapAttendance(status: AttendanceStatus): HVectorCategory | null {
  switch (status) {
    case 'present': return 'chulseok-site';
    case 'late': return 'jigak';
    case 'absent': return 'absent';
    case 'dongYoung': return 'chulseok-online';
    case 'bogang': return 'other-boonban';
    case 'hyuGang': return 'mihwagin';
    default: return null;
  }
}

export function buildSueopAggregateInput(params: BuildInputParams): SueopAggregateInput {
  const {
    queryPeriodStart,
    queryPeriodEnd,
    courseName,
    sessionAmount,
    textbookAmount,
    hoechaSchedule,
    students,
  } = params;

  const hoechaKonId = 'settla-kon-hoecha';
  const chugaKonId = 'settla-kon-chuga';
  const chugaBoonId = 'settla-boon-chuga';

  const boonMetas = hoechaSchedule.map((dateStr, i) => ({
    nanoId: `settla-boon-${i}`,
    name: dateStr,
    dateStr,
  }));

  const kons: Array<{
    nanoId: string;
    name: string;
    konCategory: KonCategory;
    gibonBoonAmount: number;
    gibonBoonNanoId: string;
  }> = [
    {
      nanoId: hoechaKonId,
      name: '회차',
      konCategory: 'hoecha',
      gibonBoonAmount: sessionAmount,
      gibonBoonNanoId: boonMetas[0]?.nanoId ?? '',
    },
  ];

  if (textbookAmount > 0) {
    kons.push({
      nanoId: chugaKonId,
      name: '교재비',
      konCategory: 'chuga-cheonggu',
      gibonBoonAmount: textbookAmount,
      gibonBoonNanoId: chugaBoonId,
    });
  }

  const sugangsaengs = students.map((student, si) => {
    const sgId = `settla-sg-${si}`;
    const totalAmount = student.nabipAmount + student.unpaidAmount;

    const harinAmount = student.discountRate > 0
      ? Math.round((totalAmount * student.discountRate) / (100 - student.discountRate))
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
        const localStatus = student.attendance[b.dateStr];
        if (!localStatus) return null;
        const cat = mapAttendance(localStatus);
        if (cat === null) return null;
        return {
          boonNanoId: b.nanoId,
          workNanoId: `settla-work-${si}-${bi}`,
          workBranchNanoId: `settla-wb-${si}-${bi}`,
          hVector: {
            hVectorNanoId: `settla-hv-${si}-${bi}`,
            hVectorHwaginCategory: cat,
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const connectedKons: Array<{
      category: KonCategory;
      nanoId: string;
      konName: string;
      gibonBoonNanoId: string;
    }> = [
      { category: 'hoecha', nanoId: hoechaKonId, konName: '회차', gibonBoonNanoId: boonMetas[0]?.nanoId ?? '' },
    ];
    if (textbookAmount > 0) {
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
          cheongguNanoId: `settla-cheonggu-${si}`,
          cheongguAt: null,
          bubunCheonggus: [
            {
              nanoId: `settla-bc-${si}`,
              isChwiso: false,
              name: `${student.name} 수업료`,
              bubunCheongguAmount: preDiscountAmount,
              harinAmount,
              actualAmount: totalAmount,
              displayAmount: preDiscountAmount,
              nabipAmount: student.nabipAmount,
              minapAmount: student.unpaidAmount,
              sunap: null,
            },
          ],
        },
      ],
    };
  });

  return {
    queryPeriod: {
      startAt: queryPeriodStart,
      endAt: queryPeriodEnd,
    },
    sugangsaengs,
    sueop: {
      nanoId: 'settla-sueop',
      name: courseName,
      amount: sessionAmount,
      kons,
      boons: [
        ...boonMetas.map((b) => ({ nanoId: b.nanoId, name: b.name, amount: sessionAmount })),
        ...(textbookAmount > 0
          ? [{ nanoId: chugaBoonId, name: '교재비', amount: textbookAmount }]
          : []),
      ],
    },
  };
}
