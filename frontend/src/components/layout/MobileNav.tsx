'use client';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { href: '/collections',         label: 'All Collections' },
  { href: '/collections/sarees',  label: 'Sarees' },
  { href: '/collections/lehengas',label: 'Lehengas' },
  { href: '/collections/kurtas',  label: 'Kurtas' },
  { href: '/collections/kids',    label: 'Kids' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  // Close on outside click / scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on route change (simple pathname listen)
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
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

      {/* Overlay */}
      {open && (
        <div
          className="mobile-nav-overlay"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <nav
        className={`mobile-nav-drawer ${open ? 'open' : ''}`}
        aria-label="Mobile navigation"
      >
        <div className="mobile-nav-drawer__header">
          <a className="site-header__logo" href="/" onClick={() => setOpen(false)}>
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                <path d="M8 24C12 22 13.5 17 16 11C18.5 17 20 22 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 20C13.5 18.5 14.7 16.8 16 14C17.3 16.8 18.5 18.5 20 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </span>
            Ethnic Story
          </a>
          <button className="mobile-nav-drawer__close" aria-label="Close menu" onClick={() => setOpen(false)}>✕</button>
        </div>

        <ul className="mobile-nav-drawer__links">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a href={href} onClick={() => setOpen(false)}>{label}</a>
            </li>
          ))}
        </ul>

        <div className="mobile-nav-drawer__footer">
          <a href="/collections" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setOpen(false)}>
            Shop Now
          </a>
        </div>
      </nav>
    </>
  );
}
