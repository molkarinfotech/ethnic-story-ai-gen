'use client';
import { createContext, useContext, useEffect, useReducer, useCallback, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Product } from '../lib/products';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type CartItem = Product & { quantity: number; selectedSize?: string };

type CartState = { items: CartItem[]; isOpen: boolean };

type CartAction =
  | { type: 'ADD';     product: Product }
  | { type: 'REMOVE';  id: string; size?: string }
  | { type: 'UPDATE';  id: string; size?: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'HYDRATE'; items: CartItem[] };

// key = id + size so same product in different sizes are separate line items
function itemKey(id: string, size?: string) { return size ? `${id}__${size}` : id; }
function matchItem(i: CartItem, id: string, size?: string) {
  return i.id === id && (i as any).selectedSize === (size ?? undefined);
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE': return { ...state, items: action.items };
    case 'ADD': {
      const p = action.product as CartItem;
      const existing = state.items.find(i => matchItem(i, p.id, p.selectedSize));
      const items = existing
        ? state.items.map(i => matchItem(i, p.id, p.selectedSize) ? { ...i, quantity: i.quantity + 1 } : i)
        : [...state.items, { ...p, quantity: 1 }];
      return { ...state, items, isOpen: true };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => !matchItem(i, action.id, action.size)) };
    case 'UPDATE': {
      if (action.quantity < 1) return { ...state, items: state.items.filter(i => !matchItem(i, action.id, action.size)) };
      return { ...state, items: state.items.map(i => matchItem(i, action.id, action.size) ? { ...i, quantity: action.quantity } : i) };
    }
    case 'CLEAR':  return { ...state, items: [] };
    case 'OPEN':   return { ...state, isOpen: true };
    case 'CLOSE':  return { ...state, isOpen: false };
    default: return state;
  }
}

type CartContextType = {
  items: CartItem[];
  isOpen: boolean;
  hydrated: boolean;
  totalItems: number;
  totalPrice: number;
  addItem: (product: Product) => void;
  removeItem: (id: string, size?: string) => void;
  updateQuantity: (id: string, size?: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const LOCAL_KEY = 'ethnic-story-cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false });
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────
  function readLocal(): CartItem[] {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]'); } catch { return []; }
  }
  function writeLocal(items: CartItem[]) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(items)); } catch {}
  }
  function clearLocal() {
    try { localStorage.removeItem(LOCAL_KEY); } catch {}
  }

  // Merge two carts: prefer higher quantity for same item
  function mergeItems(a: CartItem[], b: CartItem[]): CartItem[] {
    const map = new Map<string, CartItem>();
    [...a, ...b].forEach(item => {
      const k = itemKey(item.id, item.selectedSize);
      const existing = map.get(k);
      map.set(k, existing ? { ...item, quantity: Math.max(existing.quantity, item.quantity) } : item);
    });
    return Array.from(map.values());
  }

  async function loadFromSupabase(uid: string): Promise<CartItem[]> {
    const { data } = await sb.from('carts').select('items').eq('user_id', uid).single();
    if (!data) return [];
    try { return Array.isArray(data.items) ? data.items : JSON.parse(data.items as string); } catch { return []; }
  }

  async function saveToSupabase(uid: string, items: CartItem[]) {
    await sb.from('carts').upsert({ user_id: uid, items, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  }

  // ── auth listener: merge local + remote on login, save + clear on logout ─
  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const local = readLocal();
        const remote = await loadFromSupabase(uid);
        const merged = mergeItems(remote, local);
        dispatch({ type: 'HYDRATE', items: merged });
        await saveToSupabase(uid, merged);
        clearLocal();
      } else {
        const local = readLocal();
        dispatch({ type: 'HYDRATE', items: local });
      }
      setHydrated(true);
    });

    const { data: listener } = sb.auth.onAuthStateChange(async (event, session) => {
      const uid = session?.user?.id ?? null;
      if (event === 'SIGNED_IN' && uid) {
        setUserId(uid);
        const local = readLocal();
        const remote = await loadFromSupabase(uid);
        const merged = mergeItems(remote, local);
        dispatch({ type: 'HYDRATE', items: merged });
        await saveToSupabase(uid, merged);
        clearLocal();
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        dispatch({ type: 'CLEAR' });
        clearLocal();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── sync cart changes to Supabase (debounced 600ms) or localStorage ──────
  useEffect(() => {
    if (!hydrated) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      if (userId) {
        saveToSupabase(userId, state.items);
      } else {
        writeLocal(state.items);
      }
    }, 600);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [state.items, hydrated, userId]);

  const addItem        = useCallback((product: Product) => dispatch({ type: 'ADD', product }), []);
  const removeItem     = useCallback((id: string, size?: string) => dispatch({ type: 'REMOVE', id, size }), []);
  const updateQuantity = useCallback((id: string, size?: string, quantity: number = 1) => dispatch({ type: 'UPDATE', id, size, quantity }), []);
  const clearCart      = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const openCart       = useCallback(() => dispatch({ type: 'OPEN' }), []);
  const closeCart      = useCallback(() => dispatch({ type: 'CLOSE' }), []);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = state.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items: state.items, isOpen: state.isOpen, hydrated,
      totalItems, totalPrice,
      addItem, removeItem, updateQuantity, clearCart, openCart, closeCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
