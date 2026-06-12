export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="footer__brand-name">Ethnic Story</div>
            <p className="footer__brand-desc">Celebrating the richness of Indian textile heritage. Handpicked sarees, lehengas, and ethnic wear crafted by master artisans.</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {['📘','📸','🐦'].map((icon, i) => (
                <a key={i} href="#" style={{ fontSize: '1.2rem', opacity: 0.6, transition: 'opacity 0.15s' }}>{icon}</a>
              ))}
            </div>
          </div>
          <div>
            <div className="footer__col-title">Collections</div>
            <ul className="footer__links">
              {[['Sarees','/collections/sarees'],['Lehengas','/collections/lehengas'],['Kurtas','/collections/kurtas'],['Kids Wear','/collections/kids'],['New Arrivals','/collections']].map(([l,h]) => (
                <li key={h}><a href={h}>{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer__col-title">Help</div>
            <ul className="footer__links">
              {[['Sizing Guide','#'],['Shipping Info','#'],['Returns','#'],['Track Order','#'],['Contact Us','#']].map(([l,h]) => (
                <li key={l}><a href={h}>{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer__col-title">Contact</div>
            <ul className="footer__links">
              <li>📍 Mumbai, India</li>
              <li>📞 +91 98765 43210</li>
              <li>✉️ hello@ethnicstory.in</li>
              <li style={{ marginTop: '0.75rem' }}>Mon–Sat, 10am–7pm IST</li>
            </ul>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© 2026 Ethnic Story. All rights reserved.</span>
          <span>Made with ❤️ for Indian fashion</span>
        </div>
      </div>
    </footer>
  );
}
