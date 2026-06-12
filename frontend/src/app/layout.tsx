import './globals.css';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export const metadata = {
  title: 'Ethnic Story – Indian Ethnic Fashion Boutique',
  description: 'Curated sarees, lehengas, kurtas and kids ethnic wear from master artisans across India.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
