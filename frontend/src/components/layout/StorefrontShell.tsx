'use client';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from '../cart/CartDrawer';
import { ChatWidget } from '../chat/ChatWidget';

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
      <ChatWidget />
    </>
  );
}
