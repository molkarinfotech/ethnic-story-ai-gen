'use client';
import { useTheme, PALETTES, PaletteId } from '../../../context/ThemeContext';
import { useState } from 'react';

const card: React.CSSProperties = {
  background: 'white',
  border: '1.5px solid #fce7f3',
  borderRadius: '1rem',
  padding: '1.5rem',
  marginBottom: '1.5rem',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '.7rem',
  fontWeight: 700,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  marginBottom: '1rem',
};

export default function AppearancePage() {
  const { theme, palette, toggleTheme, setPalette } = useTheme();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    // Preferences are already persisted to localStorage on each change.
    // Show a brief confirmation.
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', letterSpacing: '-.02em', marginBottom: '.25rem' }}>Appearance</h1>
        <p style={{ fontSize: '.875rem', color: '#6b7280' }}>Customise the storefront colour palette and dark mode default.</p>
      </div>

      {/* Dark Mode */}
      <div style={card}>
        <p style={sectionTitle}>Dark Mode</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '.95rem', fontWeight: 600, color: '#111827', marginBottom: '.2rem' }}>Current mode: {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</p>
            <p style={{ fontSize: '.82rem', color: '#6b7280' }}>Customers can always toggle this themselves — this sets the preview default.</p>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex', alignItems: 'center', gap: '.5rem',
              padding: '.6rem 1.25rem',
              background: theme === 'dark' ? '#fef3c7' : '#1f2937',
              color: theme === 'dark' ? '#1c1a00' : '#f9fafb',
              border: 'none', borderRadius: '.65rem',
              fontSize: '.875rem', fontWeight: 700, cursor: 'pointer',
              transition: 'background .2s, color .2s',
            }}
          >
            {theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
          </button>
        </div>
      </div>

      {/* Colour Palette */}
      <div style={card}>
        <p style={sectionTitle}>Colour Palette</p>
        <p style={{ fontSize: '.82rem', color: '#6b7280', marginBottom: '1.25rem' }}>Choose a palette — changes are applied instantly to the live storefront.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {PALETTES.map(p => {
            const active = palette === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPalette(p.id as PaletteId)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  border: active ? '2.5px solid #9d174d' : '2px solid #fce7f3',
                  borderRadius: '.85rem',
                  padding: '1rem',
                  background: active ? '#fff0f7' : 'white',
                  transition: 'border-color .15s, background .15s, box-shadow .15s',
                  boxShadow: active ? '0 0 0 3px rgba(157,23,77,.12)' : 'none',
                  display: 'block',
                  textAlign: 'left',
                }}
              >
                {/* Swatch row */}
                <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.75rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '.5rem', background: p.preview.bg, border: '1px solid rgba(0,0,0,.08)' }} />
                  <div style={{ width: 32, height: 32, borderRadius: '.5rem', background: p.preview.primary }} />
                  <div style={{ width: 32, height: 32, borderRadius: '.5rem', background: p.preview.accent }} />
                </div>
                <p style={{ fontSize: '.9rem', fontWeight: 700, color: '#111827', marginBottom: '.2rem' }}>
                  {active && <span style={{ marginRight: '.3rem' }}>✓</span>}{p.name}
                </p>
                <p style={{ fontSize: '.78rem', color: '#6b7280', lineHeight: 1.4, maxWidth: '18ch' }}>{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live preview notice */}
      <div style={{ ...card, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>✅</span>
          <div>
            <p style={{ fontSize: '.9rem', fontWeight: 700, color: '#14532d', marginBottom: '.2rem' }}>Changes are live instantly</p>
            <p style={{ fontSize: '.82rem', color: '#166534' }}>Palette and dark mode changes apply immediately — no publish step needed. They&apos;re saved to the visitor&apos;s browser. Open the storefront in a new tab to preview with your changes applied.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleSave}
          style={{
            padding: '.65rem 1.75rem',
            background: '#9d174d', color: 'white',
            border: 'none', borderRadius: '.65rem',
            fontSize: '.9rem', fontWeight: 700, cursor: 'pointer',
            transition: 'background .2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#831843')}
          onMouseLeave={e => (e.currentTarget.style.background = '#9d174d')}
        >
          Save Preferences
        </button>
        {saved && (
          <span style={{ fontSize: '.875rem', color: '#16a34a', fontWeight: 600 }}>✓ Saved!</span>
        )}
      </div>
    </div>
  );
}
