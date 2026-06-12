import './globals.css';
import { Header } from '../components/layout/Header';

export const metadata = {
  title: 'Ethnic Story',
  description: 'Indian ethnic clothing boutique',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
