import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HEPRA AI Website Builder",
  description: "Describe your website. Upload references. Let AI build the complete website.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body className="bg-surface text-white font-sans antialiased">{children}</body>
    </html>
  );
}
