import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '../context/CartContext';
import { AuthProvider } from '../context/AuthContext';
import { StorefrontShell } from '../components/layout/StorefrontShell';

export const metadata: Metadata = {
  title: 'Ethnic Story — Indian Ethnic Wear in Australia',
  description: 'A curated collection of sarees, lehengas, kurtas, and festive sets — rooted in Indian craft, designed for modern celebrations. Shipping Australia-wide.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=boska@400,500,700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>
            <StorefrontShell>
              {children}
            </StorefrontShell>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
