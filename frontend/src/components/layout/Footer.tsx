export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">

          {/* Brand */}
          <div>
            <div className="site-footer__brand">Ethnic Story</div>
            <p className="site-footer__tagline">
              Celebrating the richness of Indian textile heritage. Handpicked sarees, lehengas,
              and ethnic wear crafted by master artisans.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <a href="https://www.facebook.com/ethnicstory.com.au" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '1.2rem', opacity: 0.6, transition: 'opacity 0.15s' }}
                aria-label="Facebook">📘</a>
              <a href="https://www.instagram.com/ethnicstory.com.au" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '1.2rem', opacity: 0.6, transition: 'opacity 0.15s' }}
                aria-label="Instagram">📸</a>
            </div>
          </div>

          {/* Collections */}
          <div>
            <div className="site-footer__col-title">Collections</div>
            <ul className="site-footer__links">
              {([
                ['Sarees',       '/collections/sarees'],
                ['Lehengas',     '/collections/lehengas'],
                ['Kurtas',       '/collections/kurtas'],
                ['Kids Wear',    '/collections/kids'],
                ['New Arrivals', '/collections'],
              ] as [string, string][]).map(([label, href]) => (
                <li key={href}><a href={href}>{label}</a></li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <div className="site-footer__col-title">Help</div>
            <ul className="site-footer__links">
              {([
                ['Sizing Guide',      '/sizing'],
                ['Shipping Info',     '/shipping'],
                ['Returns',          '/returns'],
                ['Track Order',      '/orders'],
                ['Book Appointment', '/appointments'],
                ['Contact Us',       'mailto:hello@ethnicstory.com.au'],
              ] as [string, string][]).map(([label, href]) => (
                <li key={label}>
                  <a href={href}>{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="site-footer__col-title">Contact</div>
            <ul className="site-footer__links">
              <li>📍 Sydney, Australia</li>
              <li>
                <a href="tel:+61291234567">📞 +61 2 9123 4567</a>
              </li>
              <li>
                <a href="mailto:hello@ethnicstory.com.au">✉️ hello@ethnicstory.com.au</a>
              </li>
              <li style={{ marginTop: '0.75rem' }}>Mon–Sat, 10am–6pm AEST</li>
            </ul>
          </div>

        </div>

        <div className="site-footer__bottom">
          <span>© 2026 Ethnic Story. All rights reserved.</span>
          <span>Made with ❤️ for Indian fashion lovers in Australia</span>
        </div>
      </div>
    </footer>
  );
}
