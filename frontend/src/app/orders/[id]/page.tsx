import { Suspense } from 'react';
import { OrderTrackingContent } from './OrderTrackingContent';

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <div className="page-header" style={{ padding: '3rem 1.5rem 2.5rem' }}>
        <p className="page-header__eyebrow">Order status</p>
        <h1>Track My Order</h1>
      </div>
      <section className="section" style={{ paddingTop: 'var(--space-8)' }}>
        <div className="container">
          <Suspense fallback={
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-muted)' }}>
              Loading order details…
            </div>
          }>
            <OrderTrackingContent orderId={params.id} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
