export function formatKRW(value: number): string {
  if (value === 0) return "₩ 0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value).toLocaleString("ko-KR");
  return `${sign}₩ ${abs}`;
}
