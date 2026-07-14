'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useCart } from '../../context/CartContext';
import { MobileNav } from './MobileNav';

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
        .site-announcement {
          background: var(--color-primary);
          color: white;
          text-align: center;
          font-size: .78rem;
          font-weight: 500;
          padding: .45rem 1rem;
          letter-spacing: .01em;
        }
        /* Hide desktop nav links + account on mobile */
        @media (max-width: 767px) {
          .header-desktop-nav { display: none !important; }
          .header-desktop-account { display: none !important; }
          .header-mobile-toggle { display: flex !important; }
        }
        /* Hide mobile hamburger on desktop */
        @media (min-width: 768px) {
          .header-mobile-toggle { display: none !important; }
        }
      `}</style>

      <div className="site-announcement">
        ✨ Free shipping on orders above $150 AUD  |  New festive arrivals now live
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
          overflow: 'hidden',
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
          <nav className="header-desktop-nav" style={{ display: 'flex', gap: '1.4rem', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
            {([
              ['Collections', '/collections'],
              ['Sarees', '/collections/sarees'],
              ['Lehengas', '/collections/lehengas'],
              ['Kurtas', '/collections/kurtas'],
              ['Kids', '/collections/kids'],
              ['Accessories', '/collections/accessories'],
            ] as [string, string][]).map(([label, href]) => (
              <a
                key={href}
                href={href}
                style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', transition: 'color 0.15s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text)')}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Right side actions */}
          <div style={{ display: 'flex', gap: '.65rem', alignItems: 'center', flexShrink: 0 }}>

            {/* Account — desktop only */}
            <a
              href="/account"
              className="header-desktop-account"
              style={{ fontSize: '0.875rem', fontFamily: 'system-ui', color: 'var(--color-text)', transition: 'color 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text)')}
            >
              Account
            </a>

            {/* Bag — always visible */}
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

            {/* Hamburger — mobile only, rendered by MobileNav */}
            <div className="header-mobile-toggle" style={{ display: 'none', alignItems: 'center' }}>
              <MobileNav />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
