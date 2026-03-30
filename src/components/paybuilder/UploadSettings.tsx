'use client';

type Props = {
  year: number;
  month: number;
  feeRate: number;
  loading: boolean;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onFeeRateChange: (rate: number) => void;
};

export function UploadSettings({
  year,
  month,
  feeRate,
  loading,
  onYearChange,
  onMonthChange,
  onFeeRateChange,
}: Props) {
  return (
    <div className="grid gap-2 grid-cols-3">
      <label>
        <div className="font-semibold text-xs text-gray-500">대상 연도</div>
        <input
          className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-[7px] text-[13px] transition-colors duration-150 focus:outline-none focus:border-blue-600"
          type="number"
          value={year}
          disabled={loading}
          onChange={(event) => onYearChange(Number(event.target.value))}
        />
      </label>
      <label>
        <div className="font-semibold text-xs text-gray-500">대상 월</div>
        <input
          className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-[7px] text-[13px] transition-colors duration-150 focus:outline-none focus:border-blue-600"
          type="number"
          min={1}
          max={12}
          value={month}
          disabled={loading}
          onChange={(event) => onMonthChange(Number(event.target.value))}
        />
      </label>
      <label>
        <div className="font-semibold text-xs text-gray-500">카드 수수료율</div>
        <input
          className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-[7px] text-[13px] transition-colors duration-150 focus:outline-none focus:border-blue-600"
          type="number"
          step="0.001"
          value={feeRate}
          disabled={loading}
          onChange={(event) => onFeeRateChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
