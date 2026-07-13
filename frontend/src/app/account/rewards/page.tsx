import RewardsWidget from '../../../components/RewardsWidget';

export const metadata = { title: 'My Rewards — Ethnic Story' };

export default function RewardsPage() {
  return (
    <main style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #ede9fe 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 480, marginBottom: '1.5rem' }}>
        <h1 style={{
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: 800,
          color: '#111',
          marginBottom: '.25rem',
        }}>🌟 My Rewards</h1>
        <p style={{ color: '#6b7280', fontSize: '.9rem' }}>
          Earn points for every interaction. Redeem for discounts at checkout.
        </p>
      </div>
      <RewardsWidget />
      <div style={{ width: '100%', maxWidth: 480, marginTop: '1.5rem' }}>
        <div style={{
          background: '#fff',
          borderRadius: '1rem',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,.06)',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.75rem' }}>How to earn</h2>
          <table style={{ width: '100%', fontSize: '.875rem', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['🆕 Sign up', '50 pts', 'One-time welcome bonus'],
                ['🛍️ Place an order', '1 pt / AU$1', 'Automatically awarded on payment'],
                ['❤️ Like a product', '10 pts', 'Per product, once each'],
                ['⭐ Write a review', '10 pts', '25 pts if you bought it'],
                ['🎁 Redeem', '200+ pts', '80 pts = $1.00 AU discount'],
              ].map(([action, pts, desc], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '.5rem 0', fontWeight: 600 }}>{action}</td>
                  <td style={{ padding: '.5rem', color: '#059669', fontWeight: 700, whiteSpace: 'nowrap' }}>{pts}</td>
                  <td style={{ padding: '.5rem 0', color: '#6b7280', fontSize: '.8rem' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
