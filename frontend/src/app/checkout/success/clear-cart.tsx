'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart, itemKey } from '../../../context/CartContext';

/**
 * Removes ONLY the items that were paid for from the cart.
 * The paid item keys are embedded in the `snap` URL param.
 * Falls back to clearing the entire cart if no snap is present.
 */
export function ClearCart() {
  const { removeItems, clearCart } = useCart();
  const params = useSearchParams();

  useEffect(() => {
    const snapRaw = params.get('snap');
    if (!snapRaw) {
      clearCart();
      return;
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(atob(snapRaw)));
      const paidKeys: string[] = (parsed.items ?? []).map(
        (i: { id: string; size?: string }) => itemKey(i.id, i.size)
      );
      if (paidKeys.length > 0) {
        removeItems(paidKeys);
      } else {
        clearCart();
      }
    } catch {
      clearCart();
    }
  }, [params, removeItems, clearCart]);

  return null;
}
