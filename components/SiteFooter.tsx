"use client";

import Link from "next/link";

import { trackEvent } from "@/lib/analytics";

const footerLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-pine/10 bg-white/40 px-6 py-6 backdrop-blur md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-ink/65 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body">
          WhereWasIt.ai is a practical lost-item recovery assistant for public alpha testing.
        </p>
        <nav className="flex items-center gap-4 font-body">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-pine"
              onClick={() => trackEvent("footer_link_clicked", { href: link.href, label: link.label })}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
