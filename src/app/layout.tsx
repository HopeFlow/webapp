import { HopeflowLogo } from "@/components/logos/hopeflow";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-hopeflow-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-hopeflow-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hopeflow",
  description: "Spread the ask, amplify the find",
};

const SplashScreen = () => (
  <div
    data-testid="splashScreen"
    className="flex h-full w-full items-center justify-center bg-[#12a17d]"
  >
    <HopeflowLogo size={100} fillColor="#f8f8f8" />
  </div>
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="w-full h-full">
      <body
        className={`w-full min-h-full flex flex-col ${geistSans.variable} ${geistMono.variable} antialiased bg-base-200 text-base-content text-lg font-light`}
      >
        <Suspense fallback={<SplashScreen />}>{children}</Suspense>
      </body>
    </html>
  );
}
