"use client";

import Link from "next/link";
import { ConnectivityStatus } from "@/components/site/ConnectivityStatus";
import { HelpdeskDialog } from "@/components/site/HelpdeskDialog";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { TextSizeControls } from "@/components/site/TextSizeControls";
import { useSiteCopy } from "@/lib/i18n/siteCopy";
import { routes } from "@/lib/routes";

export function SiteHeader() {
  const copy = useSiteCopy();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-xs focus:bg-primary-container focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-primary"
      >
        {copy.skipToContent}
      </a>
      <header className="sticky top-0 z-40 border-b border-outline-variant/40 bg-surface-container-lowest shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={routes.home}
              className="shrink-0 rounded-xs text-xl font-bold tracking-tight text-primary-container md:text-2xl"
            >
              NIRNYAY
            </Link>
            <span aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-outline-variant/60 md:block" />
            <div className="hidden min-w-0 flex-col justify-center gap-0.5 md:flex">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-secondary">
                {copy.header.descriptor}
              </p>
              <div className="hidden items-center gap-2 text-xs font-medium text-on-surface-variant xl:flex">
                <span className="truncate">{copy.header.sector}</span>
                <span className="shrink-0 rounded-xs border border-outline-variant/30 bg-surface-container-high px-1.5 py-px font-mono text-[0.6875rem] font-semibold text-primary-container">
                  SIH26002
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <TextSizeControls />
            <HelpdeskDialog />
            <ConnectivityStatus />
          </div>
        </div>
      </header>
    </>
  );
}
