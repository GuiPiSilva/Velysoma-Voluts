import type { Metadata } from "next";
import "./globals.css";
import "./painel/extras.css";

export const metadata: Metadata = {
  title: { default: "Velysoma Voluts — Pessoas, ministérios e propósito", template: "%s | Velysoma Voluts" },
  description: "Sua igreja mais organizada: pessoas, ministérios, programações e escalas em um só lugar.",
  applicationName: "Velysoma Voluts",
  icons: { icon: "/brand/velysoma-voluts.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
