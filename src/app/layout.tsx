import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Providers from "./providers";
import "./daisyui.css";
import "./globals.css";
import SplashScreen from "./splashScreen";
import { RealtimeProvider } from "@/helpers/client/realtime";
import { createRealtimeJwt } from "@/helpers/server/realtime.server";
import { currentUserNoThrow } from "@/helpers/server/auth";

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUserNoThrow();
  const realtimeToken = await createRealtimeJwt({ userId: user?.id });
  return (
    <html lang="en" className="h-full w-full">
      <body
        className={`flex min-h-full w-full flex-col ${geistSans.variable} ${geistMono.variable} bg-base-200 text-base-content text-lg font-light antialiased`}
      >
        <NextTopLoader />
        <RealtimeProvider token={realtimeToken}>
          <Providers>
            <Suspense fallback={<SplashScreen />}>{children}</Suspense>
          </Providers>
        </RealtimeProvider>
      </body>
    </html>
  );
}
