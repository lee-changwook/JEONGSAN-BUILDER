'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: '홈', href: '/settla-lofi/option-1' },
  { label: '수업 검증하기', href: '/settla-lofi/option-1/review' },
  { label: 'PayBuilder', href: '/settla-lofi/option-1/browse' },
] as const;

export default function OptionOneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b-2 border-black">
        <div className="px-4 pt-3 pb-0 text-lg font-bold">Settla 1안</div>
        <nav className="flex gap-0 px-4 pt-2">
          {tabs.map(tab => {
            const isActive =
              tab.href === '/settla-lofi/option-1'
                ? pathname === '/settla-lofi/option-1'
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 text-sm ${isActive ? 'border-b-2 border-black font-bold' : 'text-gray-500'}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
