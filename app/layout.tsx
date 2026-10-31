import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const chakraPetch = localFont({
  src: [
    { path: "./fonts/ChakraPetch-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/ChakraPetch-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-chakra-petch",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NetRunner",
  description: "Pierwszy chatbot na kursie LABA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={chakraPetch.variable}>
      <body>{children}</body>
    </html>
  );
}
