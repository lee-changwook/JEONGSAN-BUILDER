'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: '정산 실행', href: '/jeongsan-builder-co-fi' },
] as const;

export default function JeongsanBuilderCoFiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen flex-col" style={{ fontFamily: '"Gaegu", "Nanum Pen Script", system-ui, sans-serif' }}>
      <div className="border-b-2 border-black">
        <div className="px-4 pt-3 pb-0 text-lg font-bold">Jeongsan Builder (Co-Fi)</div>
        <nav className="flex gap-0 px-4 pt-2">
          {tabs.map(tab => {
            const isActive =
              tab.href === '/jeongsan-builder-co-fi'
                ? pathname === '/jeongsan-builder-co-fi'
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 text-sm ${isActive
                  ? 'border-b-2 border-black font-bold'
                  : 'text-gray-500'
                }`}
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
