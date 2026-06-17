'use client';
import { usePathname } from 'next/navigation';
import { MobileNav, BottomTabBar } from './MobileNav';
import { CartDrawer } from '../cart/CartDrawer';
import { CartIcon } from '../cart/CartIcon';
import { AuthNav } from '../AuthNav';
import { PageTransition } from './PageTransition';

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Render nothing but children for all /admin routes
  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Announcement Bar */}
      <div style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)', textAlign: 'center', padding: '.5rem 1rem', fontSize: 'var(--text-xs)', letterSpacing: '.05em' }}>
        Free shipping on orders over A$150 · Handcrafted in India · Delivered Australia-wide
      </div>

      {/* Header */}
      <header className="site-header">
        <div className="site-header__inner">
          <a className="site-header__logo" href="/">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                <path d="M8 24C12 22 13.5 17 16 11C18.5 17 20 22 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 20C13.5 18.5 14.7 16.8 16 14C17.3 16.8 18.5 18.5 20 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </span>
            Ethnic Story
          </a>
          <nav className="site-header__nav" aria-label="Primary navigation">
            <a href="/collections">All</a>
            <a href="/collections/women">Women</a>
            <a href="/collections/men">Men</a>
            <a href="/collections/kids">Kids</a>
          </nav>
          <div className="site-header__actions">
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

      <footer className="site-footer" style={{ marginBottom: 0 }}>
        <div className="container">
          <div className="site-footer__inner">
            <p>© 2026 Ethnic Story. All rights reserved.</p>
            <p>Indian ethnic wear — handcrafted with intention, delivered across Australia.</p>
          </div>
        </div>
      </footer>

      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          var items = document.querySelectorAll('[data-reveal]');
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            var observer = new IntersectionObserver(function(entries){
              entries.forEach(function(entry){
                if(entry.isIntersecting){ entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
              });
            }, { threshold: .16, rootMargin: '0px 0px -40px 0px' });
            items.forEach(function(item){ observer.observe(item); });
          } else {
            items.forEach(function(item){ item.classList.add('is-visible'); });
          }
        })();
      ` }} />
    </>
  );
}
