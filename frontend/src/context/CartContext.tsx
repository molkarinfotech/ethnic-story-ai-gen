'use client';
import { createContext, useContext, useEffect, useReducer, useCallback, useState, useRef } from 'react';
import { supabase as sb } from '../lib/supabase';
import { Product } from '../lib/products';

export type CartItem = Product & { quantity: number; selectedSize?: string };

type CartState = { items: CartItem[]; isOpen: boolean };

type CartAction =
  | { type: 'ADD';          product: Product }
  | { type: 'REMOVE';       id: string; size: string | undefined }
  | { type: 'REMOVE_KEYS';  keys: string[] }  // remove a specific subset by "id__size" key
  | { type: 'UPDATE';       id: string; size: string | undefined; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'HYDRATE';      items: CartItem[] };

export function itemKey(id: string, size: string | undefined) { return size ? `${id}__${size}` : id; }
function matchItem(i: CartItem, id: string, size: string | undefined) {
  return i.id === id && i.selectedSize === size;
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
    case 'REMOVE_KEYS': {
      const keySet = new Set(action.keys);
      return { ...state, items: state.items.filter(i => !keySet.has(itemKey(i.id, i.selectedSize))) };
    }
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
  removeItem:     (id: string, size: string | undefined) => void;
  removeItems:    (keys: string[]) => void;
  updateQuantity: (id: string, size: string | undefined, quantity: number) => void;
  clearCart: () => void;
  openCart:  () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const LOCAL_KEY = 'ethnic-story-cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false });
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function readLocal(): CartItem[] {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]'); } catch { return []; }
  }
  function writeLocal(items: CartItem[]) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(items)); } catch {}
  }
  function clearLocal() {
    try { localStorage.removeItem(LOCAL_KEY); } catch {}
  }

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

  useEffect(() => { userIdRef.current = userId; }, [userId]);

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      userIdRef.current = uid;
      if (uid) {
        const local = readLocal();
        const remote = await loadFromSupabase(uid);
        const merged = mergeItems(remote, local);
        dispatch({ type: 'HYDRATE', items: merged });
        await saveToSupabase(uid, merged);
        clearLocal();
      } else {
        dispatch({ type: 'HYDRATE', items: readLocal() });
      }
      setHydrated(true);
    });

    const { data: listener } = sb.auth.onAuthStateChange(async (event, session) => {
      const uid = session?.user?.id ?? null;
      if (event === 'SIGNED_IN' && uid) {
        setUserId(uid);
        userIdRef.current = uid;
        const local = readLocal();
        const remote = await loadFromSupabase(uid);
        const merged = mergeItems(remote, local);
        dispatch({ type: 'HYDRATE', items: merged });
        await saveToSupabase(uid, merged);
        clearLocal();
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        userIdRef.current = null;
        dispatch({ type: 'CLEAR' });
        clearLocal();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      if (userId) saveToSupabase(userId, state.items);
      else writeLocal(state.items);
    }, 600);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [state.items, hydrated, userId]);

  const addItem        = useCallback((product: Product) => dispatch({ type: 'ADD', product }), []);
  const removeItem     = useCallback((id: string, size: string | undefined) => dispatch({ type: 'REMOVE', id, size }), []);

  // Remove only the paid subset — bypasses debounce so Supabase is updated immediately
  const removeItems = useCallback((keys: string[]) => {
    dispatch({ type: 'REMOVE_KEYS', keys });
    if (syncTimer.current) clearTimeout(syncTimer.current);
    // Persist happens via the useEffect above on next render after state update
  }, []);

  const updateQuantity = useCallback((id: string, size: string | undefined, quantity: number) => dispatch({ type: 'UPDATE', id, size, quantity }), []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    if (syncTimer.current) clearTimeout(syncTimer.current);
    const uid = userIdRef.current;
    if (uid) saveToSupabase(uid, []);
    else { try { localStorage.removeItem(LOCAL_KEY); } catch {} }
  }, []);

  const openCart  = useCallback(() => dispatch({ type: 'OPEN' }), []);
  const closeCart = useCallback(() => dispatch({ type: 'CLOSE' }), []);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = state.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items: state.items, isOpen: state.isOpen, hydrated,
      totalItems, totalPrice,
      addItem, removeItem, removeItems, updateQuantity, clearCart, openCart, closeCart,
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
