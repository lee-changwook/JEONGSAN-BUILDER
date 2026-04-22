import Link from 'next/link';

export default function OptionTwoHomePage() {
  return (
    <div className="p-4">
      <div className="border-2 border-black p-4">
        <h1 className="text-lg font-bold">2안 홈</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/settla-lofi/option-2/review" className="border-2 border-black px-3 py-2">
            수업 검증하기
          </Link>
          <Link href="/settla-lofi/option-2/browse" className="border-2 border-black px-3 py-2">
            월별 데이터 조회
          </Link>
          <Link href="/settla-lofi/option-2/monthly-settle" className="border-2 border-black px-3 py-2">
            당월정산
          </Link>
        </div>
      </div>
    </div>
  );
}
