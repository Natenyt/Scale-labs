import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Scale Labs",
  description:
    "Scale Labs — modular autonomous voice & chat agents for customer communication.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${fontSans.variable} ${fontMono.variable}`}
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground font-sans min-h-svh antialiased">
        <AuthProvider>
          <TooltipProvider delayDuration={120}>{children}</TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
