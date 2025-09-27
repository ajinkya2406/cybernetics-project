import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToasterProvider from "@/components/providers/ToasterProvider";
import SessionProvider from "@/components/providers/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MindShare",
  description: "Wellness journaling, mood tracking, and community insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-gradient-to-br from-[#E9E4FF] to-[#DDF1FF] min-h-screen text-slate-800`}> 
        <SessionProvider>
          <div className="min-h-screen">
            {children}
          </div>
        </SessionProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
