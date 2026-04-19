import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/layout/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "SpendWise", template: "%s | SpendWise" },
  description: "Personal finance planner — track spending, budgets and goals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body>
          <Providers>
            {children}
            <Toaster richColors position="bottom-right" />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
