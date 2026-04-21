import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Email Copy Intelligence — Minimal Club",
  description:
    "Analisa campanhas Klaviyo com Claude e gera novos copies baseados nos padrões que performaram melhor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
