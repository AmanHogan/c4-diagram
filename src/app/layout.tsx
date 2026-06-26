import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "C4 Diagram",
  description: "Open Source, Free tool to visualize and track C4 model diagrams for software architecture.",
};

/**
 * Root layout. Wraps the app in client providers and base styles.
 * @param props Contains the route subtree as `children`.
 * @returns The HTML document shell.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
