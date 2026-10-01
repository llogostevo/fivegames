import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { cookies } from "next/headers";

import { DevDateToolbar } from "@/components/dev/DevDateToolbar";
import { DEV_DATE_COOKIE } from "@/lib/game/constants";

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
  title: "Pin5 · UK Edition",
  description: "Five clues. Five pins. Find the place. Pin5 UK Edition.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Temporary beta testing control — remove DevDateToolbar later.
  const store = await cookies();
  const initialDevDate = store.get(DEV_DATE_COOKIE)?.value ?? "";

  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <DevDateToolbar initialDate={initialDevDate} />
        {children}
      </body>
    </html>
  );
}
