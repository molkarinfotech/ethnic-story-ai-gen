'use client';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/admin/login';

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  }

  const navItems = [
    { href: '/admin',          label: 'Dashboard',  icon: '📊' },
    { href: '/admin/orders',   label: 'Orders',     icon: '📦' },
    { href: '/admin/checkout', label: 'Checkout',   icon: '🛒' },
    { href: '/admin/categories', label: 'Categories', icon: '🏷️' },
    { href: '/admin/scan',     label: 'Scan',       icon: '📷' },
    { href: '/admin/import',   label: 'Import',     icon: '📥' },
  ];

  if (isLoginPage) return <>{children}</>;

  return (
    <div style={{ minHeight: '100dvh', background: '#fdf2f8', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Top bar ── */}
      <div style={{
        background: '#9d174d', color: 'white',
        padding: '.85rem 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 30,
        boxShadow: '0 2px 8px rgba(0,0,0,.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-.01em' }}>Ethnic Story</span>
          <span style={{ opacity: .4, fontSize: '1.1rem' }}>|</span>
          <span style={{ fontSize: '.82rem', opacity: .75, fontWeight: 500 }}>Admin Portal</span>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', color: 'white', borderRadius: '.5rem', padding: '.32rem .85rem', fontSize: '.8rem', cursor: 'pointer', fontWeight: 600 }}
        >
          Sign out
        </button>
      </div>

      {/* ── Body: sidebar + content on desktop, stacked on mobile ── */}
      <div style={{ display: 'flex', minHeight: 'calc(100dvh - 52px)' }}>

        {/* Desktop sidebar — hidden on mobile via inline media query trick using a wrapper */}
        <style>{`
          @media (max-width: 767px) { .admin-sidebar { display: none !important; } }
          @media (min-width: 768px) { .admin-bottom-nav { display: none !important; } }
          @media (min-width: 768px) { .admin-content { padding: 2rem 2.5rem !important; } }
        `}</style>

        <aside className="admin-sidebar" style={{
          width: '220px', flexShrink: 0,
          background: 'white',
          borderRight: '1.5px solid #fce7f3',
          display: 'flex', flexDirection: 'column',
          padding: '1.5rem 0',
          position: 'sticky', top: '52px',
          height: 'calc(100dvh - 52px)',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '0 1rem .75rem', fontSize: '.65rem', fontWeight: 700, color: '#d1d5db', textTransform: 'uppercase', letterSpacing: '.08em' }}>Navigation</div>
          {navItems.map(item => {
            const active = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.75rem',
                  padding: '.65rem 1rem',
                  margin: '0 .6rem',
                  borderRadius: '.65rem',
                  textDecoration: 'none',
                  fontSize: '.88rem', fontWeight: active ? 700 : 500,
                  color: active ? '#9d174d' : '#6b7280',
                  background: active ? '#fdf2f8' : 'transparent',
                  transition: 'background .12s, color .12s',
                }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </aside>

        {/* Main content */}
        <main className="admin-content" style={{
          flex: 1, minWidth: 0,
          padding: '1rem',
          paddingBottom: '5.5rem',
        }}>
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="admin-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1.5px solid #fce7f3',
        display: 'flex', zIndex: 20,
        boxShadow: '0 -2px 12px rgba(0,0,0,.07)',
      }}>
        {navItems.map(item => {
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '.5rem .2rem .4rem',
                textDecoration: 'none',
                color: active ? '#9d174d' : '#9ca3af',
                fontSize: '.52rem', fontWeight: active ? 700 : 500,
                gap: '.12rem',
                borderTop: active ? '2px solid #9d174d' : '2px solid transparent',
                transition: 'color .15s',
              }}
            >
              <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
