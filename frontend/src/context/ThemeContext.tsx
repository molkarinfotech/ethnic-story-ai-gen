'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type PaletteId = 'rose-gold' | 'midnight-blue' | 'forest-green' | 'saffron' | 'monochrome';

export interface PaletteOption {
  id: PaletteId;
  name: string;
  description: string;
  preview: { bg: string; primary: string; accent: string };
}

export const PALETTES: PaletteOption[] = [
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    description: 'Warm blush tones with a deep crimson accent — the default Ethnic Story palette.',
    preview: { bg: '#f8f2ec', primary: '#6c2340', accent: '#b88332' },
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    description: 'Rich indigo surfaces with a sapphire primary and gold accent.',
    preview: { bg: '#f0f2f8', primary: '#1e3a8a', accent: '#b45309' },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Earthy sage surfaces with a deep emerald primary and warm clay accent.',
    preview: { bg: '#f0f4f0', primary: '#14532d', accent: '#92400e' },
  },
  {
    id: 'saffron',
    name: 'Saffron',
    description: 'Warm ivory surfaces with a bold saffron-orange primary — festive and vibrant.',
    preview: { bg: '#fdf8ef', primary: '#9a3412', accent: '#854d0e' },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Clean cool-white surfaces with a charcoal primary — minimal and editorial.',
    preview: { bg: '#f8f9fa', primary: '#1f2937', accent: '#6b7280' },
  },
];

interface ThemeCtx {
  theme: 'light' | 'dark';
  palette: PaletteId;
  toggleTheme: () => void;
  setPalette: (id: PaletteId) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: 'light',
  palette: 'rose-gold',
  toggleTheme: () => {},
  setPalette: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme]     = useState<'light' | 'dark'>('light');
  const [palette, setPaletteState] = useState<PaletteId>('rose-gold');
  const [mounted, setMounted] = useState(false);

  // On mount — read saved preferences
  useEffect(() => {
    try {
      const savedTheme   = localStorage.getItem('es-theme') as 'light' | 'dark' | null;
      const savedPalette = localStorage.getItem('es-palette') as PaletteId | null;
      const systemDark   = window.matchMedia('(prefers-color-scheme: dark)').matches;

      const t = savedTheme ?? (systemDark ? 'dark' : 'light');
      const p = savedPalette ?? 'rose-gold';

      setTheme(t);
      setPaletteState(p);
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.setAttribute('data-palette', p);
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

  if (!mounted) return null;

  return (
    <Ctx.Provider value={{ theme, palette, toggleTheme, setPalette }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
