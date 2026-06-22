'use client';
import { useTheme, PALETTES, PALETTE_TAGS, PaletteId, CustomTheme } from '../../../context/ThemeContext';
import { useState, useEffect, useCallback } from 'react';

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

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  Warm:    { bg: '#fef3c7', text: '#92400e' },
  Modern:  { bg: '#ede9fe', text: '#4c1d95' },
  Minimal: { bg: '#f1f5f9', text: '#334155' },
  Custom:  { bg: '#fce7f3', text: '#9d174d' },
};

/** Mini storefront preview card */
function PreviewCard({ bg, primary, accent }: { bg: string; primary: string; accent: string }) {
  return (
    <div style={{
      width: '100%', borderRadius: '.75rem', overflow: 'hidden',
      border: '1px solid rgba(0,0,0,.08)', boxShadow: '0 4px 16px rgba(0,0,0,.08)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Announcement bar */}
      <div style={{ background: primary, color: '#fff', textAlign: 'center', padding: '.3rem .5rem', fontSize: '.55rem', letterSpacing: '.05em' }}>
        Free shipping on orders over A$150
      </div>
      {/* Header */}
      <div style={{ background: bg, borderBottom: `1px solid ${accent}22`, padding: '.4rem .75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: '.7rem', color: primary, letterSpacing: '-.01em' }}>Ethnic Story</span>
        <div style={{ display: 'flex', gap: '.35rem' }}>
          {['All', 'Women', 'Men'].map(l => (
            <span key={l} style={{ fontSize: '.5rem', color: primary, opacity: .7 }}>{l}</span>
          ))}
        </div>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '.5rem', color: '#fff' }}>🛒</span>
        </div>
      </div>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${bg} 0%, ${primary}18 100%)`, padding: '.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '.85rem', fontWeight: 800, color: primary, marginBottom: '.2rem', letterSpacing: '-.01em' }}>New Arrivals</div>
        <div style={{ fontSize: '.55rem', color: '#555', marginBottom: '.45rem' }}>Handcrafted ethnic wear, delivered Australia-wide</div>
        <div style={{ display: 'inline-block', background: primary, color: '#fff', borderRadius: '.4rem', padding: '.2rem .6rem', fontSize: '.55rem', fontWeight: 700 }}>Shop Now</div>
      </div>
      {/* Product cards row */}
      <div style={{ background: bg, padding: '.5rem .75rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.4rem' }}>
        {['Saree', 'Lehenga', 'Kurta'].map((name, i) => (
          <div key={name} style={{ borderRadius: '.4rem', overflow: 'hidden', background: 'white', border: '1px solid rgba(0,0,0,.06)' }}>
            <div style={{ height: 40, background: `linear-gradient(135deg, ${primary}${i === 1 ? '30' : '18'} 0%, ${accent}${i === 0 ? '28' : '14'} 100%)` }} />
            <div style={{ padding: '.2rem .3rem' }}>
              <div style={{ fontSize: '.5rem', fontWeight: 700, color: primary }}>{name}</div>
              <div style={{ fontSize: '.45rem', color: '#888' }}>A${(129 + i * 30)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Hex to RGB helper */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** Approximate perceived luminance to pick legible button text colour */
function textOnBg(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#fff';
  const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return lum > 0.55 ? '#1a1a1a' : '#ffffff';
}

export default function AppearancePage() {
  const { theme, palette, customTheme, toggleTheme, setPalette, setCustomTheme, applyCustomCss } = useTheme();
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>(
    palette === 'custom' ? 'custom' : 'presets'
  );
  const [filterTag, setFilterTag] = useState<string>('All');
  const [saved, setSaved] = useState(false);

  // Local custom colour state (not committed until "Apply")
  const [localCustom, setLocalCustom] = useState<CustomTheme>(customTheme);

  // Sync local state if customTheme changes externally
  useEffect(() => { setLocalCustom(customTheme); }, [customTheme]);

  const handleApplyCustom = useCallback(() => {
    setCustomTheme(localCustom);
    applyCustomCss(localCustom);
    setPalette('custom');
  }, [localCustom, setCustomTheme, applyCustomCss, setPalette]);

  function handleSave() {
    if (activeTab === 'custom') handleApplyCustom();
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  const filteredPalettes = PALETTES.filter(p => {
    if (p.id === 'custom') return false; // shown separately on custom tab
    if (filterTag === 'All') return true;
    return p.tag === filterTag;
  });

  const activePaletteObj = PALETTES.find(p => p.id === palette);
  const previewBg      = palette === 'custom' ? localCustom.bg      : (activePaletteObj?.preview.bg      ?? '#f8f2ec');
  const previewPrimary = palette === 'custom' ? localCustom.primary  : (activePaletteObj?.preview.primary  ?? '#6c2340');
  const previewAccent  = palette === 'custom' ? localCustom.accent   : (activePaletteObj?.preview.accent   ?? '#b88332');

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '.5rem 1.1rem',
    border: 'none',
    borderRadius: '.5rem',
    background: active ? '#9d174d' : 'transparent',
    color: active ? 'white' : '#6b7280',
    fontWeight: active ? 700 : 500,
    fontSize: '.875rem',
    cursor: 'pointer',
    transition: 'background .15s, color .15s',
  });

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', letterSpacing: '-.02em', marginBottom: '.25rem' }}>Appearance</h1>
        <p style={{ fontSize: '.875rem', color: '#6b7280' }}>Customise the storefront colour palette and dark mode.</p>
      </div>

      {/* Dark Mode toggle */}
      <div style={card}>
        <p style={sectionTitle}>Dark Mode</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '.95rem', fontWeight: 600, color: '#111827', marginBottom: '.2rem' }}>Current mode: {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</p>
            <p style={{ fontSize: '.82rem', color: '#6b7280' }}>Customers can always toggle this themselves — this sets your preview default.</p>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '.25rem', marginBottom: '1rem', background: '#f9fafb', padding: '.25rem', borderRadius: '.65rem', width: 'fit-content', border: '1px solid #e5e7eb' }}>
        <button style={tabBtnStyle(activeTab === 'presets')} onClick={() => setActiveTab('presets')}>🎨 Preset Palettes</button>
        <button style={tabBtnStyle(activeTab === 'custom')} onClick={() => setActiveTab('custom')}>✏️ Custom Theme</button>
      </div>

      {/* ── PRESETS TAB ── */}
      {activeTab === 'presets' && (
        <div style={card}>
          {/* Tag filter */}
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {PALETTE_TAGS.filter(t => t !== 'Custom').map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag)}
                style={{
                  padding: '.28rem .75rem',
                  borderRadius: '9999px',
                  border: filterTag === tag ? '1.5px solid #9d174d' : '1.5px solid #e5e7eb',
                  background: filterTag === tag ? '#fdf2f8' : 'white',
                  color: filterTag === tag ? '#9d174d' : '#6b7280',
                  fontSize: '.78rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all .12s',
                }}
              >{tag}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1rem' }}>
            {filteredPalettes.map(p => {
              const active = palette === p.id;
              const tagStyle = TAG_COLORS[p.tag ?? ''];
              return (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id as PaletteId)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    border: active ? '2.5px solid #9d174d' : '2px solid #f0e8f0',
                    borderRadius: '.85rem',
                    padding: '1rem',
                    background: active ? '#fff0f7' : 'white',
                    transition: 'border-color .15s, background .15s, box-shadow .15s',
                    boxShadow: active ? '0 0 0 3px rgba(157,23,77,.1)' : '0 1px 4px rgba(0,0,0,.04)',
                    display: 'block',
                    textAlign: 'left',
                  }}
                >
                  {/* Swatch row */}
                  <div style={{ display: 'flex', gap: '.35rem', marginBottom: '.7rem' }}>
                    <div style={{ flex: 2, height: 28, borderRadius: '.4rem', background: p.preview.bg, border: '1px solid rgba(0,0,0,.07)' }} />
                    <div style={{ flex: 2, height: 28, borderRadius: '.4rem', background: p.preview.primary }} />
                    <div style={{ flex: 1, height: 28, borderRadius: '.4rem', background: p.preview.accent }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.3rem', flexWrap: 'wrap' }}>
                    {active && <span style={{ color: '#9d174d', fontWeight: 800, fontSize: '.85rem' }}>✓</span>}
                    <p style={{ fontSize: '.88rem', fontWeight: 700, color: '#111827' }}>{p.name}</p>
                    {tagStyle && (
                      <span style={{ background: tagStyle.bg, color: tagStyle.text, borderRadius: '9999px', padding: '.1rem .45rem', fontSize: '.6rem', fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase' }}>
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '.75rem', color: '#6b7280', lineHeight: 1.45 }}>{p.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CUSTOM TAB ── */}
      {activeTab === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.25rem' }}>
          {/* Controls */}
          <div style={card}>
            <p style={sectionTitle}>Build Your Palette</p>
            <p style={{ fontSize: '.82rem', color: '#6b7280', marginBottom: '1.25rem', lineHeight: 1.55 }}>
              Pick three colours — the rest of the palette is automatically derived using colour mixing.
            </p>

            {(
              [
                { key: 'bg',      label: 'Background base',  hint: 'The surface behind all content. Best as a very light, desaturated tone.' },
                { key: 'primary', label: 'Primary / Brand',   hint: 'Used for CTAs, header bar, links and key accents. Make it bold and distinctive.' },
                { key: 'accent',  label: 'Secondary accent',  hint: 'Gold trim, highlights, and hover states. Pairs with the primary.' },
              ] as { key: keyof CustomTheme; label: string; hint: string }[]
            ).map(({ key, label, hint }) => (
              <div key={key} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.3rem' }}>
                  <label style={{ fontSize: '.88rem', fontWeight: 700, color: '#111827', flex: 1 }}>{label}</label>
                  {/* Colour pill showing current value */}
                  <span style={{
                    background: localCustom[key],
                    color: textOnBg(localCustom[key]),
                    borderRadius: '.35rem',
                    padding: '.15rem .5rem',
                    fontSize: '.72rem',
                    fontWeight: 700,
                    letterSpacing: '.02em',
                    border: '1px solid rgba(0,0,0,.1)',
                  }}>{localCustom[key].toUpperCase()}</span>
                </div>
                <p style={{ fontSize: '.75rem', color: '#9ca3af', marginBottom: '.5rem', lineHeight: 1.4 }}>{hint}</p>
                {/* Native colour picker + hex input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <input
                    type="color"
                    value={localCustom[key]}
                    onChange={e => setLocalCustom(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{ width: 40, height: 36, borderRadius: '.4rem', border: '1.5px solid #e5e7eb', cursor: 'pointer', padding: '2px', background: 'white' }}
                  />
                  <input
                    type="text"
                    value={localCustom[key]}
                    maxLength={7}
                    onChange={e => {
                      const val = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                        setLocalCustom(prev => ({ ...prev, [key]: val }));
                      }
                    }}
                    style={{
                      flex: 1, padding: '.4rem .6rem', borderRadius: '.4rem',
                      border: '1.5px solid #e5e7eb', fontSize: '.85rem',
                      fontFamily: 'monospace', fontWeight: 600,
                      outline: 'none', color: '#111827',
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Quick presets for custom */}
            <div style={{ borderTop: '1px solid #f0e8f0', paddingTop: '1rem', marginTop: '.5rem' }}>
              <p style={{ ...sectionTitle, marginBottom: '.7rem' }}>Quick starting points</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                {([
                  { label: 'Blush', bg: '#fdf0ec', primary: '#8b2252', accent: '#c07832' },
                  { label: 'Kohl', bg: '#f5f0eb', primary: '#2c1a0e', accent: '#9c6b30' },
                  { label: 'Indigo', bg: '#f0f0f8', primary: '#2d3188', accent: '#a87030' },
                  { label: 'Olive', bg: '#f4f5ee', primary: '#3d4820', accent: '#8a7030' },
                  { label: 'Ruby', bg: '#f8f0f0', primary: '#8b1a28', accent: '#b07828' },
                  { label: 'Teal', bg: '#f0f7f5', primary: '#0f5c50', accent: '#7c6830' },
                ] as (CustomTheme & { label: string })[]).map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setLocalCustom({ bg: preset.bg, primary: preset.primary, accent: preset.accent })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '.3rem',
                      padding: '.3rem .6rem',
                      border: '1.5px solid #e5e7eb', borderRadius: '9999px',
                      background: 'white', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600, color: '#374151',
                      transition: 'border-color .12s, background .12s',
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: preset.primary, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: preset.accent, display: 'inline-block', flexShrink: 0 }} />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleApplyCustom}
              style={{
                marginTop: '1.25rem', width: '100%',
                padding: '.6rem',
                background: '#9d174d', color: 'white',
                border: 'none', borderRadius: '.65rem',
                fontSize: '.875rem', fontWeight: 700, cursor: 'pointer',
                transition: 'background .2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#831843')}
              onMouseLeave={e => (e.currentTarget.style.background = '#9d174d')}
            >
              Apply Custom Theme ✓
            </button>
          </div>

          {/* Live preview panel */}
          <div style={{ ...card, marginBottom: 0 }}>
            <p style={sectionTitle}>Live Preview</p>
            <p style={{ fontSize: '.78rem', color: '#9ca3af', marginBottom: '1rem' }}>Updates as you pick colours. Hit "Apply" to activate on the storefront.</p>
            <PreviewCard
              bg={localCustom.bg}
              primary={localCustom.primary}
              accent={localCustom.accent}
            />
            <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              {(['bg', 'primary', 'accent'] as (keyof CustomTheme)[]).map(k => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '3px', background: localCustom[k], border: '1px solid rgba(0,0,0,.1)' }} />
                  <span style={{ fontSize: '.7rem', color: '#9ca3af', textTransform: 'capitalize' }}>{k === 'bg' ? 'Background' : k === 'primary' ? 'Primary' : 'Accent'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current palette preview (always shown) */}
      {activeTab === 'presets' && (
        <div style={{ ...card, marginBottom: '1.5rem' }}>
          <p style={sectionTitle}>Current Storefront Preview — {activePaletteObj?.name ?? 'Custom'}</p>
          <PreviewCard bg={previewBg} primary={previewPrimary} accent={previewAccent} />
        </div>
      )}

      {/* Info notice */}
      <div style={{ ...card, background: '#f0fdf4', borderColor: '#bbf7d0', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>✅</span>
          <div>
            <p style={{ fontSize: '.9rem', fontWeight: 700, color: '#14532d', marginBottom: '.2rem' }}>Changes are live instantly</p>
            <p style={{ fontSize: '.82rem', color: '#166534' }}>Preset switches apply immediately. Custom themes apply when you click &quot;Apply Custom Theme&quot;. Open the storefront in a new tab to preview.</p>
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
        {saved && <span style={{ fontSize: '.875rem', color: '#16a34a', fontWeight: 600 }}>✓ Saved!</span>}
      </div>
    </div>
  );
}
