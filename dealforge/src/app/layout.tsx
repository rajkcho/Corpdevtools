import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import CommandPalette from "@/components/CommandPalette";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";

export const metadata: Metadata = {
  title: "DealForge - M&A Intelligence Platform",
  description: "Deal pipeline management and due diligence tracking for vertical market software acquisitions",
  manifest: "/manifest.json",
  icons: [{ rel: "icon", url: "/icon.svg", type: "image/svg+xml" }],
  appleWebApp: {
    capable: true,
    title: "DealForge",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
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
          <ClientErrorBoundary>
            {children}
          </ClientErrorBoundary>
        </main>
        <CommandPalette />
      </body>
    </html>
  );
}
