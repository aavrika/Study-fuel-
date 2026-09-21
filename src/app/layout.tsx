import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Study Fuel - Tiffin Service & Smart Manager',
  description: 'Study Fuel tiffin service management platform with bulk building drop points, multi-resident WhatsApp messaging, daily attendance calendars, and real working persistence.',
  openGraph: {
    title: 'Study Fuel - Tiffin Service & Smart Manager',
    description: 'Study Fuel tiffin service management platform with bulk building drop points, multi-resident WhatsApp messaging, daily attendance calendars, and real working persistence.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-stone-50 text-stone-900 antialiased selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
