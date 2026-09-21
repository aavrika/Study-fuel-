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
      <body className="bg-stone-50 text-stone-900 antialiased selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
