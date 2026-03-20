import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentCanvas UI | NexusBoard",
  description: "Post-Chat UI: The canvas is the system, the node is the component.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased font-sans"
      >
        {children}
      </body>
    </html>
  );
}
