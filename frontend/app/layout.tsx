import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Attendance System",
  description: "Production-ready face recognition attendance platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {children}
        <footer className="border-t border-black/5 bg-white/70 px-6 py-4 text-center text-sm text-slate-500 backdrop-blur">
          &copy; {new Date().getFullYear()} Smart Attendance System
        </footer>
      </body>
    </html>
  );
}
