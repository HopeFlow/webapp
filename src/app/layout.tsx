import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Providers from "./providers";
import "./daisyui.css";
import "./globals.css";
import SplashScreen from "./splashScreen";

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
        <Providers>
          <Suspense fallback={<SplashScreen />}>{children}</Suspense>
        </Providers>
      </body>
    </html>
  );
}
