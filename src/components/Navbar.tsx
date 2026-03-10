"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

export function Navbar() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto flex items-center justify-between px-6 py-3 max-w-4xl">
        <a href={`/${locale}`} className="flex items-center gap-2 group">
          <Image
            src="/kuku-boy.png"
            alt="KUKU"
            width={28}
            height={28}
            className="transition-transform duration-300 group-hover:scale-110"
          />
          <span className="font-heading text-[15px] font-bold tracking-tight text-ink/80">
            KUKU便
          </span>
        </a>

        <div className="flex gap-0.5 text-[11px] tracking-wide">
          {(["ja", "en"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => switchLocale(lang)}
              className={`px-2.5 py-1 rounded-md font-medium uppercase transition-colors duration-150 ${
                locale === lang ? "text-ink" : "text-ink-light hover:text-ink-mid"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
