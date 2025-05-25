import type {Metadata} from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'لينجوا ليرن - معلمك الثنائي للغة الإنجليزية',
  description: 'معلمو الذكاء الاصطناعي لشرح قواعد اللغة الإنجليزية باللغة العربية',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
