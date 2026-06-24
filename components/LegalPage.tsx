import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  children
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-glow backdrop-blur sm:p-8 md:p-10">
        <Link
          href="/"
          className="font-body text-xs uppercase tracking-[0.28em] text-pine/60 transition hover:text-pine"
        >
          Back to WhereWasIt.ai
        </Link>
        <h1 className="mt-4 font-display text-4xl text-pine sm:text-5xl">{title}</h1>
        <p className="mt-3 font-body text-sm uppercase tracking-[0.2em] text-ink/45">
          Updated {updated}
        </p>
        <div className="mt-8 max-w-none font-body text-ink/80 [&>h2]:mt-8 [&>h2]:font-display [&>h2]:text-2xl [&>h2]:text-pine [&>p]:mt-4 [&>p]:leading-8">
          {children}
        </div>
      </div>
    </main>
  );
}
