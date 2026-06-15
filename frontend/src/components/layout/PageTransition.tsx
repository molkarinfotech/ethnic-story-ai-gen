'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [displayKey, setDisplayKey] = useState(pathname);

  useEffect(() => {
    // Step 1: immediately hide
    setVisible(false);

    // Step 2: after a microtask, swap content key and start fade-in
    const raf = requestAnimationFrame(() => {
      setDisplayKey(pathname);
      requestAnimationFrame(() => {
        setVisible(true);
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return (
    <div
      key={displayKey}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.994)',
        transition: visible
          ? 'opacity 650ms cubic-bezier(.16,1,.3,1), transform 650ms cubic-bezier(.16,1,.3,1)'
          : 'none',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
