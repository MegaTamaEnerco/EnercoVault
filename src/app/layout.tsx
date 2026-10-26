import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { WorkspaceTabsProvider } from "@/components/layout/WorkspaceTabsContext";
import { CompanyConfigProvider } from "@/components/providers/CompanyConfigProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Enerco Vault — Enterprise Document Control & IMS",
  description: "Sistem Pengendalian Dokumen Terpadu & Kepatuhan Multi-Standar ISO 9001, ISO 14001, ISO 45001 & SMK3 PP 50/2012 PT Enerco Persada Indonesia",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <CompanyConfigProvider>
            <WorkspaceTabsProvider>{children}</WorkspaceTabsProvider>
          </CompanyConfigProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
