'use client';
import { useState, useEffect, useRef } from 'react';
import { useCart } from '../../context/CartContext';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { totalItems, openCart } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="announcement">✨ Free shipping on orders above ₹2,500 &nbsp;|&nbsp; New festive arrivals now live</div>
      <header
        ref={headerRef}
        style={{
          background: scrolled ? 'rgba(255,250,245,0.98)' : 'rgba(255,250,245,0.92)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '0 1.5rem',
          boxShadow: scrolled ? '0 2px 20px -4px rgba(0,0,0,0.12)' : 'none',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
          <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.01em', transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            Ethnic Story
          </a>

          <nav style={{ display: 'flex', gap: '1.6rem', alignItems: 'center' }}>
            {[
              ['Collections', '/collections'],
              ['Sarees', '/collections/sarees'],
              ['Lehengas', '/collections/lehengas'],
              ['Kurtas', '/collections/kurtas'],
              ['Kids', '/collections/kids'],
              ['Accessories', '/collections/accessories'],
            ].map(([label, href]) => (
              <a key={href} href={href}
                style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', transition: 'color 0.15s', position: 'relative', paddingBottom: '2px' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text)')}>
                {label}
              </a>
            ))}
          </nav>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="/account" style={{ fontSize: '0.875rem', fontFamily: 'system-ui', color: 'var(--color-text)', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text)')}>
              Account
            </a>
            <button
              onClick={openCart}
              style={{
                background: 'var(--color-primary)', color: '#fff',
                padding: '0.5rem 1.2rem', borderRadius: '2px',
                fontFamily: 'system-ui', fontSize: '0.8rem', fontWeight: 600,
                letterSpacing: '0.06em', border: 'none', cursor: 'pointer',
                transition: 'background 0.2s, transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
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
              🛍️ Bag
              {totalItems > 0 && (
                <span style={{
                  background: 'rgba(255,255,255,0.25)',
                  borderRadius: '2rem', padding: '0 0.4rem',
                  fontSize: '0.72rem', fontWeight: 700, minWidth: '1.2rem',
                  textAlign: 'center',
                }}>
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
