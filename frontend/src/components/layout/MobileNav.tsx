'use client';
import { useState, useEffect } from 'react';

const NAV = [
  {
    href: '/collections/women',
    label: 'Women',
    emoji: '🥻',
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

export function MobileNav() {
  const [open, setOpen]             = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);

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

        <ul className="mobile-nav-drawer__links" style={{ paddingBottom: '1rem' }}>
          {NAV.map(item => (
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
