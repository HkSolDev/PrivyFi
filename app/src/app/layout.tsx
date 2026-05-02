import type { Metadata } from "next";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "PrivyFi | AI Yield Advisor",
  description: "Secure, private, AI-powered yield optimization on Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <WalletContextProvider>
          <TooltipProvider>
            {children}
            <Toaster theme="dark" position="bottom-right" />
          </TooltipProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
