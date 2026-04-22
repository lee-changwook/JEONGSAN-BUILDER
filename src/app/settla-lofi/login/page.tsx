export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col px-4 pt-4">
      <header className="pb-8">
        <h1 className="text-xl font-bold">
          기관에
          <br />
          로그인 합니다
        </h1>
      </header>
      <form className="flex flex-col gap-4">
        <div className="border-2 border-black p-3">
          <label className="text-sm font-bold">기관 코드</label>
          <div className="mt-1 border-b-2 border-black pb-1">input</div>
        </div>
        <div className="border-2 border-black p-3">
          <label className="text-sm font-bold">아이디</label>
          <div className="mt-1 border-b-2 border-black pb-1">input</div>
        </div>
        <div className="border-2 border-black p-3">
          <label className="text-sm font-bold">비밀번호</label>
          <div className="mt-1 border-b-2 border-black pb-1">input</div>
        </div>
        <div className="flex flex-col items-center gap-4 pt-2">
          <button className="w-full border-2 border-black p-3 font-bold">로그인</button>
          <button className="text-sm text-gray-500">다른 기관 선택하기</button>
        </div>
      </form>
    </div>
  );
}
