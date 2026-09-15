import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

// Fontes variáveis: ao declarar `axes`, o peso precisa ficar em "variable"
// (não é permitido combinar `axes` com uma lista fixa de pesos).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AtendeAI — atenda, tire dúvidas e venda mais com IA",
  description:
    "AtendeAI ajuda pequenos negócios a atender clientes, responder dúvidas e transformar conversas em vendas com o apoio de uma inteligência artificial.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
