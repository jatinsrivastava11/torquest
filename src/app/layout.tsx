import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-barlow" });

export const metadata: Metadata = {
  title: "Torquest",
  description: "Spot cars in the wild. Build your collection.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0c0f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${barlow.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <div className="mx-auto min-h-dvh max-w-md pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:max-w-2xl">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
