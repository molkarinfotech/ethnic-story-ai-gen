'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart, itemKey } from '../../../context/CartContext';
import { formatAUD } from '../../../lib/products';

type OrderItem = { id: string; name: string; quantity: number; price: number; size?: string };
type Snap = {
  name: string; email: string; phone: string;
  line1: string; line2?: string; suburb: string; state: string; postcode: string;
  total: number; items: OrderItem[];
};

function SuccessContent() {
  const params      = useSearchParams();
  const router      = useRouter();
  const { removeItems, items: cartItems } = useCart();
  const [snap, setSnap] = useState<Snap | null>(null);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const raw = params.get('snap');
    if (!raw) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(raw))) as Snap;
      setSnap(decoded);
    } catch { /* malformed snap — show generic success */ }
  }, [params]);

  // Remove paid items from cart as soon as we know what they are
  useEffect(() => {
    if (!snap || cleared || cartItems.length === 0) return;
    const paidKeys = snap.items.map(i => itemKey(i.id, i.size));
    removeItems(paidKeys);
    setCleared(true);
  }, [snap, cleared, cartItems, removeItems]);

  const items: OrderItem[] = snap?.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = snap ? snap.total - subtotal : 0;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ background: 'white', borderRadius: '1.25rem', boxShadow: '0 4px 24px rgba(0,0,0,.08)', maxWidth: '600px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🎉</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Order confirmed!</h1>
        {snap?.name && (
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Thank you, <strong>{snap.name}</strong>.</p>
        )}
        {snap?.email && (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
            A confirmation has been sent to <strong>{snap.email}</strong>.
          </p>
        )}

        {items.length > 0 && (
          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>Items ordered</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {items.map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--color-surface-offset)', borderRadius: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {item.size && <span>Size: {item.size} · </span>}Qty: {item.quantity}
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>{formatAUD(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                <span>Subtotal</span><span>{formatAUD(subtotal)}</span>
              </div>
              {shipping > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  <span>Shipping</span><span>{formatAUD(shipping)}</span>
                </div>
              )}
              {shipping === 0 && snap && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                  <span>Shipping</span><span>Free</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                <span>Total paid</span><span>{snap ? formatAUD(snap.total) : ''}</span>
              </div>
            </div>
          </div>
        )}

        {snap && (snap.line1 || snap.suburb) && (
          <div style={{ textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.7 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Shipping to</div>
            {snap.name && <div style={{ fontWeight: 600 }}>{snap.name}</div>}
            {snap.line1 && <div>{snap.line1}{snap.line2 ? `, ${snap.line2}` : ''}</div>}
            <div>{[snap.suburb, snap.state, snap.postcode].filter(Boolean).join(' ')}</div>
            <div style={{ color: 'var(--color-text-muted)' }}>Australia</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <a
            href="/account"
            className="btn btn-primary"
            style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            View my orders
          </a>
          <a
            href="/collections"
            style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '0.7rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'background 180ms' }}>
            Continue shopping
          </a>
        </div>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Loading…</main>
    }>
      <SuccessContent />
    </Suspense>
  );
}
