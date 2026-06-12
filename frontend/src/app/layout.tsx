import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '../context/CartContext';
import { CartDrawer } from '../components/cart/CartDrawer';
import { CartIcon } from '../components/cart/CartIcon';

export const metadata: Metadata = {
  title: 'Vastra House — Indian Ethnic Wear',
  description: 'A curated collection of sarees, lehengas, kurtas, and festive sets — rooted in Indian craft, designed for modern celebrations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=boska@400,500,700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <CartProvider>
          {/* Announcement Bar */}
          <div style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)', textAlign: 'center', padding: '.5rem 1rem', fontSize: 'var(--text-xs)', letterSpacing: '.05em' }}>
            Free shipping on orders above ₹2,500  ·  Handcrafted in India
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
                Vastra House
              </a>
              <nav className="site-header__nav" aria-label="Primary navigation">
                <a href="/collections">Collections</a>
                <a href="/collections/sarees">Sarees</a>
                <a href="/collections/lehengas">Lehengas</a>
                <a href="/collections/kurtas">Kurtas</a>
                <a href="/collections/kids">Kids</a>
              </nav>
              <div className="site-header__actions">
                <CartIcon />
                <a href="/collections" className="btn btn-primary" style={{ minHeight: '38px', padding: '.6rem 1.2rem', fontSize: 'var(--text-xs)' }}>Shop Now</a>
              </div>
            </div>
          </header>

          {children}

          {/* Slide-out Cart Drawer */}
          <CartDrawer />

          {/* Footer */}
          <footer className="site-footer">
            <div className="container">
              <div className="site-footer__inner">
                <p>© 2026 Vastra House. All rights reserved.</p>
                <p>Indian ethnic wear — handcrafted with intention.</p>
              </div>
            </div>
          </footer>

          {/* Scroll Reveal */}
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
          `}} />
        </CartProvider>
      </body>
    </html>
  );
}
