'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useCart } from '../../context/CartContext';
import { MobileNav } from './MobileNav';

const NAV_ITEMS = [
  {
    label: 'Women',
    href: '/collections/women',
    children: [
      { label: 'Sarees',    href: '/collections/women/sarees' },
      { label: 'Lehengas', href: '/collections/women/lehengas' },
      { label: 'Kurtas',   href: '/collections/women/kurtas' },
    ],
  },
  {
    label: 'Men',
    href: '/collections/men',
    children: [
      { label: 'Kurtas',    href: '/collections/men/kurtas' },
      { label: 'Sherwanis', href: '/collections/men/sherwanis' },
    ],
  },
  {
    label: 'Kids',
    href: '/collections/kids',
    children: [
      { label: 'Lehengas',  href: '/collections/kids/lehengas' },
      { label: 'Kurtas',    href: '/collections/kids/kurtas' },
      { label: 'Sherwanis', href: '/collections/kids/sherwanis' },
    ],
  },
  {
    label: 'Accessories',
    href: '/collections/accessories',
    children: [],
  },
];

function NavItem({ item }: { item: typeof NAV_ITEMS[number] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasChildren = item.children.length > 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: 'relative' }}
      onMouseEnter={() => hasChildren && setOpen(true)}
      onMouseLeave={() => hasChildren && setOpen(false)}
    >
      <a
        href={item.href}
        style={{
          fontFamily: 'system-ui, sans-serif',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--color-text)',
          transition: 'color 0.15s',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.25rem 0',
          textDecoration: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text)')}
        aria-haspopup={hasChildren || undefined}
        aria-expanded={hasChildren ? open : undefined}
      >
        {item.label}
        {hasChildren && (
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0.55, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </a>

      {hasChildren && open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,252,249,0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            boxShadow: '0 8px 32px -4px rgba(0,0,0,0.14)',
            minWidth: '160px',
            padding: '0.5rem 0',
            zIndex: 200,
            animation: 'dropdownIn 0.15s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {item.children.map(child => (
            <a
              key={child.href}
              href={child.href}
              role="menuitem"
              style={{
                display: 'block',
                padding: '0.5rem 1.1rem',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: 'var(--color-text)',
                textDecoration: 'none',
                transition: 'background 0.12s, color 0.12s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-surface-offset)';
                e.currentTarget.style.color = 'var(--color-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
            >
              {child.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const { totalItems, openCart } = useCart();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const onScroll = () => {
      const scrolled = window.scrollY > 10;
      header.style.background = scrolled ? 'rgba(255,250,245,0.98)' : 'rgba(255,250,245,0.92)';
      header.style.boxShadow = scrolled ? '0 2px 20px -4px rgba(0,0,0,0.12)' : 'none';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .site-announcement {
          background: var(--color-primary);
          color: white;
          text-align: center;
          font-size: .78rem;
          font-weight: 500;
          padding: .45rem 1rem;
          letter-spacing: .01em;
        }
        @media (max-width: 767px) {
          .header-desktop-nav { display: none !important; }
          .header-desktop-account { display: none !important; }
          .header-mobile-toggle { display: flex !important; }
        }
        @media (min-width: 768px) {
          .header-mobile-toggle { display: none !important; }
        }
      `}</style>

      <div className="site-announcement">
        ✨ Free shipping on orders above $150 AUD  |  New festive arrivals now live
      </div>

      <header
        ref={headerRef}
        style={{
          background: 'rgba(255,250,245,0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '0 1rem',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
          gap: '.5rem',
          minWidth: 0,
        }}>

          {/* Logo */}
          <a
            href="/"
            style={{ display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            aria-label="Ethnic Story — Home"
          >
            <Image
              src="/logo.png"
              alt="Ethnic Story"
              width={160}
              height={52}
              priority
              style={{ objectFit: 'contain', height: '52px', width: 'auto', maxWidth: '160px' }}
            />
          </a>

          {/* Desktop nav — hidden on mobile */}
          <nav
            className="header-desktop-nav"
            style={{ display: 'flex', gap: '1.6rem', alignItems: 'center', flex: 1, justifyContent: 'center' }}
            aria-label="Main navigation"
          >
            {NAV_ITEMS.map(item => <NavItem key={item.href} item={item} />)}
          </nav>

          {/* Right side actions */}
          <div style={{ display: 'flex', gap: '.65rem', alignItems: 'center', flexShrink: 0 }}>

            <a
              href="/account"
              className="header-desktop-account"
              style={{ fontSize: '0.875rem', fontFamily: 'system-ui', color: 'var(--color-text)', transition: 'color 0.15s', whiteSpace: 'nowrap', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text)')}
            >
              Account
            </a>

            <button
              onClick={openCart}
              aria-label="Open bag"
              style={{
                background: 'var(--color-primary)', color: '#fff',
                padding: '0.45rem 1rem', borderRadius: '2px',
                fontFamily: 'system-ui', fontSize: '0.8rem', fontWeight: 600,
                letterSpacing: '0.06em', border: 'none', cursor: 'pointer',
                transition: 'background 0.2s, transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px -2px rgba(108,35,64,0.35)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              🛒 Bag
              {totalItems > 0 && (
                <span style={{
                  background: 'rgba(255,255,255,0.25)',
                  borderRadius: '2rem', padding: '0 0.4rem',
                  fontSize: '0.72rem', fontWeight: 700, minWidth: '1.2rem',
                  textAlign: 'center',
                }}>
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </button>

            <div className="header-mobile-toggle" style={{ display: 'none', alignItems: 'center' }}>
              <MobileNav />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
