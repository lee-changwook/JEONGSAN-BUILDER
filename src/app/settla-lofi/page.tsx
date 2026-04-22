import Link from 'next/link';

export default function SettlaLofiHomePage() {
  return (
    <div className="p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border-2 border-black p-4">
          <h1 className="text-lg font-bold">1안. 액션별 분리형</h1>
          <p className="mt-2 text-sm text-gray-600">
            월별 데이터 조회, 당월 정산을 액션별로 나눈 안.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/settla-lofi/option-1" className="border-2 border-black px-3 py-2">
              1안 보기
            </Link>
          </div>
        </div>

        <div className="border-2 border-black p-4">
          <h2 className="text-lg font-bold">2안. 통합형</h2>
          <p className="mt-2 text-sm text-gray-600">
            월별 데이터 조회와 당월 정산을 한 흐름으로 묶은 안.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/settla-lofi/option-2" className="border-2 border-black bg-white px-3 py-2">
              2안 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
