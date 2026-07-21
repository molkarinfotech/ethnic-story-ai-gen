'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

/* ── SVG icon library (no emoji) ───────────────────────────────── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const icons: Record<string, string> = {
    dashboard:    'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
    products:     'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
    orders:       'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM4 5h16M8 5V3M16 5V3',
    notifications:'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    scan:         'M23 7V3h-4M1 7V3h4M23 17v4h-4M1 17v4h4M7 12h10M12 7v10',
    import:       'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    checkout:     'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
    chatbot:      'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    coupons:      'M7 7h.01M17 17h.01M3 3l18 18M10.5 6.5a4 4 0 0 0 5.66 5.66M6.34 6.34a8 8 0 0 0 11.31 11.31',
    categories:   'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
    appearance:   'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    logout:       'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    likes:        'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    reviews:      'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    sourcing:     'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4',
    shipping:     'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    add:          'M12 5v14M5 12h14',
    arrow_right:  'M5 12h14M12 5l7 7-7 7',
    warning:      'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    clock:        'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
  };
  const d = icons[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* ── Nav data ────────────────────────────────────────────────────── */
const primaryNav = [
  { href: '/admin/dashboard',     label: 'Dashboard',     icon: 'dashboard' },
  { href: '/admin/products',      label: 'Products',      icon: 'products' },
  { href: '/admin/orders',        label: 'Orders',        icon: 'orders' },
  { href: '/admin/notifications', label: 'Notifications', icon: 'notifications' },
  { href: '/admin/likes',         label: 'Likes',         icon: 'likes' },
  { href: '/admin/reviews',       label: 'Reviews',       icon: 'reviews' },
  { href: '/admin/sourcing',      label: 'Sourcing',      icon: 'sourcing' },
];
const toolsNav = [
  { href: '/admin/scan',       label: 'Scan & AI',  icon: 'scan' },
  { href: '/admin/import',     label: 'Import',     icon: 'import' },
  { href: '/admin/checkout',   label: 'In-store',   icon: 'checkout' },
  { href: '/admin/chatbot-kb', label: 'Chatbot KB', icon: 'chatbot' },
];
const settingsNav = [
  { href: '/admin/coupons',             label: 'Coupons',    icon: 'coupons' },
  { href: '/admin/categories',          label: 'Categories', icon: 'categories' },
  { href: '/admin/shipping-providers',  label: 'Shipping',   icon: 'shipping' },
  { href: '/admin/appearance',          label: 'Appearance', icon: 'appearance' },
];

// Mobile nav — scrollable row with ALL routes so nothing is hidden
const mobileNav = [
  { href: '/admin/dashboard',            label: 'Home',     icon: 'dashboard' },
  { href: '/admin/products',             label: 'Products', icon: 'products' },
  { href: '/admin/orders',               label: 'Orders',   icon: 'orders' },
  { href: '/admin/notifications',        label: 'Alerts',   icon: 'notifications' },
  { href: '/admin/likes',                label: 'Likes',    icon: 'likes' },
  { href: '/admin/reviews',              label: 'Reviews',  icon: 'reviews' },
  { href: '/admin/sourcing',             label: 'Sourcing', icon: 'sourcing' },
  { href: '/admin/scan',                 label: 'Scan',     icon: 'scan' },
  { href: '/admin/import',               label: 'Import',   icon: 'import' },
  { href: '/admin/checkout',             label: 'In-store', icon: 'checkout' },
  { href: '/admin/chatbot-kb',           label: 'Chatbot',  icon: 'chatbot' },
  { href: '/admin/coupons',              label: 'Coupons',  icon: 'coupons' },
  { href: '/admin/categories',           label: 'Categ.',   icon: 'categories' },
  { href: '/admin/shipping-providers',   label: 'Shipping', icon: 'shipping' },
  { href: '/admin/appearance',           label: 'Theme',    icon: 'appearance' },
];

/* ── Layout ──────────────────────────────────────────────────────── */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  }

  function isActive(href: string) {
    if (href === '/admin/dashboard') return pathname === '/admin/dashboard' || pathname === '/admin';
    return pathname.startsWith(href);
  }

  if (isLoginPage) return <>{children}</>;

  return (
    <>
      <style>{`
        /* ── Fonts ── */
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap');

        /* ── Design tokens ── */
        :root {
          --admin-brand:       #9d174d;
          --admin-brand-dark:  #831843;
          --admin-brand-light: #fdf2f8;
          --admin-brand-mid:   #fce7f3;
          --admin-surface:     #ffffff;
          --admin-bg:          #fdf2f8;
          --admin-border:      #fce7f3;
          --admin-text:        #111827;
          --admin-muted:       #6b7280;
          --admin-faint:       #9ca3af;
          --admin-sidebar-w:   220px;
          --admin-topbar-h:    52px;
          --admin-radius:      .65rem;
          --admin-transition:  160ms cubic-bezier(.16,1,.3,1);
          --font-admin:        'Satoshi', system-ui, sans-serif;
        }

        /* ── Reset ── */
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }

        /* ── Base ── */
        .admin-shell {
          min-height: 100dvh;
          background: var(--admin-bg);
          font-family: var(--font-admin);
          -webkit-font-smoothing: antialiased;
        }

        /* ── Top bar ── */
        .admin-topbar {
          position: sticky; top: 0; z-index: 40;
          height: var(--admin-topbar-h);
          background: var(--admin-brand);
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 0 1rem;
          box-shadow: 0 2px 12px rgba(0,0,0,.18);
        }
        .admin-topbar-brand {
          display: flex; align-items: center; gap: .55rem;
          text-decoration: none; min-width: 0;
        }
        .admin-topbar-logo {
          height: 1.9rem; width: auto;
          border-radius: 5px;
          object-fit: contain;
        }
        .admin-topbar-divider {
          color: rgba(255,255,255,.35);
          font-size: 1rem;
          flex-shrink: 0;
        }
        .admin-topbar-name {
          font-size: .8rem; font-weight: 600;
          color: rgba(255,255,255,.92);
          letter-spacing: -.01em;
          white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
        }
        .admin-logout-btn {
          display: flex; align-items: center; gap: .35rem;
          flex-shrink: 0; margin-left: .5rem;
          background: rgba(255,255,255,.15);
          border: 1px solid rgba(255,255,255,.28);
          color: white;
          border-radius: .5rem;
          padding: .32rem .8rem;
          font-size: .78rem; font-weight: 600;
          cursor: pointer;
          transition: background var(--admin-transition);
          white-space: nowrap;
          font-family: var(--font-admin);
        }
        .admin-logout-btn:hover:not(:disabled) { background: rgba(255,255,255,.25); }
        .admin-logout-btn:disabled { opacity: .6; cursor: not-allowed; }

        /* ── Body row ── */
        .admin-body {
          display: flex;
          min-height: calc(100dvh - var(--admin-topbar-h));
        }

        /* ── Sidebar ── */
        .admin-sidebar {
          width: var(--admin-sidebar-w);
          flex-shrink: 0;
          background: var(--admin-surface);
          border-right: 1.5px solid var(--admin-border);
          position: sticky;
          top: var(--admin-topbar-h);
          height: calc(100dvh - var(--admin-topbar-h));
          overflow-y: auto;
          scrollbar-width: none;
          padding: 1.1rem 0 2rem;
          display: flex; flex-direction: column; gap: .2rem;
        }
        .admin-sidebar::-webkit-scrollbar { display: none; }

        .admin-nav-section-label {
          padding: .6rem 1.1rem .25rem;
          font-size: .6rem; font-weight: 700;
          color: var(--admin-faint);
          text-transform: uppercase;
          letter-spacing: .09em;
        }
        .admin-nav-divider {
          height: 1px;
          background: var(--admin-border);
          margin: .35rem .8rem;
        }
        .admin-nav-link {
          display: flex; align-items: center; gap: .7rem;
          padding: .55rem 1rem;
          margin: 0 .5rem;
          border-radius: var(--admin-radius);
          text-decoration: none;
          font-size: .84rem; font-weight: 500;
          color: var(--admin-muted);
          background: transparent;
          transition: background var(--admin-transition), color var(--admin-transition);
          cursor: pointer;
        }
        .admin-nav-link:hover {
          background: var(--admin-brand-light);
          color: var(--admin-brand);
        }
        .admin-nav-link.active {
          background: var(--admin-brand-light);
          color: var(--admin-brand);
          font-weight: 700;
        }
        .admin-nav-link.active svg { opacity: 1; }
        .admin-nav-link svg { opacity: .65; flex-shrink: 0; }
        .admin-nav-link.active svg { opacity: 1; }

        /* ── Main content ── */
        .admin-main {
          flex: 1; min-width: 0;
          padding: 1rem;
          padding-bottom: 2rem;
          animation: adminFadeIn .18s ease;
        }
        @keyframes adminFadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: none; }
        }

        /* ── Mobile bottom nav ── */
        .admin-bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
          background: var(--admin-surface);
          border-top: 1.5px solid var(--admin-border);
          display: flex;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          box-shadow: 0 -2px 16px rgba(0,0,0,.07);
          padding-bottom: env(safe-area-inset-bottom);
          /* Snap active item into view */
          scroll-snap-type: x proximity;
        }
        .admin-bottom-nav::-webkit-scrollbar { display: none; }
        .admin-bottom-nav-item {
          flex: 0 0 auto;
          min-width: 60px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: .5rem .4rem .4rem;
          text-decoration: none;
          color: var(--admin-faint);
          font-size: .5rem; font-weight: 500;
          gap: .15rem;
          border-top: 2px solid transparent;
          transition: color var(--admin-transition);
          scroll-snap-align: start;
        }
        .admin-bottom-nav-item.active {
          color: var(--admin-brand);
          border-top-color: var(--admin-brand);
          font-weight: 700;
        }
        .admin-bottom-nav-item svg { flex-shrink: 0; }

        /* ── Responsive ── */
        @media (max-width: 767px) {
          .admin-sidebar { display: none !important; }
          .admin-main { padding-bottom: 5.5rem !important; }
          .admin-topbar-divider { display: none; }
          .admin-topbar-name { display: none; }
        }
        @media (min-width: 768px) {
          .admin-bottom-nav { display: none !important; }
          .admin-main { padding: 2rem 2.5rem; }
        }
        @media (max-width: 380px) {
          .admin-logout-text { display: none; }
        }
      `}</style>

      <div className="admin-shell">

        {/* ── Top bar ── */}
        <header className="admin-topbar" role="banner">
          <Link href="/admin/dashboard" className="admin-topbar-brand">
            <img src="/logo.jpg" alt="Ethnic Story" className="admin-topbar-logo" />
            <span className="admin-topbar-divider" aria-hidden="true">|</span>
            <span className="admin-topbar-name">Admin Portal</span>
          </Link>
          <button
            className="admin-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Sign out of admin portal"
          >
            <Icon name="logout" size={14} />
            <span className="admin-logout-text">
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </span>
          </button>
        </header>

        <div className="admin-body">

          {/* ── Desktop sidebar ── */}
          <aside className="admin-sidebar" aria-label="Admin navigation">
            <NavSection label="Main" items={primaryNav} isActive={isActive} />
            <div className="admin-nav-divider" />
            <NavSection label="Tools" items={toolsNav} isActive={isActive} />
            <div className="admin-nav-divider" />
            <NavSection label="Settings" items={settingsNav} isActive={isActive} />
          </aside>

          {/* ── Page content ── */}
          <main className="admin-main" id="main-content">
            {children}
          </main>

        </div>

        {/* ── Mobile bottom nav — scrollable, shows ALL routes ── */}
        <nav className="admin-bottom-nav" aria-label="Mobile navigation">
          {mobileNav.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-bottom-nav-item${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon name={item.icon} size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

      </div>
    </>
  );
}

/* ── NavSection helper ─────────────────────────────────────────── */
function NavSection({
  label, items, isActive,
}: {
  label: string;
  items: { href: string; label: string; icon: string }[];
  isActive: (href: string) => boolean;
}) {
  return (
    <div>
      <div className="admin-nav-section-label">{label}</div>
      {items.map(item => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-nav-link${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
