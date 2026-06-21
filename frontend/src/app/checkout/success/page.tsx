import { Suspense } from 'react';
import { ClearCart } from './clear-cart';
import { SuccessContent } from './success-content';

export default function CheckoutSuccessPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset)' }}>
      {/* ClearCart uses useSearchParams — must be inside Suspense */}
      <Suspense fallback={null}>
        <ClearCart />
      </Suspense>
      <Suspense fallback={
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
          Loading your order…
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
