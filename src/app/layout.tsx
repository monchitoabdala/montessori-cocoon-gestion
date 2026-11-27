import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/theme-context";
import { cn } from "@/utils";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import type React from "react";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Escuela Montessori Cocoon · Gestión Escolar",
  description:
    "Sistema de gestión escolar y cobranzas — Escuela Montessori Cocoon, Funes, Santa Fe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          "relative isolate min-h-screen bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100",
          outfit.className,
        )}
      >
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
