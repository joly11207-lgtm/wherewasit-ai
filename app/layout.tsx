import type { ReactNode } from "react";
import type { Metadata } from "next";

import { PageViewTracker } from "@/components/PageViewTracker";
import { SiteFooter } from "@/components/SiteFooter";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WhereWasIt.ai",
    template: "%s | WhereWasIt.ai"
  },
  description: "Lost something? Retrace the clues, follow practical signals, and start your search with a calm plan.",
  metadataBase: new URL("https://wherewasit.ai"),
  openGraph: {
    title: "WhereWasIt.ai",
    description: "Lost something? Let's retrace the clues.",
    siteName: "WhereWasIt.ai",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PageViewTracker />
        <div className="min-h-screen">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
