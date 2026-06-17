'use client';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show admin nav on login page
  const isLoginPage = pathname === '/admin/login';

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📦' },
    { href: '/admin/orders', label: 'Orders', icon: '🛒' },
    { href: '/admin/scan', label: 'Scan', icon: '📷' },
    { href: '/admin/import', label: 'Import', icon: '📥' },
  ];

  if (isLoginPage) return <>{children}</>;

  return (
    <div style={{ minHeight: '100dvh', background: '#fdf2f8', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top bar */}
      <div style={{
        background: '#9d174d', color: 'white',
        padding: '.85rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <span style={{ fontWeight: 800, fontSize: '1rem' }}>Ethnic Story</span>
          <span style={{ opacity: .5 }}>|</span>
          <span style={{ fontSize: '.82rem', opacity: .8 }}>Admin</span>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: 'white', borderRadius: '.5rem', padding: '.3rem .75rem', fontSize: '.8rem', cursor: 'pointer', fontWeight: 600 }}
        >
          Sign out
        </button>
      </div>

      {/* Page content */}
      <div style={{ paddingBottom: '5rem' }}>
        {children}
      </div>

      {/* Bottom nav — wired to admin screens only */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1.5px solid #fce7f3',
        display: 'flex', zIndex: 20,
        boxShadow: '0 -2px 12px rgba(0,0,0,.07)'
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
                padding: '.55rem .25rem .45rem',
                textDecoration: 'none',
                color: active ? '#9d174d' : '#9ca3af',
                fontSize: '.62rem', fontWeight: active ? 700 : 500,
                gap: '.15rem',
                borderTop: active ? '2px solid #9d174d' : '2px solid transparent',
                transition: 'color .15s',
              }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}