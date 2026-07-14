import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns & Exchanges — Ethnic Story',
  description: 'Our hassle-free returns and exchange policy for Ethnic Story orders. 14-day returns on eligible items.',
};

const CARD: React.CSSProperties = {
  background: 'white',
  borderRadius: '1rem',
  border: '1px solid #fce7f3',
  padding: '1.5rem',
  boxShadow: '0 1px 6px rgba(0,0,0,.05)',
};

export default function ReturnsPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset, #fdf8f5)' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0a10, #3d1020)',
        color: '#fff', textAlign: 'center',
        padding: 'clamp(3rem, 8vw, 5rem) 1.5rem',
      }}>
        <span style={{ fontSize: '.75rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e2a96c' }}>POLICY</span>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 800, margin: '.6rem 0 .75rem', color: '#fff' }}>Returns &amp; Exchanges</h1>
        <p style={{ color: 'rgba(255,255,255,.7)', maxWidth: '480px', margin: '0 auto', fontSize: '.95rem' }}>
          Not quite right? We offer hassle-free returns within 14 days of delivery.
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1rem 5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Quick summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            ['📅', '14 Days',        'Return window from delivery date'],
            ['💸', 'Full Refund',     'To original payment method'],
            ['🔄', 'Free Exchange',   'Swap size or colour once per order'],
            ['📦', 'Easy Process',    'Lodge online, we send a return label'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ ...CARD, textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '.4rem' }}>{icon}</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#9d174d', marginBottom: '.25rem' }}>{title}</div>
              <p style={{ fontSize: '.78rem', color: '#6b7280', margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Eligible items */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>✅ Eligible for Return</h2>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[
              'Item is unworn, unwashed, and in original condition',
              'All original tags and packaging are intact',
              'Returned within 14 days of the delivery date',
              'Item was purchased at full price (sale items — see below)',
            ].map(t => <li key={t} style={{ fontSize: '.875rem', color: '#374151', lineHeight: 1.6 }}>{t}</li>)}
          </ul>
        </div>

        {/* Not eligible */}
        <div style={{ ...CARD, border: '1.5px solid #fee2e2', background: '#fff5f5' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#b91c1c', marginBottom: '1rem' }}>❌ Not Eligible for Return</h2>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[
              'Sale or discounted items (final sale)',
              'Custom-made or personalised garments',
              'Accessories (jewellery, dupattas sold separately)',
              'Items that have been worn, washed, altered, or damaged',
              'Returns initiated after 14 days of delivery',
            ].map(t => <li key={t} style={{ fontSize: '.875rem', color: '#374151', lineHeight: 1.6 }}>{t}</li>)}
          </ul>
        </div>

        {/* How to return */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '1.25rem' }}>📋 How to Return or Exchange</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
            {[
              ['1', 'Start your return', 'Email us at hello@ethnicstory.com.au with your order number and reason for return. Include photos if the item is faulty.'],
              ['2', 'Receive your label', 'We will send you a prepaid return label within 1 business day for exchanges or faulty items. For change-of-mind returns, a $7.95 return shipping fee applies.'],
              ['3', 'Pack & post', 'Pack the item securely in its original packaging (if possible) and drop it at any Australia Post outlet.'],
              ['4', 'Refund or exchange processed', 'Once we receive and inspect the item (1–2 business days), your refund will be issued or your exchange dispatched within 3 business days.'],
            ].map(([num, title, desc]) => (
              <div key={num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#9d174d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.85rem', flexShrink: 0 }}>{num}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827' }}>{title}</div>
                  <p style={{ fontSize: '.82rem', color: '#6b7280', margin: '.2rem 0 0', lineHeight: 1.65 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Refund timeline */}
        <div style={{ ...CARD, background: '#fdf2f8', border: '1.5px solid #fce7f3' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#9d174d', marginBottom: '.6rem' }}>⏱ Refund Timeline</h2>
          <p style={{ fontSize: '.875rem', color: '#4b5563', lineHeight: 1.7, margin: '0 0 .75rem' }}>
            Refunds are returned to your original payment method:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {[
              'Credit / debit card: 3–5 business days after approval',
              'PayPal: 1–3 business days after approval',
              'Afterpay / Zip: varies by provider (usually 5–7 business days)',
            ].map(t => <li key={t} style={{ fontSize: '.83rem', color: '#374151' }}>{t}</li>)}
          </ul>
        </div>

        {/* Faulty items */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '.75rem' }}>⚠️ Faulty or Incorrect Items</h2>
          <p style={{ fontSize: '.875rem', color: '#4b5563', lineHeight: 1.7, margin: 0 }}>
            If you receive a faulty, damaged, or incorrect item, we will cover all return shipping costs and send
            a replacement immediately (or issue a full refund if out of stock). Please email us within{' '}
            <strong>48 hours of delivery</strong> with photos and your order number.
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '.875rem', marginBottom: '1rem' }}>Have a question about your return?</p>
          <a href="mailto:hello@ethnicstory.com.au" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: '#9d174d', color: '#fff', padding: '.65rem 1.5rem', borderRadius: '.6rem', fontWeight: 700, fontSize: '.875rem', textDecoration: 'none' }}>✉️ Contact Us</a>
        </div>
      </div>
    </main>
  );
}
