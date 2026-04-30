import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "티키타 | 세틀라 홈페이지",
};

export default function Home() {
  return (
    <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-10 px-6 py-24 sm:items-start sm:px-16 sm:py-32">
      <div className="flex flex-col items-center gap-4 sm:items-start">
        <span className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
          SETTLA
        </span>
        <h1 className="text-balance text-center text-4xl font-bold leading-[1.15] tracking-tight sm:text-left sm:text-5xl">
          세틀라 홈페이지입니다.
        </h1>
        <p className="text-muted-foreground max-w-md text-center text-base leading-relaxed sm:text-left sm:text-lg">
          시간이 오래 걸리던 정산 작업을 자동화하세요.
        </p>
      </div>

      <Button
        size="lg"
        nativeButton={false}
        className="h-12 gap-2 px-6 text-base font-semibold [&_svg:not([class*='size-'])]:size-5"
        render={<Link href="/jeongsan-builder" />}
      >
        정산 빌더 시작하기
        <ArrowRight data-icon="inline-end" />
      </Button>
    </main>
  );
}
