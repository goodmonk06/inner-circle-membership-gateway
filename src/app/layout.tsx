import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inner Circle Membership Gateway",
  description: "Membership tier management and evaluation system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
