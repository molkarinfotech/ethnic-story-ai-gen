'use client';
import { usePathname } from 'next/navigation';
import { MobileNav, BottomTabBar } from './MobileNav';
import { CartDrawer } from '../cart/CartDrawer';
import { CartIcon } from '../cart/CartIcon';
import { AuthNav } from '../AuthNav';
import { PageTransition } from './PageTransition';
import { DarkModeToggle } from './DarkModeToggle';

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  const collectionLinks: Array<[string, string]> = [
    ['Women', '/collections/women'],
    ['Men', '/collections/men'],
    ['Kids Wear', '/collections/kids'],
    ['Accessories', '/collections/accessories'],
    ['New Arrivals', '/collections'],
  ];

  const helpLinks: Array<[string, string]> = [
    ['Sizing Guide', '/sizing-guide'],
    ['Shipping Info', '/shipping'],
    ['Returns & Exchanges', '/returns'],
    ['Track My Order', '/track-order'],
    ['Contact Us', '/contact'],
  ];

  return (
    <>
      {/* Announcement Bar */}
      <div style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)', textAlign: 'center', padding: '.5rem 1rem', fontSize: 'var(--text-xs)', letterSpacing: '.05em' }}>
        ✨ Free shipping on orders over A$150 · Handcrafted in India · Delivered Australia-wide
      </div>

      {/* Header */}
      <header className="site-header">
        <div className="site-header__inner">
          <a className="site-header__logo" href="/" aria-label="Ethnic Story — Home">
            <img
              src="/logo.svg"
              alt="Ethnic Story — Clothing &amp; Jewellery"
              width={160}
              height={54}
              loading="eager"
              style={{
                height: '2.5rem',  /* 40px */
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </a>
          <nav className="site-header__nav" aria-label="Primary navigation">
            <a href="/collections">All</a>
            <a href="/collections/women">Women</a>
            <a href="/collections/men">Men</a>
            <a href="/collections/kids">Kids</a>
          </nav>
          <div className="site-header__actions">
            <DarkModeToggle />
            <AuthNav />
            <CartIcon />
            <a href="/collections" className="btn btn-primary site-header__shop-btn" style={{ minHeight: '38px', padding: '.6rem 1.2rem', fontSize: 'var(--text-xs)' }}>Shop Now</a>
            <MobileNav />
          </div>
        </div>
      </header>

      <PageTransition>
        {children}
      </PageTransition>

      <CartDrawer />
      <BottomTabBar />

      {/* Footer */}
      <footer className="site-footer">
        <div className="container">
          <div className="site-footer__grid">
            {/* Brand */}
            <div>
              <div className="site-footer__brand">
                <img
                  src="/logo.svg"
                  alt="Ethnic Story"
                  width={140}
                  height={47}
                  loading="lazy"
                  style={{
                    height: '2.2rem',
                    width: 'auto',
                    objectFit: 'contain',
                    /* SVG logos render crisply — drop-shadow still works */
                    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.18))',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                  }}
                />
              </div>
              <p className="site-footer__tagline">Celebrating the richness of Indian textile heritage. Handpicked sarees, lehengas and ethnic wear — delivered across Australia.</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Ethnic Story on Facebook" style={{ fontSize: '1.2rem', opacity: 0.6, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}>📘</a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Ethnic Story on Instagram" style={{ fontSize: '1.2rem', opacity: 0.6, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}>📸</a>
                <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" aria-label="Ethnic Story on Pinterest" style={{ fontSize: '1.2rem', opacity: 0.6, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}>📌</a>
              </div>
            </div>

            {/* Collections */}
            <div>
              <div className="site-footer__col-title">Collections</div>
              <ul className="site-footer__links">
                {collectionLinks.map(([label, href]) => (
                  <li key={href}><a href={href}>{label}</a></li>
                ))}
              </ul>
            </div>

            {/* Help */}
            <div>
              <div className="site-footer__col-title">Help</div>
              <ul className="site-footer__links">
                {helpLinks.map(([label, href]) => (
                  <li key={href}><a href={href}>{label}</a></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <div className="site-footer__col-title">Contact</div>
              <ul className="site-footer__links">
                <li>📍 Sydney, Australia</li>
                <li>
                  <a href="mailto:hello@ethnicstory.com.au" style={{ textDecoration: 'none', color: 'inherit' }}>
                    ✉️ hello@ethnicstory.com.au
                  </a>
                </li>
                <li style={{ marginTop: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Mon–Sat, 9am–6pm AEST</li>
              </ul>
            </div>
          </div>

          <div className="site-footer__bottom">
            <span>© 2026 Ethnic Story. All rights reserved.</span>
            <span>Indian ethnic wear, delivered across Australia 🇦🇺</span>
          </div>
        </div>
      </footer>

      {/* Scroll-reveal observer — runs after hydration + window load */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          function initReveal(){
            document.body.classList.add('js-ready');
            var items = document.querySelectorAll('[data-reveal]');
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
              var observer = new IntersectionObserver(function(entries){
                entries.forEach(function(entry){
                  if(entry.isIntersecting){
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                  }
                });
              }, { threshold: .16, rootMargin: '0px 0px -40px 0px' });
              items.forEach(function(item){ observer.observe(item); });
            } else {
              items.forEach(function(item){ item.classList.add('is-visible'); });
            }
          }

          if (document.readyState === 'complete') {
            initReveal();
          } else {
            window.addEventListener('load', initReveal, { once: true });
          }
        })();
      ` }} />
    </>
  );
}
