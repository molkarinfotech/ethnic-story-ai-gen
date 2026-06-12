'use client';
import { useState } from 'react';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="announcement">✨ Free shipping on orders above ₹2,500 &nbsp;|&nbsp; New festive arrivals now live</div>
      <header style={{
        background: 'rgba(255,250,245,0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 1.5rem',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
          <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.01em' }}>
            Ethnic Story
          </a>
          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {[['Collections', '/collections'], ['Sarees', '/collections/sarees'], ['Lehengas', '/collections/lehengas'], ['Kurtas', '/collections/kurtas'], ['Kids', '/collections/kids']].map(([label, href]) => (
              <a key={href} href={href} style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text)')}>
                {label}
              </a>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="/account" style={{ fontSize: '0.875rem', fontFamily: 'system-ui', color: 'var(--color-text)' }}>Account</a>
            <a href="/cart" style={{ background: 'var(--color-primary)', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: '2px', fontFamily: 'system-ui', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.06em' }}>Cart (0)</a>
          </div>
        </div>
      </header>
    </>
  );
}
