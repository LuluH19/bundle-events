import Link from "next/link";
import { socialConfig } from "@/src/config";
import { IconInstagram } from "@/src/components/ui";

const LINKS = [
  { href: "/", label: "Organiser un voyage" },
  { href: "/evenements", label: "Événements" },
  { href: "/actualites", label: "Actualités" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-[13px] text-slate-500 sm:flex-row md:px-8">
        <span>© 2026 Bundle Events</span>
        <nav aria-label="Pied de page" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="font-semibold text-ink hover:text-billet">
              {l.label}
            </Link>
          ))}
        </nav>
        <a
          href={socialConfig.instagram.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Suivre Bundle Events sur ${socialConfig.instagram.label}`}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-ink transition-colors hover:bg-mist hover:text-billet"
        >
          <IconInstagram size={18} />
          {socialConfig.instagram.handle}
        </a>
      </div>
    </footer>
  );
}
