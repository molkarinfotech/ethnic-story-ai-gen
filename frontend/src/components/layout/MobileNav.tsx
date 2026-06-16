'use client';
import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { usePathname } from 'next/navigation';

const SECTIONS = [
  {
    href: '/collections/women',
    label: 'Women',
    emoji: '🥕',
    children: [
      { href: '/collections/women/sarees',   label: 'Sarees' },
      { href: '/collections/women/lehengas', label: 'Lehengas' },
      { href: '/collections/women/kurtas',   label: 'Kurtas' },
    ],
  },
  {
    href: '/collections/men',
    label: 'Men',
    emoji: '🧣',
    children: [
      { href: '/collections/men/kurtas',    label: 'Kurtas' },
      { href: '/collections/men/sherwanis', label: 'Sherwanis' },
    ],
  },
  {
    href: '/collections/kids',
    label: 'Kids',
    emoji: '🎠',
    children: [
      { href: '/collections/kids/lehengas',  label: 'Lehengas' },
      { href: '/collections/kids/kurtas',    label: 'Kurtas' },
      { href: '/collections/kids/sherwanis', label: 'Sherwanis' },
    ],
  },
  { href: '/collections', label: 'All Collections', emoji: '✨', children: [] },
];

// ─── Hamburger drawer ──────────────────────────────────────────────────────
export function MobileNav() {
  const [open, setOpen]         = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  function close() { setOpen(false); setExpanded(null); }

  return (
    <>
      <button
        className="mobile-nav-toggle"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className={`hamburger ${open ? 'open' : ''}`}>
          <span /><span /><span />
        </span>
      </button>

      {open && <div className="mobile-nav-overlay" aria-hidden="true" onClick={close} />}

      <nav className={`mobile-nav-drawer ${open ? 'open' : ''}`} aria-label="Mobile navigation">
        <div className="mobile-nav-drawer__header">
          <a className="site-header__logo" href="/" onClick={close}>
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                <path d="M8 24C12 22 13.5 17 16 11C18.5 17 20 22 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 20C13.5 18.5 14.7 16.8 16 14C17.3 16.8 18.5 18.5 20 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </span>
            Ethnic Story
          </a>
          <button className="mobile-nav-drawer__close" aria-label="Close menu" onClick={close}>✕</button>
        </div>

        <ul className="mobile-nav-drawer__links" style={{ paddingBottom: '6rem' }}>
          {SECTIONS.map(item => (
            <li key={item.href}>
              {item.children.length > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <a href={item.href} onClick={close} style={{ flex: 1 }}>
                      {item.emoji} {item.label}
                    </a>
                    <button
                      aria-label={`Toggle ${item.label}`}
                      onClick={() => setExpanded(e => e === item.href ? null : item.href)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '.5rem .75rem', fontSize: '.85rem', color: 'var(--color-text-muted)' }}
                    >
                      {expanded === item.href ? '▲' : '▼'}
                    </button>
                  </div>
                  {expanded === item.href && (
                    <ul style={{ listStyle: 'none', padding: '0 0 .25rem 1.5rem', margin: 0 }}>
                      {item.children.map(child => (
                        <li key={child.href} style={{ borderTop: '1px solid var(--color-border)' }}>
                          <a href={child.href} onClick={close}
                            style={{ display: 'block', padding: '.6rem .75rem', fontSize: '.9rem', color: 'var(--color-text-muted)', textDecoration: 'none', textTransform: 'capitalize' }}>
                            {child.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <a href={item.href} onClick={close}>{item.emoji} {item.label}</a>
              )}
            </li>
          ))}
        </ul>

        <div className="mobile-nav-drawer__footer">
          <a href="/collections" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={close}>
            Shop Now
          </a>
        </div>
      </nav>
    </>
  );
}

// ─── Floating bottom tab bar (always visible on mobile) ──────────────────────
export function BottomTabBar() {
  const { cartCount, openCart } = useCart();
  const pathname = usePathname();

  // On product pages, the sticky ATC bar also sits at the bottom.
  // We push it above the tab bar using bottom offset.
  const isProductPage = pathname.startsWith('/products/');

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
              {tab.id === 'cart' && cartCount > 0 && (
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
                  {cartCount > 99 ? '99+' : cartCount}
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
