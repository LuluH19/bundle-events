import { socialConfig } from "@/src/config";
import { IconInstagram } from "@/src/components/ui";

const BOTTOM_SPACE = {
  none: "pb-8",
  mobile: "pb-28 lg:pb-8",
  always: "pb-28",
} as const;

export function Footer({ bottomSpace = "none" }: { bottomSpace?: keyof typeof BOTTOM_SPACE }) {
  return (
    <footer className={`border-t border-line pt-8 ${BOTTOM_SPACE[bottomSpace]}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-[13px] text-slate-500 sm:flex-row md:px-8">
        <span>© 2026 Bundle Events</span>
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
