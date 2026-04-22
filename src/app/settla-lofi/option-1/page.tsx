import Link from 'next/link';

export default function OptionOneHomePage() {
  return (
    <div className="p-4">
      <div className="border-2 border-black p-4">
        <h1 className="text-lg font-bold">1안 홈</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/settla-lofi/option-1/review" className="border-2 border-black px-3 py-2">
            수업 검증하기
          </Link>
          <Link href="/settla-lofi/option-1/browse" className="border-2 border-black px-3 py-2">
            PayBuilder
          </Link>
        </div>
      </div>
    </div>
  );
}
