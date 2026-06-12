'use client';
import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { Product } from '../lib/products';

// ── Types ──
export type CartItem = Product & { quantity: number };

type CartState = { items: CartItem[]; isOpen: boolean };

type CartAction =
  | { type: 'ADD';     product: Product }
  | { type: 'REMOVE';  id: string }
  | { type: 'UPDATE';  id: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'HYDRATE'; items: CartItem[] };

// ── Reducer ──
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: action.items };
    case 'ADD': {
      const existing = state.items.find(i => i.id === action.product.id);
      const items = existing
        ? state.items.map(i => i.id === action.product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...state.items, { ...action.product, quantity: 1 }];
      return { ...state, items, isOpen: true };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case 'UPDATE': {
      if (action.quantity < 1) return { ...state, items: state.items.filter(i => i.id !== action.id) };
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, quantity: action.quantity } : i) };
    }
    case 'CLEAR':  return { ...state, items: [] };
    case 'OPEN':   return { ...state, isOpen: true };
    case 'CLOSE':  return { ...state, isOpen: false };
    default: return state;
  }
}

// ── Context ──
type CartContextType = {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  totalPrice: number;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'vastra-cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false });

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) dispatch({ type: 'HYDRATE', items: JSON.parse(stored) });
    } catch {}
  }, []);

  // Persist to localStorage whenever items change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); } catch {}
  }, [state.items]);

  const addItem     = useCallback((product: Product) => dispatch({ type: 'ADD', product }), []);
  const removeItem  = useCallback((id: string) => dispatch({ type: 'REMOVE', id }), []);
  const updateQuantity = useCallback((id: string, quantity: number) => dispatch({ type: 'UPDATE', id, quantity }), []);
  const clearCart   = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const openCart    = useCallback(() => dispatch({ type: 'OPEN' }), []);
  const closeCart   = useCallback(() => dispatch({ type: 'CLOSE' }), []);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = state.items.reduce((s, i) => s + i.priceInr * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items: state.items, isOpen: state.isOpen, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart, openCart, closeCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
