import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#284a7e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "TN Solar | Site Visit Manager",
  description: "Bilingual Solar Site Visit & Job Management System",
  applicationName: "TN Solar",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TN Solar",
  },
  formatDetection: {
    telephone: false,
  },
};

import { I18nProvider } from "@/components/providers/i18n-provider";
import { AuthProvider } from "@/components/providers/auth-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full font-sans" suppressHydrationWarning>
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider delay={300}>
              {children}
            </TooltipProvider>
          </AuthProvider>
        </I18nProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
