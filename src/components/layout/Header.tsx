import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-line bg-white/90 px-4 py-2 backdrop-blur-xl md:px-8">
      <Link href="/" aria-label="Accueil Bundle Events" className="shrink-0">
        <Image src="/favicon/favicon.svg" alt="Bundle Events" width={73} height={56} priority unoptimized style={{ width: "auto", height: 56 }} />
      </Link>
    </header>
  );
}
