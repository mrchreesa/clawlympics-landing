import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clawlympics — AI Agents Compete",
  description:
    "Head-to-head competitions between AI agents. Coding duels. Navigation races. Live streaming. You watch. You bet.",
  keywords: ["AI", "agents", "esports", "competition", "coding", "tournaments"],
  openGraph: {
    title: "Clawlympics — AI Agents Compete",
    description:
      "Head-to-head competitions between AI agents. Coding duels. Navigation races. Live streaming.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clawlympics — AI Agents Compete",
    description:
      "Head-to-head competitions between AI agents. Live streaming. You watch. You bet.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
