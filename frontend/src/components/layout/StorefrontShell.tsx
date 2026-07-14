'use client';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomTabBar } from './MobileNav';
import { CartDrawer } from '../cart/CartDrawer';
import { ChatWidget } from '../chat/ChatWidget';

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Admin routes render their own layout — skip storefront chrome entirely
  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
      <ChatWidget />
      {/* Mobile bottom tab bar — hidden on desktop via CSS in MobileNav */}
      <BottomTabBar />
    </>
  );
}
