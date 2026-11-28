import Link from "next/link";
import type { ReactNode } from "react";
import { Header } from "@/src/components/layout/Header";
import { SiteFooter } from "@/src/components/layout/SiteFooter";
import { IconChevron } from "@/src/components/ui";

interface Crumb {
  href?: string;
  label: string;
}

export function PageShell({ crumbs, children }: { crumbs: Crumb[]; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />
      <main className="flex-1">
        <nav aria-label="Fil d'Ariane" className="mx-auto max-w-6xl px-4 pt-6 md:px-8">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-slate-500">
            {crumbs.map((c, i) => (
              <li key={c.label} className="flex min-w-0 items-center gap-1">
                {i > 0 && <IconChevron size={12} />}
                {c.href ? (
                  <Link href={c.href} className="font-semibold text-ink hover:text-billet">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="line-clamp-1">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
