'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useCart } from '../../context/CartContext';
import { usePathname } from 'next/navigation';

type NavGroup = {
  gender: string;
  categories: { id: string; slug: string; label: string; sort_order: number }[];
};

// Fixed display order — defines the canonical top-to-bottom sequence.
// Only groups that actually have products will be rendered.
const GROUP_ORDER = ['women', 'men', 'kids', 'accessories'] as const;
const GENDER_LABELS: Record<string, string> = {
  women: 'Women',
  men: 'Men',
  kids: 'Kids',
  accessories: 'Accessories',
};
const GENDER_EMOJI: Record<string, string> = {
  women: '🥻',
  men: '🧣',
  kids: '🎠',
  accessories: '💎',
};

type Section = {
  href: string;
  label: string;
  emoji: string;
  children: { href: string; label: string }[];
};

function buildSections(groups: NavGroup[]): Section[] {
  // Sort incoming groups by the canonical GROUP_ORDER.
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
  const sections: Section[] = sorted.map(g => ({
    label: GENDER_LABELS[g.gender] ?? g.gender.charAt(0).toUpperCase() + g.gender.slice(1),
    href: `/collections/${g.gender}`,
    emoji: GENDER_EMOJI[g.gender] ?? '🛍️',
    children: g.categories.map(c => ({
      label: c.label,
      href: `/collections/${g.gender}/${c.slug}`,
    })),
  }));

  sections.push({ href: '/collections', label: 'All Collections', emoji: '✨', children: [] });

  return sections;
}

function Toggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      className="mobile-nav-toggle"
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      onClick={onToggle}
    >
      <span className={`hamburger ${open ? 'open' : ''}`}>
        <span /><span /><span />
      </span>
    </button>
  );
}

function Drawer({ open, onClose, sections }: { open: boolean; onClose: () => void; sections: Section[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function close() { onClose(); setExpanded(null); }

  if (!mounted) return null;

  return createPortal(
    <>
      {open && (
        <div
          className="mobile-nav-overlay"
          aria-hidden="true"
          onClick={close}
          style={{ zIndex: 1000 }}
        />
      )}
      <nav
        className={`mobile-nav-drawer ${open ? 'open' : ''}`}
        aria-label="Mobile navigation"
        style={{ background: '#fff9f5', zIndex: 1001 }}
      >
        <div className="mobile-nav-drawer__header" style={{ background: '#fff9f5', borderBottom: '1px solid #fce7f3' }}>
          <a
            className="site-header__logo"
            href="/"
            onClick={close}
            aria-label="Ethnic Story — Home"
            style={{ background: 'transparent', lineHeight: 0, display: 'flex', alignItems: 'center' }}
          >
            <Image
              src="/logo.png"
              alt="Ethnic Story"
              width={160}
              height={48}
              priority
              style={{
                objectFit: 'contain',
                height: '48px',
                width: 'auto',
                maxWidth: '160px',
                background: 'transparent',
                mixBlendMode: 'multiply',
                display: 'block',
              }}
            />
          </a>
          <button className="mobile-nav-drawer__close" aria-label="Close menu" onClick={close}>✕</button>
        </div>

        <ul className="mobile-nav-drawer__links" style={{ paddingBottom: '6rem', background: '#fff9f5' }}>
          {sections.map(item => (
            <li key={item.href} style={{ borderBottom: '1px solid #fce7f3' }}>
              {item.children.length > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <a href={item.href} onClick={close}
                      style={{ flex: 1, display: 'block', padding: '.85rem 1.25rem', color: '#1a1a1a', textDecoration: 'none', fontWeight: 600, fontSize: '.95rem' }}>
                      {item.emoji} {item.label}
                    </a>
                    <button
                      aria-label={`Toggle ${item.label}`}
                      onClick={() => setExpanded(e => e === item.href ? null : item.href)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '.5rem 1.25rem', fontSize: '.85rem', color: '#9d174d' }}
                    >
                      {expanded === item.href ? '▲' : '▼'}
                    </button>
                  </div>
                  {expanded === item.href && (
                    <ul style={{ listStyle: 'none', padding: '0 0 .5rem 0', margin: 0, background: '#fdf2f8' }}>
                      <li>
                        <a href={item.href} onClick={close}
                          style={{ display: 'block', padding: '.55rem 2.5rem', fontSize: '.85rem', color: '#9d174d', textDecoration: 'none', fontWeight: 700 }}>
                          All {item.label}
                        </a>
                      </li>
                      {item.children.map(child => (
                        <li key={child.href}>
                          <a href={child.href} onClick={close}
                            style={{ display: 'block', padding: '.65rem 2.5rem', fontSize: '.9rem', color: '#6b0f2e', textDecoration: 'none', fontWeight: 500 }}>
                            {child.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <a href={item.href} onClick={close}
                  style={{ display: 'block', padding: '.85rem 1.25rem', color: '#1a1a1a', textDecoration: 'none', fontWeight: 600, fontSize: '.95rem' }}>
                  {item.emoji} {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="mobile-nav-drawer__footer" style={{ background: '#fff9f5', borderTop: '1px solid #fce7f3' }}>
          <a href="/collections" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={close}>
            Shop Now
          </a>
        </div>
      </nav>
    </>,
    document.body
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    fetch('/api/storefront/categories')
      .then(r => r.ok ? r.json() : [])
      .then((groups: NavGroup[]) => {
        if (Array.isArray(groups) && groups.length > 0) setSections(buildSections(groups));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  return (
    <>
      <Toggle open={open} onToggle={() => setOpen(o => !o)} />
      <Drawer open={open} onClose={() => setOpen(false)} sections={sections} />
    </>
  );
}

export function BottomTabBar() {
  const { totalItems, openCart } = useCart();
  const pathname = usePathname();

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
          <path d="M9 21V12h6v9"/>
        </svg>
      ),
    },
    {
      id: 'shop',
      label: 'Shop',
      href: '/collections',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
      ),
    },
    {
      id: 'cart',
      label: 'Bag',
      href: null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      ),
    },
    {
      id: 'account',
      label: 'Account',
      href: '/account',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ];

  function isActive(href: string | null) {
    if (!href) return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <nav
      aria-label="Bottom navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(157,23,77,0.12)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.09)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      className="bottom-tab-bar"
    >
      {tabs.map(tab => {
        const active = isActive(tab.href);
        const content = (
          <>
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: active ? 'var(--color-primary)' : '#9ca3af', transition: 'color .15s' }}>{tab.icon}</span>
              {tab.id === 'cart' && totalItems > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-8px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  borderRadius: '2rem',
                  fontSize: '.58rem',
                  fontWeight: 800,
                  minWidth: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  lineHeight: 1,
                  border: '1.5px solid white',
                }}>
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </span>
            <span style={{
              fontSize: '.62rem',
              fontWeight: active ? 700 : 500,
              color: active ? 'var(--color-primary)' : '#9ca3af',
              marginTop: '.18rem',
              letterSpacing: '.02em',
              transition: 'color .15s',
            }}>
              {tab.label}
            </span>
            {active && (
              <span style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '2rem',
                height: '2.5px',
                background: 'var(--color-primary)',
                borderRadius: '0 0 4px 4px',
              }} />
            )}
          </>
        );

        const sharedStyle: React.CSSProperties = {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '.65rem .25rem .55rem',
          position: 'relative',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          textDecoration: 'none',
          WebkitTapHighlightColor: 'transparent',
          minHeight: '56px',
        };

        if (tab.id === 'cart') {
          return (
            <button key={tab.id} onClick={openCart} style={sharedStyle} aria-label="Open bag">
              {content}
            </button>
          );
        }
        return (
          <a key={tab.id} href={tab.href!} style={sharedStyle}>
            {content}
          </a>
        );
      })}
    </nav>
  );
}
