import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Barlow, Barlow_Condensed } from "next/font/google";

import { DevDateToolbarHost } from "@/components/dev/DevDateToolbarHost";
import { HUB_SEO } from "@/lib/seo";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HUB_SEO.title,
    template: "%s",
  },
  description: HUB_SEO.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: HUB_SEO.title,
    description: HUB_SEO.description,
    siteName: "PIN5",
    locale: "en_GB",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: HUB_SEO.title,
    description: HUB_SEO.description,
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
