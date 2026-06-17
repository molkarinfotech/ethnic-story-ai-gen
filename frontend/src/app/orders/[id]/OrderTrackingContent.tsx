'use client';
import { useEffect, useState } from 'react';
import { formatAUD } from '../../../lib/products';

type OrderItem = { id: string; name: string; quantity: number; price: number; size?: string };
type Order = {
  id: string;
  created_at: string;
  status: string;            // pending | processing | shipped | delivered | cancelled
  payment_method?: string;
  amount_aud: number;
  shipping_cost?: number;
  items: OrderItem[];
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  tracking_number?: string;
  shipping_carrier?: string;
  shipping_address?: { line1?: string; line2?: string; suburb?: string; state?: string; postcode?: string };
};

const STEPS = [
  { key: 'pending',    label: 'Order Placed',  icon: '📝' },
  { key: 'processing', label: 'Processing',    icon: '⚙️' },
  { key: 'shipped',    label: 'Shipped',        icon: '🚚' },
  { key: 'delivered',  label: 'Delivered',      icon: '✅' },
];

const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered'];

const PAYMENT_LABELS: Record<string, string> = {
  card:   '💳 Card',
  cash:   '💵 Cash on Delivery',
  eftpos: '🏧 EFTPOS',
  payid:  '📲 PayID / Bank Transfer',
};

function StatusStepper({ status }: { status: string }) {
  const currentIdx = STATUS_ORDER.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, margin: '2rem 0', overflowX: 'auto' }}>
      {STEPS.map((step, idx) => {
        const done    = idx < currentIdx;
        const active  = idx === currentIdx;
        const pending = idx > currentIdx;
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: done ? '#16a34a' : active ? '#9d174d' : '#f3f4f6',
                border: active ? '3px solid #9d174d' : done ? '3px solid #16a34a' : '3px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, transition: 'all .3s',
                boxShadow: active ? '0 0 0 4px rgba(157,23,77,0.15)' : 'none',
              }}>
                {done ? '✔️' : step.icon}
              </div>
              <div style={{
                marginTop: 8, fontSize: 11, fontWeight: active ? 700 : 500,
                color: active ? '#9d174d' : done ? '#16a34a' : '#9ca3af',
                textAlign: 'center', letterSpacing: '.03em',
              }}>{step.label}</div>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{
                height: 3, flex: 1, maxWidth: 60,
                background: done || (active && idx < currentIdx) ? '#16a34a' : '#e5e7eb',
                marginBottom: 20, borderRadius: 2, transition: 'background .3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function OrderTrackingContent({ orderId }: { orderId: string }) {
  const [order, setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setOrder(data); setLoading(false); })
      .catch(code => {
        setError(code === 404 ? 'Order not found. Please check your order confirmation email.' : 'Could not load order details. Please try again.');
        setLoading(false);
      });
  }, [orderId]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-muted)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
      Loading order details…
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '4rem 1rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
      <h2 style={{ fontSize: '1.3rem', marginBottom: '.5rem' }}>Order not found</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{error}</p>
      <a href="/account" className="btn btn-primary">View my account</a>
    </div>
  );

  if (!order) return null;

  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
  const addr = order.shipping_address ?? {};
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = order.shipping_cost ?? (order.amount_aud - subtotal > 0 ? order.amount_aud - subtotal : 0);
  const isCancelled = order.status === 'cancelled';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1rem 1rem 4rem' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '2rem 1rem 1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.3rem,1rem+1.5vw,2rem)', margin: '0 0 .35rem' }}>
          Order #{order.id.slice(0, 8).toUpperCase()}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '.9rem', margin: 0 }}>
          Placed on {new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        {isCancelled && (
          <div style={{ display: 'inline-block', marginTop: '.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '.5rem', padding: '.4rem 1rem', fontWeight: 700, fontSize: '.85rem' }}>
            Cancelled
          </div>
        )}
      </div>

      {/* Stepper */}
      {!isCancelled && <StatusStepper status={order.status} />}

      {/* Tracking number */}
      {order.tracking_number && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '.75rem', padding: '1rem 1.5rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '1.5rem' }}>📦</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Tracking number</div>
            <div style={{ fontFamily: 'monospace', fontSize: '.9rem', color: '#16a34a', marginTop: '.2rem' }}>
              {order.shipping_carrier && <span style={{ fontFamily: 'inherit', fontWeight: 700, marginRight: '.5rem' }}>{order.shipping_carrier}</span>}
              {order.tracking_number}
            </div>
          </div>
        </div>
      )}

      {/* Invoice */}
      <Card title="Invoice">
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', paddingBottom: 8 }}>Item</th>
              <th style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', paddingBottom: 8 }}>Qty</th>
              <th style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', paddingBottom: 8 }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 0', fontSize: '.9rem' }}>
                  <a href={`/products/${item.id}`} style={{ fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none' }}>{item.name}</a>
                  {item.size && <div style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Size: {item.size}</div>}
                </td>
                <td style={{ textAlign: 'center', fontSize: '.9rem', color: 'var(--color-text-muted)', padding: '10px 0' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '.9rem', padding: '10px 0', color: '#9d174d' }}>{formatAUD(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ paddingTop: 12, fontSize: '.85rem', color: 'var(--color-text-muted)' }}>Subtotal</td>
              <td style={{ paddingTop: 12, textAlign: 'right', fontSize: '.85rem', color: 'var(--color-text-muted)' }}>{formatAUD(subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ paddingTop: 4, fontSize: '.85rem', color: 'var(--color-text-muted)' }}>Shipping</td>
              <td style={{ paddingTop: 4, textAlign: 'right', fontSize: '.85rem', color: shippingCost === 0 ? '#16a34a' : 'var(--color-text-muted)', fontWeight: shippingCost === 0 ? 700 : 400 }}>
                {shippingCost === 0 ? 'FREE' : formatAUD(shippingCost)}
              </td>
            </tr>
            <tr style={{ borderTop: '2px solid var(--color-border)' }}>
              <td colSpan={2} style={{ paddingTop: 12, fontWeight: 700 }}>Total (AUD)</td>
              <td style={{ paddingTop: 12, textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: '#9d174d' }}>{formatAUD(order.amount_aud)}</td>
            </tr>
            {order.payment_method && (
              <tr>
                <td colSpan={2} style={{ paddingTop: 6, fontSize: '.78rem', color: 'var(--color-text-muted)' }}>Payment</td>
                <td style={{ paddingTop: 6, textAlign: 'right', fontSize: '.78rem', color: 'var(--color-text-muted)' }}>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </Card>

      {/* Shipping address */}
      {(addr.line1 || addr.suburb) && (
        <Card title="Shipping to">
          <div style={{ fontSize: '.9rem', lineHeight: 1.7 }}>
            {order.customer_name && <div style={{ fontWeight: 600 }}>{order.customer_name}</div>}
            {addr.line1 && <div>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</div>}
            {(addr.suburb || addr.state || addr.postcode) && (
              <div>{[addr.suburb, addr.state, addr.postcode].filter(Boolean).join(' ')}</div>
            )}
            <div>Australia</div>
          </div>
        </Card>
      )}

      {/* CTAs */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/collections" className="btn btn-primary">Continue shopping</a>
        <a href="/account" className="btn btn--outline">My account</a>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: '.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', padding: '1.25rem 1.5rem', marginTop: '1rem' }}>
      <h3 style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)', margin: '0 0 .85rem' }}>{title}</h3>
      {children}
    </div>
  );
}
