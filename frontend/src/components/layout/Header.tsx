'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useCart } from '../../context/CartContext';
import { MobileNav } from './MobileNav';

type NavGroup = {
  gender: string;
  categories: { id: string; slug: string; label: string; sort_order: number }[];
};

// Fixed display order — defines the canonical left-to-right sequence.
// Only groups that actually have products will be rendered.
const GROUP_ORDER = ['women', 'men', 'kids', 'accessories'] as const;
const GENDER_LABELS: Record<string, string> = {
  women: 'Women',
  men: 'Men',
  kids: 'Kids',
  accessories: 'Accessories',
};

type NavItemData = { label: string; href: string; children: { label: string; href: string }[] };

function buildNav(groups: NavGroup[]): NavItemData[] {
  // Sort incoming groups by the canonical GROUP_ORDER.
  // Groups not in GROUP_ORDER are appended at the end.
  const sorted = [...groups].sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.gender as typeof GROUP_ORDER[number]);
    const bi = GROUP_ORDER.indexOf(b.gender as typeof GROUP_ORDER[number]);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // Map every group — all categories from the API are shown.
  // No client-side filtering: the API is the source of truth.
  return sorted.map(g => ({
    label: GENDER_LABELS[g.gender] ?? g.gender.charAt(0).toUpperCase() + g.gender.slice(1),
    href: `/collections/${g.gender}`,
    children: g.categories.map(c => ({
      label: c.label,
      href: `/collections/${g.gender}/${c.slug}`,
    })),
  }));
}

// ── Dropdown nav item with a generous hover-bridge so the cursor
//    can travel into the panel without it vanishing ──────────────
function NavItem({ item }: { item: NavItemData }) {
  const [open, setOpen] = useState(false);
  const ref      = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasChildren = item.children.length > 0;

  function scheduleClose() {
    timerRef.current = setTimeout(() => setOpen(false), 300);
  }
  function cancelClose() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: 'relative' }}
      onMouseEnter={() => { cancelClose(); if (hasChildren) setOpen(true); }}
      onMouseLeave={() => hasChildren && scheduleClose()}
    >
      <a
        href={item.href}
        style={{
          fontFamily: 'system-ui, sans-serif',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: open ? 'var(--color-primary)' : 'var(--color-text)',
          transition: 'color 0.15s',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.5rem 0.1rem',
          textDecoration: 'none',
          borderBottom: open ? '2px solid var(--color-primary)' : '2px solid transparent',
        }}
        aria-haspopup={hasChildren || undefined}
        aria-expanded={hasChildren ? open : undefined}
      >
        {item.label}
        {hasChildren && (
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0.6, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </a>

      {hasChildren && (
        <>
          {open && (
            <div
              onMouseEnter={cancelClose}
              style={{
                position: 'absolute',
                top: '100%',
                left: '-20px',
                right: '-20px',
                height: '10px',
                zIndex: 199,
              }}
            />
          )}
          <div
            role="menu"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: '50%',
              transform: open
                ? 'translateX(-50%) translateY(0)'
                : 'translateX(-50%) translateY(-8px)',
              background: 'rgba(255,252,249,0.99)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--color-border)',
              borderTop: '2px solid var(--color-primary)',
              borderRadius: '0 0 10px 10px',
              boxShadow: '0 16px 40px -8px rgba(0,0,0,0.16)',
              minWidth: '180px',
              padding: '0.5rem 0 0.75rem',
              zIndex: 200,
              opacity: open ? 1 : 0,
              visibility: open ? 'visible' : 'hidden',
              pointerEvents: open ? 'all' : 'none',
              transition: 'opacity 0.18s cubic-bezier(0.16,1,0.3,1), transform 0.18s cubic-bezier(0.16,1,0.3,1), visibility 0.18s',
            }}
          >
            <a
              href={item.href}
              role="menuitem"
              style={{
                display: 'block',
                padding: '0.45rem 1.2rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                textDecoration: 'none',
                letterSpacing: '.03em',
                textTransform: 'uppercase',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-offset)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              All {item.label}
            </a>
            <div style={{ height: 1, background: 'var(--color-border)', margin: '0.3rem 1.2rem 0.4rem' }} />
            {item.children.map(child => (
              <a
                key={child.href}
                href={child.href}
                role="menuitem"
                style={{
                  display: 'block',
                  padding: '0.45rem 1.2rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  transition: 'background 0.1s, color 0.1s',
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
        </>
      )}
    </div>
  );
}

export function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const { totalItems, openCart } = useCart();
  const [navItems, setNavItems] = useState<NavItemData[]>([]);

  useEffect(() => {
    fetch('/api/storefront/categories')
      .then(r => r.ok ? r.json() : [])
      .then((groups: NavGroup[]) => {
        if (Array.isArray(groups) && groups.length > 0) {
          setNavItems(buildNav(groups));
        }
      })
      .catch(() => {});
  }, []);

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
        ✨ Free shipping on orders above $150 AUD  |  New festive arrivals now live
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

          <a
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              transition: 'opacity 0.2s',
              background: 'transparent',
              lineHeight: 0,
            }}
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
              style={{
                objectFit: 'contain',
                height: '52px',
                width: 'auto',
                maxWidth: '160px',
                background: 'transparent',
                mixBlendMode: 'multiply',
                display: 'block',
              }}
            />
          </a>

          {/* Desktop nav */}
          <nav
            className="header-desktop-nav"
            style={{ display: 'flex', gap: '1.6rem', alignItems: 'center', flex: 1, justifyContent: 'center' }}
            aria-label="Main navigation"
          >
            {navItems.map(item => <NavItem key={item.href} item={item} />)}
            {navItems.length === 0 && (
              [1,2,3,4].map(i => (
                <span key={i} style={{ display: 'inline-block', width: 52, height: 14, borderRadius: 4, background: '#f3e8ee', opacity: 0.7 }} />
              ))
            )}
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
