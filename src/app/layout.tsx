import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Barlow, Barlow_Condensed } from "next/font/google";

import { DevDateToolbarHost } from "@/components/dev/DevDateToolbarHost";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const siteTitle = "PIN5";
const siteDescription =
  "PIN5 — daily location games. Play Daily 5 and Football 5 across England, Italy, Germany, France, and Spain.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    type: "website",
    title: siteTitle,
    description: siteDescription,
    siteName: "PIN5",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <DevDateToolbarHost />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
