'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Remove and re-add class to retrigger the animation on every route change
    el.classList.remove('page-transition--enter');
    // Force reflow so the browser registers the removal
    void el.offsetHeight;
    el.classList.add('page-transition--enter');
  }, [pathname]);

  return (
    <div ref={ref} className="page-transition page-transition--enter">
      {children}
    </div>
  );
}
