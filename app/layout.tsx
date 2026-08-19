import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans, Martian_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// REGISTER (2026 design pass) — see DESIGN.md "Typography." Additive only:
// these declare --register-font-public-sans / --register-font-martian-mono
// as CSS custom properties (consumed by globals.css's @theme inline block
// as --font-public-sans / --font-martian-mono) without touching the Geist
// variables above, so no existing component's rendered font changes. Only
// new REGISTER components that explicitly use the font-public-sans /
// font-martian-mono utility classes pick these up.
const publicSans = Public_Sans({
  variable: "--register-font-public-sans",
  weight: "variable", // covers the full 300-800 range DESIGN.md specifies, plus italic below
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const martianMono = Martian_Mono({
  variable: "--register-font-martian-mono",
  weight: "variable", // covers the full 100-800 range DESIGN.md specifies
  style: "normal",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Australia Scorecard",
  description:
    "A weighted, internationally benchmarked verdict on Australia's national trajectory, built from official statistics with full source transparency.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${publicSans.variable} ${martianMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--page-plane)] text-[var(--text-primary)]">
        <Header />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
