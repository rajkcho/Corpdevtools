import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import CommandPalette from "@/components/CommandPalette";

export const metadata: Metadata = {
  title: "DealForge - M&A Intelligence Platform",
  description: "Deal pipeline management and due diligence tracking for vertical market software acquisitions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex" style={{ background: 'var(--background)' }}>
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <CommandPalette />
      </body>
    </html>
  );
}
