'use client';
import { useEffect } from 'react';
import { useCart } from '../../../context/CartContext';

export function ClearCart() {
  const { clearCart } = useCart();
  useEffect(() => { clearCart(); }, [clearCart]);
  return null;
}
