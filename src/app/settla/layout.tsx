'use client';

import { TopNav } from '@/components/common/TopNav';

export default function SettlaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-y-auto">
      <TopNav />
      <main className="min-h-[calc(100vh-56px)] bg-gray-50">{children}</main>
    </div>
  );
}
