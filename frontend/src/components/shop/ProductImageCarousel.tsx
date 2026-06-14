'use client';
import { useState } from 'react';

export function ProductImageCarousel({
  images,
  name,
  badge,
  discount,
}: {
  images: string[];
  name: string;
  badge?: string;
  discount?: number | null;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div style={{ position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--color-surface)', aspectRatio: '4/5', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6rem' }}>
        🥻
      </div>
    );
  }

  function prev() { setActive(i => (i - 1 + images.length) % images.length); }
  function next() { setActive(i => (i + 1) % images.length); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Main image */}
      <div style={{ position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--color-surface)', aspectRatio: '4/5', boxShadow: 'var(--shadow-md)' }}>
        <img
          key={active}
          src={images[active]}
          alt={`${name} — view ${active + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', animation: 'fadeIn .25s ease' }}
        />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(160deg, rgba(108,35,64,.08) 0%, transparent 45%, rgba(184,131,50,.06) 100%)' }} />

        {badge && (
          <span style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', background: 'var(--color-primary)', color: 'var(--color-text-inverse)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '.05em', padding: '.3rem .8rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase' }}>{badge}</span>
        )}
        {discount && (
          <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'var(--color-gold)', color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 700, padding: '.3rem .75rem', borderRadius: 'var(--radius-full)' }}>−{discount}%</span>
        )}

        {/* Prev / Next arrows */}
        {images.length > 1 && (
          <>
            <button onClick={prev} aria-label="Previous image" style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: 'none', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.12)' }}>‹</button>
            <button onClick={next} aria-label="Next image" style={{ position: 'absolute', right: '.75rem', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: 'none', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.12)' }}>›</button>
          </>
        )}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
            {images.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} aria-label={`View ${i + 1}`}
                style={{ width: i === active ? '20px' : '8px', height: '8px', borderRadius: '4px', background: i === active ? 'white' : 'rgba(255,255,255,.55)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all .2s' }} />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail rail */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: '2px' }}>
          {images.map((src, i) => (
            <button key={i} onClick={() => setActive(i)}
              style={{ flexShrink: 0, width: '64px', height: '80px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: i === active ? '2px solid var(--color-primary)' : '2px solid transparent', padding: 0, cursor: 'pointer', transition: 'border-color .15s' }}>
              <img src={src} alt={`Thumbnail ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
