'use client';
import { useEffect } from 'react';
import { useCart } from '../../../context/CartContext';

// Tiny client component — clears the cart after successful payment
export function ClearCart() {
  const { clearCart } = useCart();
  useEffect(() => { clearCart(); }, [clearCart]);
  return null;
}
