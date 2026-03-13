import './globals.css';
import { ReactNode } from 'react';
import { Providers } from '../components/providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
