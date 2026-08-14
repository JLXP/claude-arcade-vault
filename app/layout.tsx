import type { Metadata } from "next";
import { Press_Start_2P, JetBrains_Mono } from "next/font/google";
import { UserProvider } from "@/lib/user-context";
import "./globals.css";

const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Play games online and compete for the highest score.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixelFont.variable} ${monoFont.variable}`}>
      <body>
        <div className="av-bg" />
        <div className="av-noise" />
        <div id="root">
          <UserProvider>{children}</UserProvider>
        </div>
      </body>
    </html>
  );
}
