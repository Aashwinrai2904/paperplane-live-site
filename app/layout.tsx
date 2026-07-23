import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TransLink GIS | Metro Vancouver",
  description:
    "TransLink GIS — a real-time 3D geographic information system for Metro Vancouver's transit network — live vehicle positions, crowd density, predictive delays, and AI-powered disruption summaries.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050a14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen w-screen overflow-hidden antialiased">{children}</body>
    </html>
  );
}
