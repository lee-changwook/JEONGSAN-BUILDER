'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: '홈', href: '/settla-lofi' },
  { label: '1안', href: '/settla-lofi/option-1' },
  { label: '2안', href: '/settla-lofi/option-2' },
] as const;

export default function SettlaLofiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isLoginPage = pathname === '/settla-lofi/login';
  if (isLoginPage) return <>{children}</>;

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b-2 border-black">
        <div className="px-4 pt-3 pb-0 text-lg font-bold">Settla</div>
        <nav className="flex gap-0 px-4 pt-2">
          {tabs.map(tab => {
            const isActive =
              tab.href === '/settla-lofi'
                ? pathname === '/settla-lofi'
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
