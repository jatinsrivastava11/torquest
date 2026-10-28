import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Torquest",
  description: "Spot cars in the wild. Build your collection.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh font-sans text-[14px] leading-5 antialiased">
        <Nav />
        <div className="mx-auto min-h-dvh max-w-[1120px] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10">{children}</div>
      </body>
    </html>
  );
}
