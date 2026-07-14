import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Information — Ethnic Story',
  description: 'Learn about our shipping rates, delivery timeframes, and order tracking for Ethnic Story orders across Australia.',
};

const CARD: React.CSSProperties = {
  background: 'white',
  borderRadius: '1rem',
  border: '1px solid #fce7f3',
  padding: '1.5rem',
  boxShadow: '0 1px 6px rgba(0,0,0,.05)',
};

const TH: React.CSSProperties = {
  background: '#fdf2f8',
  color: '#9d174d',
  fontWeight: 700,
  fontSize: '.78rem',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  padding: '.6rem .9rem',
  textAlign: 'left' as const,
  whiteSpace: 'nowrap' as const,
};

const TD: React.CSSProperties = {
  padding: '.65rem .9rem',
  fontSize: '.85rem',
  borderBottom: '1px solid #fce7f3',
  color: '#374151',
};

export default function ShippingPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset, #fdf8f5)' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0a10, #3d1020)',
        color: '#fff', textAlign: 'center',
        padding: 'clamp(3rem, 8vw, 5rem) 1.5rem',
      }}>
        <span style={{ fontSize: '.75rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e2a96c' }}>DELIVERY</span>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 800, margin: '.6rem 0 .75rem', color: '#fff' }}>Shipping Information</h1>
        <p style={{ color: 'rgba(255,255,255,.7)', maxWidth: '480px', margin: '0 auto', fontSize: '.95rem' }}>
          We ship Australia-wide. Free standard shipping on orders over $150 AUD.
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1rem 5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Rates table */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>🚚 Shipping Rates</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
              <thead>
                <tr>{['Method', 'Estimated Delivery', 'Cost'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {[
                  ['Standard Shipping', '5–8 business days', '$9.95 AUD'],
                  ['Express Shipping',  '2–3 business days', '$14.95 AUD'],
                  ['Free Standard',     '5–8 business days', 'FREE on orders $150+'],
                ].map(([m, d, c]) => (
                  <tr key={m}>
                    <td style={TD}><strong>{m}</strong></td>
                    <td style={TD}>{d}</td>
                    <td style={{ ...TD, color: c.includes('FREE') ? '#16a34a' : '#374151', fontWeight: c.includes('FREE') ? 700 : 400 }}>{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '.78rem', color: '#9ca3af', marginTop: '.75rem' }}>* Delivery estimates are from dispatch date and apply to metro areas. Regional/remote locations may take 1–3 additional business days.</p>
        </div>

        {/* Process */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '1.25rem' }}>📦 How It Works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
            {[
              ['1', 'Order Placed', 'You receive a confirmation email with your order summary immediately.'],
              ['2', 'Processing',   'We carefully quality-check and pack your garments within 1–2 business days.'],
              ['3', 'Dispatched',   'Your order is handed to Australia Post or a courier. You receive a tracking number by email.'],
              ['4', 'Delivered',    'Your package arrives. If you&apos;re not home, a card is left for redelivery or collection.'],
            ].map(([num, title, desc]) => (
              <div key={num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#9d174d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.85rem', flexShrink: 0 }}>{num}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827' }}>{title}</div>
                  <p style={{ fontSize: '.82rem', color: '#6b7280', margin: '.2rem 0 0' }} dangerouslySetInnerHTML={{ __html: desc }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tracking */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '.75rem' }}>🔍 Tracking Your Order</h2>
          <p style={{ fontSize: '.875rem', color: '#4b5563', lineHeight: 1.7, margin: 0 }}>
            Once your order is dispatched, you will receive an email containing your tracking number.
            You can use this number on the{' '}
            <a href="https://auspost.com.au/mypost/track" target="_blank" rel="noopener noreferrer" style={{ color: '#9d174d', fontWeight: 600 }}>Australia Post tracking page</a>
            {' '}or your courier&apos;s website. You can also view order status in your{' '}
            <a href="/account" style={{ color: '#9d174d', fontWeight: 600 }}>account dashboard</a>.
          </p>
        </div>

        {/* International */}
        <div style={{ ...CARD, background: '#fdf2f8', border: '1.5px solid #fce7f3' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#9d174d', marginBottom: '.6rem' }}>🌏 International Shipping</h2>
          <p style={{ fontSize: '.875rem', color: '#4b5563', lineHeight: 1.7, margin: 0 }}>
            We currently ship within Australia only. International shipping is coming soon —
            <a href="mailto:hello@ethnicstory.com.au" style={{ color: '#9d174d', fontWeight: 600 }}> contact us</a> if
            you need a custom quote for a specific destination.
          </p>
        </div>

        {/* FAQ */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>❓ Common Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              ['Can I change my delivery address after ordering?', 'Contact us within 2 hours of placing your order and we will do our best to update the address before dispatch.'],
              ['My order hasn\'t arrived — what do I do?', 'Check your tracking number first. If there is no update for more than 5 business days, email us at hello@ethnicstory.com.au and we will investigate.'],
              ['Do you ship to PO Boxes?', 'Yes, we ship to PO Boxes via Australia Post standard shipping only.'],
            ].map(([q, a]) => (
              <div key={q}>
                <div style={{ fontWeight: 700, fontSize: '.875rem', color: '#111827', marginBottom: '.3rem' }}>{q}</div>
                <p style={{ fontSize: '.82rem', color: '#6b7280', margin: 0, lineHeight: 1.65 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <a href="mailto:hello@ethnicstory.com.au" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: '#9d174d', color: '#fff', padding: '.65rem 1.5rem', borderRadius: '.6rem', fontWeight: 700, fontSize: '.875rem', textDecoration: 'none' }}>✉️ Contact Support</a>
        </div>
      </div>
    </main>
  );
}
