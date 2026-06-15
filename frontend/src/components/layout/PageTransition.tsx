'use client';

import { usePathname } from 'next/navigation';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // key forces a true DOM remount on every route change,
  // which re-triggers the @starting-style CSS transition
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
