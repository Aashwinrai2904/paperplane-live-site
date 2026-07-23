import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TransLink Digital Twin | Metro Vancouver",
  description:
    "A real-time 3D digital twin of Metro Vancouver's TransLink network — live vehicle positions, crowd density, predictive delays, and AI-powered disruption summaries.",
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
