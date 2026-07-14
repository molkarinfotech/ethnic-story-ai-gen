import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sizing Guide — Ethnic Story',
  description: 'Find your perfect fit with our comprehensive Indian ethnic wear sizing guide for sarees, lehengas, kurtas and kids wear.',
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
  padding: '.6rem .9rem',
  fontSize: '.85rem',
  borderBottom: '1px solid #fce7f3',
  color: '#374151',
};

export default function SizingGuidePage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset, #fdf8f5)' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0a10, #3d1020)',
        color: '#fff', textAlign: 'center',
        padding: 'clamp(3rem, 8vw, 5rem) 1.5rem',
      }}>
        <span style={{ fontSize: '.75rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e2a96c' }}>FIT GUIDE</span>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 800, margin: '.6rem 0 .75rem', color: '#fff' }}>Sizing Guide</h1>
        <p style={{ color: 'rgba(255,255,255,.7)', maxWidth: '480px', margin: '0 auto', fontSize: '.95rem' }}>
          Every garment is cut true-to-size. Use the measurements below to find your perfect fit.
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1rem 5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* How to measure */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>📏 How to Measure Yourself</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {[
              ['Bust / Chest', 'Measure around the fullest part of your chest, keeping the tape parallel to the floor.'],
              ['Waist', 'Measure around your natural waistline — the narrowest part of your torso.'],
              ['Hips', 'Stand with feet together and measure around the fullest part of your hips.'],
              ['Length', 'Measure from your natural waist down to where you want the garment to end.'],
            ].map(([title, desc]) => (
              <div key={title} style={{ background: '#fdf2f8', borderRadius: '.75rem', padding: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#9d174d', marginBottom: '.35rem' }}>{title}</div>
                <p style={{ fontSize: '.8rem', color: '#4b5563', margin: 0, lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sarees */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>🥻 Sarees — Blouse Sizing</h2>
          <p style={{ fontSize: '.83rem', color: '#6b7280', marginBottom: '1rem' }}>Sarees are one-size (5.5m to 6m fabric). Use this table for the accompanying blouse.</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
              <thead>
                <tr>{['Size', 'Bust (cm)', 'Waist (cm)', 'Shoulder (cm)'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {[['XS','80–82','64–66','35'],['S','84–86','68–70','36'],['M','88–90','72–74','37'],['L','92–96','76–80','38.5'],['XL','100–104','84–88','40'],['XXL','108–112','92–96','41.5']]
                  .map(([s,b,w,sh]) => (
                    <tr key={s}><td style={TD}><strong>{s}</strong></td><td style={TD}>{b}</td><td style={TD}>{w}</td><td style={TD}>{sh}</td></tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lehengas */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>👗 Lehengas</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr>{['Size', 'Bust (cm)', 'Waist (cm)', 'Hips (cm)', 'Skirt Length (cm)'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {[['XS','80–82','62–64','88–90','40'],['S','84–86','66–68','92–94','40'],['M','88–90','70–72','96–98','42'],['L','92–96','74–78','100–104','42'],['XL','100–104','82–86','108–112','44'],['XXL','108–112','90–94','116–120','44']]
                  .map(([s,b,w,h,l]) => (
                    <tr key={s}><td style={TD}><strong>{s}</strong></td><td style={TD}>{b}</td><td style={TD}>{w}</td><td style={TD}>{h}</td><td style={TD}>{l}</td></tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kurtas */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>👘 Kurtas (Women & Men)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr>{['Size', 'Chest (cm)', 'Waist (cm)', 'Hip (cm)', 'Length (cm)'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {[['XS','80','66','86','38'],['S','84','70','90','39'],['M','88','74','94','40'],['L','94','80','100','42'],['XL','100','86','106','43'],['XXL','106','92','112','44'],['3XL','112','98','118','45']]
                  .map(([s,c,w,h,l]) => (
                    <tr key={s}><td style={TD}><strong>{s}</strong></td><td style={TD}>{c}</td><td style={TD}>{w}</td><td style={TD}>{h}</td><td style={TD}>{l}</td></tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kids */}
        <div style={CARD}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>🎠 Kids Wear</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
              <thead>
                <tr>{['Age / Size', 'Height (cm)', 'Chest (cm)', 'Waist (cm)'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {[['2–3 Y','92–98','52–54','51–53'],['3–4 Y','98–104','54–56','52–54'],['4–5 Y','104–110','56–58','53–55'],['5–6 Y','110–116','58–61','54–57'],['6–7 Y','116–122','61–64','56–59'],['7–8 Y','122–128','64–67','58–61'],['8–9 Y','128–134','67–70','60–63'],['9–10 Y','134–140','70–73','62–65']]
                  .map(([a,h,c,w]) => (
                    <tr key={a}><td style={TD}><strong>{a}</strong></td><td style={TD}>{h}</td><td style={TD}>{c}</td><td style={TD}>{w}</td></tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tips */}
        <div style={{ ...CARD, background: '#fdf2f8', border: '1.5px solid #fce7f3' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#9d174d', marginBottom: '.75rem' }}>💡 Fit Tips</h2>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[
              'All measurements are in centimetres (cm). Use a soft measuring tape.',
              'If you fall between two sizes, size up for comfort.',
              'Embroidered and heavily embellished garments may have slightly less stretch — check the product notes.',
              'Custom sizing is available on select items — contact us before ordering.',
            ].map(t => <li key={t} style={{ fontSize: '.85rem', color: '#4b5563', lineHeight: 1.6 }}>{t}</li>)}
          </ul>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', paddingTop: '.5rem' }}>
          <p style={{ color: '#6b7280', fontSize: '.875rem', marginBottom: '1rem' }}>Still unsure? We&apos;re happy to help.</p>
          <a href="mailto:hello@ethnicstory.com.au" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: '#9d174d', color: '#fff', padding: '.65rem 1.5rem', borderRadius: '.6rem', fontWeight: 700, fontSize: '.875rem', textDecoration: 'none' }}>✉️ Contact Us</a>
        </div>
      </div>
    </main>
  );
}
