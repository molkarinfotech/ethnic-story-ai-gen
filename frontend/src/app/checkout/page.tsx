import { CheckoutForm } from '../../components/checkout/CheckoutForm';

export default function CheckoutPage() {
  return (
    <main>
      <div className="page-header" style={{ padding: '3rem 1.5rem 2.5rem' }}>
        <p className="page-header__eyebrow">Almost there</p>
        <h1>Checkout</h1>
      </div>
      <section className="section" style={{ paddingTop: 'var(--space-8)' }}>
        <div className="container">
          <CheckoutForm />
        </div>
      </section>
    </main>
  );
}
