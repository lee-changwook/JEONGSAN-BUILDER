import type { Metadata } from "next";
import "./globals.css";
import localFont from 'next/font/local';

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
  preload: true,
});

export const metadata: Metadata = {
  title: "SETLLA | 티키타 정산 시스템",
  description: "시간이 오래 걸리던 정산 작업을 자동화하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pretendard.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
