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

  const primaryNav = [
    { href: '/admin/dashboard',     label: 'Dashboard',     icon: '📊' },
    { href: '/admin/products',      label: 'Products',      icon: '👗' },
    { href: '/admin/orders',        label: 'Orders',        icon: '📦' },
    { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
  ];
  const toolsNav = [
    { href: '/admin/scan',       label: 'Scan & AI',  icon: '📷' },
    { href: '/admin/import',     label: 'Import',     icon: '📥' },
    { href: '/admin/checkout',   label: 'In-store',   icon: '🛒' },
    { href: '/admin/chatbot-kb', label: 'Chatbot KB', icon: '🤖' },
  ];
  const settingsNav = [
    { href: '/admin/coupons',    label: 'Coupons',    icon: '🏷️' },
    { href: '/admin/categories', label: 'Categories', icon: '📁' },
    { href: '/admin/appearance', label: 'Appearance', icon: '🎨' },
  ];

  const mobileNav = [
    { href: '/admin/dashboard',     label: 'Home',       icon: '📊' },
    { href: '/admin/products',      label: 'Products',   icon: '👗' },
    { href: '/admin/orders',        label: 'Orders',     icon: '📦' },
    { href: '/admin/notifications', label: 'Alerts',     icon: '🔔' },
    { href: '/admin/coupons',       label: 'Coupons',    icon: '🏷️' },
    { href: '/admin/checkout',      label: 'Checkout',   icon: '🛒' },
    { href: '/admin/scan',          label: 'Scan',       icon: '📷' },
    { href: '/admin/import',        label: 'Import',     icon: '📥' },
    { href: '/admin/chatbot-kb',    label: 'KB',         icon: '🤖' },
    { href: '/admin/categories',    label: 'Categories', icon: '📁' },
    { href: '/admin/appearance',    label: 'Appearance', icon: '🎨' },
  ];

  function isActive(href: string) {
    if (href === '/admin/dashboard') return pathname === '/admin/dashboard' || pathname === '/admin';
    return pathname.startsWith(href);
  }

  if (isLoginPage) return <>{children}</>;

  const linkStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '.75rem',
    padding: '.6rem 1rem',
    margin: '0 .5rem',
    borderRadius: '.6rem',
    textDecoration: 'none',
    fontSize: '.85rem', fontWeight: active ? 700 : 500,
    color: active ? '#9d174d' : '#6b7280',
    background: active ? '#fdf2f8' : 'transparent',
    transition: 'background .12s, color .12s',
  });

  function NavSection({ label, items }: { label: string; items: typeof primaryNav }) {
    return (
      <div style={{ marginBottom: '.25rem' }}>
        <div style={{ padding: '.5rem 1rem .3rem', fontSize: '.6rem', fontWeight: 700, color: '#d1d5db', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          {label}
        </div>
        {items.map(item => (
          <a key={item.href} href={item.href} style={linkStyle(isActive(item.href))}>
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#fdf2f8', fontFamily: 'system-ui, sans-serif' }}>

      <style>{`
        @media (max-width: 767px) { .admin-sidebar { display: none !important; } }
        @media (min-width: 768px) { .admin-bottom-nav { display: none !important; } }
        @media (min-width: 768px) { .admin-content { padding: 2rem 2.5rem !important; } }
        .admin-nav-link:hover { background: #fdf2f8 !important; color: #9d174d !important; }
        .admin-bottom-nav { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .admin-bottom-nav::-webkit-scrollbar { display: none; }
        @media (max-width: 480px) { .admin-portal-label { display: none !important; } }
        @media (max-width: 480px) { .admin-topbar-divider { display: none !important; } }
        @media (max-width: 380px) { .admin-signout-text { display: none !important; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Top bar */}
      <div style={{
        background: '#9d174d', color: 'white',
        padding: '.55rem .85rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 30,
        boxShadow: '0 2px 8px rgba(0,0,0,.18)',
        minWidth: 0, overflow: 'hidden',
      }}>
        <a href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '.5rem', textDecoration: 'none', minWidth: 0, flexShrink: 1, overflow: 'hidden' }}>
          <img src="/logo.jpg" alt="Ethnic Story" style={{ height: '1.75rem', width: 'auto', objectFit: 'contain', borderRadius: '4px', mixBlendMode: 'multiply', flexShrink: 0 }} />
          <span className="admin-topbar-divider" style={{ opacity: .35, fontSize: '1rem', color: 'white', flexShrink: 0 }}>|</span>
          <span className="admin-portal-label" style={{ fontSize: '.78rem', opacity: .9, fontWeight: 600, color: 'white', letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Admin Portal
          </span>
        </a>
        <button
          onClick={handleLogout}
          style={{ flexShrink: 0, marginLeft: '.5rem', background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', color: 'white', borderRadius: '.5rem', padding: '.28rem .75rem', fontSize: '.78rem', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '.3rem' }}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>↩</span>
          <span className="admin-signout-text">Sign out</span>
        </button>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100dvh - 48px)' }}>
        <aside className="admin-sidebar" style={{ width: '210px', flexShrink: 0, background: 'white', borderRight: '1.5px solid #fce7f3', display: 'flex', flexDirection: 'column', padding: '1rem 0 1.5rem', position: 'sticky', top: '48px', height: 'calc(100dvh - 48px)', overflowY: 'auto', gap: '.5rem' }}>
          <NavSection label="Main" items={primaryNav} />
          <div style={{ height: '1px', background: '#fce7f3', margin: '.25rem .75rem' }} />
          <NavSection label="Tools" items={toolsNav} />
          <div style={{ height: '1px', background: '#fce7f3', margin: '.25rem .75rem' }} />
          <NavSection label="Settings" items={settingsNav} />
        </aside>

        <main className="admin-content" style={{ flex: 1, minWidth: 0, padding: '1rem', paddingBottom: '5.5rem' }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="admin-bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1.5px solid #fce7f3', display: 'flex', overflowX: 'auto', zIndex: 20, boxShadow: '0 -2px 12px rgba(0,0,0,.07)' }}>
        {mobileNav.map(item => {
          const active = isActive(item.href);
          return (
            <a key={item.href} href={item.href} style={{ flex: '0 0 auto', minWidth: '58px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '.45rem .4rem .35rem', textDecoration: 'none', color: active ? '#9d174d' : '#9ca3af', fontSize: '.5rem', fontWeight: active ? 700 : 500, gap: '.1rem', borderTop: active ? '2px solid #9d174d' : '2px solid transparent', transition: 'color .15s' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
