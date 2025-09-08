import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { DashboardHeader } from "@/components/DashboardHeader";
import { headers } from "next/headers";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HR System",
  description: "Uptown October HR System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // We only want the dashboard header after authentication.
  // Exclude it on login and register routes.
  const h = headers();
  const pathname = h.get("x-pathname") || "";

  const hideHeader =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {!hideHeader && <DashboardHeader />}
          {children}
        </Providers>
      </body>
    </html>
  );
}