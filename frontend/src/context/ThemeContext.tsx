'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type PaletteId =
  | 'rose-gold'
  | 'midnight-blue'
  | 'forest-green'
  | 'saffron'
  | 'monochrome'
  | 'marigold'
  | 'velvet-plum'
  | 'copper-blush'
  | 'jade-temple'
  | 'sand-dune'
  | 'deep-burgundy'
  | 'peacock-teal'
  | 'arctic-white'
  | 'custom';

export interface PaletteOption {
  id: PaletteId;
  name: string;
  description: string;
  tag?: string;
  preview: { bg: string; primary: string; accent: string };
}

export interface CustomTheme {
  bg: string;
  primary: string;
  accent: string;
}

export const DEFAULT_CUSTOM: CustomTheme = { bg: '#fdf6ee', primary: '#7c3a1e', accent: '#c08030' };

export const PALETTES: PaletteOption[] = [
  // ── Warm ethnic ──────────────────────────────────────────
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    tag: 'Warm',
    description: 'Warm blush + deep crimson — the original Ethnic Story look.',
    preview: { bg: '#f8f2ec', primary: '#6c2340', accent: '#b88332' },
  },
  {
    id: 'saffron',
    name: 'Saffron',
    tag: 'Warm',
    description: 'Ivory surfaces with a bold saffron-orange primary — festive & vibrant.',
    preview: { bg: '#fdf8ef', primary: '#9a3412', accent: '#854d0e' },
  },
  {
    id: 'marigold',
    name: 'Marigold',
    tag: 'Warm',
    description: 'Sun-kissed amber base with a deep turmeric primary and rust accent.',
    preview: { bg: '#fffbeb', primary: '#b45309', accent: '#c2410c' },
  },
  {
    id: 'copper-blush',
    name: 'Copper Blush',
    tag: 'Warm',
    description: 'Warm terracotta surfaces with a burnt-copper primary and dusty rose accent.',
    preview: { bg: '#fdf0eb', primary: '#9b4c2a', accent: '#c07060' },
  },
  {
    id: 'deep-burgundy',
    name: 'Deep Burgundy',
    tag: 'Warm',
    description: 'Rich wine-dark surfaces — opulent and ceremonial.',
    preview: { bg: '#f9f0f0', primary: '#6b1c2c', accent: '#a8783a' },
  },
  {
    id: 'sand-dune',
    name: 'Sand Dune',
    tag: 'Warm',
    description: 'Earthy linen tones with a warm khaki primary — understated luxury.',
    preview: { bg: '#faf7f0', primary: '#78614a', accent: '#a07850' },
  },
  // ── Modern / cool ─────────────────────────────────────────
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    tag: 'Modern',
    description: 'Rich indigo surfaces with sapphire primary and gold accent.',
    preview: { bg: '#f0f2f8', primary: '#1e3a8a', accent: '#b45309' },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    tag: 'Modern',
    description: 'Sage surfaces with deep emerald primary and warm clay accent.',
    preview: { bg: '#f0f4f0', primary: '#14532d', accent: '#92400e' },
  },
  {
    id: 'velvet-plum',
    name: 'Velvet Plum',
    tag: 'Modern',
    description: 'Deep grape surfaces with a violet primary and gold accent — regal and editorial.',
    preview: { bg: '#f5f0f8', primary: '#5b21b6', accent: '#b45309' },
  },
  {
    id: 'jade-temple',
    name: 'Jade Temple',
    tag: 'Modern',
    description: 'Cool celadon surfaces with a deep teal primary — serene and refined.',
    preview: { bg: '#f0f7f5', primary: '#0d5c4e', accent: '#7c6f3a' },
  },
  {
    id: 'peacock-teal',
    name: 'Peacock Teal',
    tag: 'Modern',
    description: 'Vivid jewel-tone teal with sapphire primary and gold — dramatic & festive.',
    preview: { bg: '#effcfc', primary: '#0e7490', accent: '#a16207' },
  },
  // ── Minimal ───────────────────────────────────────────────
  {
    id: 'monochrome',
    name: 'Monochrome',
    tag: 'Minimal',
    description: 'Clean cool-white surfaces with charcoal primary — editorial and minimal.',
    preview: { bg: '#f8f9fa', primary: '#1f2937', accent: '#6b7280' },
  },
  {
    id: 'arctic-white',
    name: 'Arctic White',
    tag: 'Minimal',
    description: 'Pure white with an icy blue-grey primary — crisp, luxury boutique feel.',
    preview: { bg: '#f8faff', primary: '#334155', accent: '#64748b' },
  },
  // ── Custom ────────────────────────────────────────────────
  {
    id: 'custom',
    name: 'Custom Theme',
    tag: 'Custom',
    description: 'Build your own palette with the colour picker below.',
    preview: { bg: '#fdf6ee', primary: '#7c3a1e', accent: '#c08030' },
  },
];

export const PALETTE_TAGS = ['All', 'Warm', 'Modern', 'Minimal', 'Custom'] as const;

interface ThemeCtx {
  theme: 'light' | 'dark';
  palette: PaletteId;
  customTheme: CustomTheme;
  toggleTheme: () => void;
  setPalette: (id: PaletteId) => void;
  setCustomTheme: (t: CustomTheme) => void;
  applyCustomCss: (t: CustomTheme) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: 'light',
  palette: 'rose-gold',
  customTheme: DEFAULT_CUSTOM,
  toggleTheme: () => {},
  setPalette: () => {},
  setCustomTheme: () => {},
  applyCustomCss: () => {},
});

/** Inject a <style> tag with overrides for the custom palette */
function injectCustomStyle(t: CustomTheme) {
  const id = 'es-custom-palette-style';
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  // Derive a slightly darker hover from primary (naive darken via opacity overlay)
  el.textContent = `
    [data-palette="custom"] {
      --color-bg: ${t.bg};
      --color-surface: color-mix(in oklch, ${t.bg} 85%, white);
      --color-surface-2: color-mix(in oklch, ${t.bg} 60%, white);
      --color-surface-offset: color-mix(in oklch, ${t.bg} 90%, ${t.primary} 10%);
      --color-border: color-mix(in oklch, ${t.primary} 18%, ${t.bg});
      --color-divider: color-mix(in oklch, ${t.primary} 12%, ${t.bg});
      --color-text: color-mix(in oklch, ${t.primary} 90%, black 60%);
      --color-text-muted: color-mix(in oklch, ${t.primary} 55%, ${t.bg});
      --color-text-faint: color-mix(in oklch, ${t.primary} 30%, ${t.bg});
      --color-text-inverse: color-mix(in oklch, ${t.bg} 95%, white);
      --color-primary: ${t.primary};
      --color-primary-hover: color-mix(in oklch, ${t.primary} 85%, black);
      --color-primary-highlight: color-mix(in oklch, ${t.primary} 15%, ${t.bg});
      --color-gold: ${t.accent};
      --color-gold-soft: color-mix(in oklch, ${t.accent} 15%, ${t.bg});
      --color-accent: ${t.accent};
      --color-accent-light: color-mix(in oklch, ${t.accent} 15%, ${t.bg});
    }
    [data-theme="dark"][data-palette="custom"] {
      --color-bg: color-mix(in oklch, ${t.primary} 20%, black);
      --color-surface: color-mix(in oklch, ${t.primary} 28%, black);
      --color-surface-2: color-mix(in oklch, ${t.primary} 35%, black);
      --color-surface-offset: color-mix(in oklch, ${t.primary} 40%, black);
      --color-border: color-mix(in oklch, ${t.primary} 50%, black);
      --color-divider: color-mix(in oklch, ${t.primary} 45%, black);
      --color-text: color-mix(in oklch, ${t.bg} 90%, white);
      --color-text-muted: color-mix(in oklch, ${t.bg} 65%, ${t.primary});
      --color-text-faint: color-mix(in oklch, ${t.bg} 40%, ${t.primary});
      --color-text-inverse: color-mix(in oklch, ${t.primary} 30%, black);
      --color-primary: color-mix(in oklch, ${t.primary} 70%, white);
      --color-primary-hover: color-mix(in oklch, ${t.primary} 85%, white);
      --color-primary-highlight: color-mix(in oklch, ${t.primary} 45%, black);
      --color-gold: color-mix(in oklch, ${t.accent} 80%, white);
      --color-gold-soft: color-mix(in oklch, ${t.accent} 25%, black);
      --color-accent: color-mix(in oklch, ${t.accent} 80%, white);
      --color-accent-light: color-mix(in oklch, ${t.accent} 25%, black);
    }
  `;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [palette, setPaletteState] = useState<PaletteId>('rose-gold');
  const [customTheme, setCustomThemeState] = useState<CustomTheme>(DEFAULT_CUSTOM);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('es-theme') as 'light' | 'dark' | null;
      const savedPalette = localStorage.getItem('es-palette') as PaletteId | null;
      const savedCustom = localStorage.getItem('es-custom-theme');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      const t = savedTheme ?? (systemDark ? 'dark' : 'light');
      const p = savedPalette ?? 'rose-gold';
      const c: CustomTheme = savedCustom ? JSON.parse(savedCustom) : DEFAULT_CUSTOM;

      setTheme(t);
      setPaletteState(p);
      setCustomThemeState(c);
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.setAttribute('data-palette', p);
      if (p === 'custom') injectCustomStyle(c);
    } catch {}
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('es-theme', next); } catch {}
      return next;
    });
  }, []);

  const setPalette = useCallback((id: PaletteId) => {
    setPaletteState(id);
    document.documentElement.setAttribute('data-palette', id);
    try { localStorage.setItem('es-palette', id); } catch {}
  }, []);

  const setCustomTheme = useCallback((t: CustomTheme) => {
    setCustomThemeState(t);
    try { localStorage.setItem('es-custom-theme', JSON.stringify(t)); } catch {}
  }, []);

  const applyCustomCss = useCallback((t: CustomTheme) => {
    injectCustomStyle(t);
  }, []);

  if (!mounted) return null;

  return (
    <Ctx.Provider value={{ theme, palette, customTheme, toggleTheme, setPalette, setCustomTheme, applyCustomCss }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
