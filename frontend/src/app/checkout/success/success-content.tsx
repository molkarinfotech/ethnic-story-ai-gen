'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatAUD } from '../../../lib/products';

type OrderItem = { id: string; name: string; quantity: number; price: number; size?: string };
type Order = {
  id?: string; created_at?: string; amount_aud: number; status?: string;
  items: OrderItem[]; customer_name?: string; customer_email?: string;
  customer_phone?: string;
  shipping_address?: { line1?: string; line2?: string; suburb?: string; state?: string; postcode?: string };
};

/** Decode the compact order snapshot embedded in the return URL by CheckoutForm. */
function decodeSnap(raw: string | null): Order | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(raw)));
    return {
      amount_aud: parsed.total,
      items: parsed.items ?? [],
      customer_name:  parsed.name,
      customer_email: parsed.email,
      customer_phone: parsed.phone,
      shipping_address: {
        line1:    parsed.line1,
        line2:    parsed.line2,
        suburb:   parsed.suburb,
        state:    parsed.state,
        postcode: parsed.postcode,
      },
    };
  } catch {
    return null;
  }
}

export function SuccessContent() {
  const params = useSearchParams();
  const paymentIntent = params.get('payment_intent');
  const snapRaw       = params.get('snap');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentIntent) { setLoading(false); return; }

    // Show snapshot immediately so the page never looks blank for guests.
    const snapOrder = decodeSnap(snapRaw);
    if (snapOrder) {
      setOrder(snapOrder);
      setLoading(false);
    }

    // Still poll the DB in the background — once the webhook fires the DB
    // row will appear and we upgrade to the full order (which has an id).
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch(`/api/order-by-intent?payment_intent=${paymentIntent}`);
        if (res.ok) {
          const dbOrder = await res.json();
          setOrder(dbOrder);
          setLoading(false);
          return;
        }
      } catch {}
      if (++attempts < 10) setTimeout(poll, 1500);
      else setLoading(false);
    };
    poll();
  }, [paymentIntent, snapRaw]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '2.5rem' }}>⌛</div>
      <p style={{ color: 'var(--color-text-muted)' }}>Confirming your order…</p>
    </div>
  );

  if (!order) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem' }}>Order placed!</h2>
      <p style={{ color: 'var(--color-text-muted)', marginTop: '.5rem', maxWidth: '38ch' }}>Your payment was successful. You'll receive a confirmation email shortly.</p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/account" className="btn btn-primary">View my orders</a>
        <a href="/collections" className="btn btn--outline">Continue shopping</a>
      </div>
    </div>
  );

  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
  const addr = order.shipping_address ?? {};

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem 2rem' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.25rem' }}>✓</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,1.2rem+1.5vw,2.25rem)', margin: 0 }}>Thank you{order.customer_name ? `, ${order.customer_name.split(' ')[0]}` : ''}!</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '.5rem' }}>Your order has been confirmed. Check your email for details.</p>
        {order.id && (
          <div style={{ display: 'inline-block', marginTop: '.75rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '.5rem', padding: '.4rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Order #{order.id.slice(0, 8).toUpperCase()}
          </div>
        )}
      </div>

      {/* Items */}
      <Section title="Items ordered">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {items.map((item, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem', background: 'var(--color-surface-offset)', borderRadius: '.75rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '.5rem', background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🧵</div>
              <div style={{ flex: 1 }}>
                <a href={`/products/${item.id}`} style={{ fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.9rem' }}>{item.name}</a>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '.15rem' }}>
                  {item.size && <span>Size: {item.size} &middot; </span>}Qty: {item.quantity}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{formatAUD(item.price * item.quantity)}</div>
            </li>
          ))}
        </ul>
        <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>Total paid</span>
          <span style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}>{formatAUD(order.amount_aud)}</span>
        </div>
      </Section>

      {/* Shipping */}
      {(addr.line1 || addr.suburb) && (
        <Section title="Shipping to">
          <div style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
            {order.customer_name && <div style={{ fontWeight: 600 }}>{order.customer_name}</div>}
            {addr.line1 && <div>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</div>}
            {(addr.suburb || addr.state || addr.postcode) && <div>{[addr.suburb, addr.state, addr.postcode].filter(Boolean).join(' ')}</div>}
            <div>Australia</div>
          </div>
        </Section>
      )}

      {/* Contact */}
      {(order.customer_email || order.customer_phone) && (
        <Section title="Contact">
          <div style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
            {order.customer_email && <div>📧 {order.customer_email}</div>}
            {order.customer_phone && <div>📞 {order.customer_phone}</div>}
          </div>
        </Section>
      )}

      {/* CTAs */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/account" className="btn btn-primary">View all my orders</a>
        <a href="/collections" className="btn btn--outline">Continue shopping</a>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', padding: '1.25rem 1.5rem', marginTop: '1rem' }}>
      <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)', margin: '0 0 .85rem' }}>{title}</h3>
      {children}
    </div>
  );
}
