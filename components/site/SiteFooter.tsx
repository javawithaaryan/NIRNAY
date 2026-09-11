"use client";

import { useSiteCopy } from "@/lib/i18n/siteCopy";

export function SiteFooter() {
  const copy = useSiteCopy();

  return (
    <footer className="border-t border-outline-variant/40 bg-surface-container-lowest">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-xs text-on-surface-variant sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:px-8">
        <p>{copy.footer.programme}</p>
        <p className="font-medium">{copy.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
