import Link from 'next/link';

export default function WorkHistoryPage() {
  return (
    <div className="overflow-y-auto p-4">
      <div className="border-2 border-black p-4">
        <h1 className="text-lg font-bold">작업 내역 조회</h1>
        <div className="mt-4 flex gap-4">
          <Link href="/settla-lofi/work-history/class-logs" className="border-2 border-black p-2">
            수업 작업 이력 전체 조회
          </Link>
          <Link href="/settla-lofi/work-history/validators" className="border-2 border-black p-2">
            Validator 목록 조회
          </Link>
        </div>
      </div>
    </div>
  );
}
