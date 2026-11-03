import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "West Section MIS",
  description: "Northeastern Mindanao District-West Section Ministry Information System",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.jpeg",
    shortcut: "/favicon.jpeg",
    apple: "/favicon.jpeg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "West MIS",
  },
};

export const viewport: Viewport = {
  themeColor: "#465fff",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.jpeg" />
        <link rel="apple-touch-icon" href="/favicon.jpeg" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
