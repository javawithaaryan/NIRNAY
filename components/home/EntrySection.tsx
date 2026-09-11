"use client";

import { Camera, CloudUpload, Shield, ShieldCheck } from "lucide-react";
import { EntryCard } from "@/components/home/EntryCard";
import { LowConnectivityBanner } from "@/components/home/LowConnectivityBanner";
import { useSiteCopy } from "@/lib/i18n/siteCopy";
import { routes } from "@/lib/routes";

export function EntrySection() {
  const copy = useSiteCopy();

  return (
    <section aria-labelledby="entry-heading" className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h2 id="entry-heading" className="text-lg font-bold uppercase tracking-wide text-primary-container sm:text-xl">
          {copy.entry.heading}
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">{copy.entry.subheading}</p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:gap-8">
        <EntryCard
          id="report-incident"
          icon={Camera}
          noteIcon={CloudUpload}
          href={routes.fieldReport}
          {...copy.entry.report}
        />
        <EntryCard
          id="officer-portal"
          icon={Shield}
          noteIcon={ShieldCheck}
          href={routes.officerLogin}
          {...copy.entry.officer}
        />
      </div>

      <LowConnectivityBanner />
    </section>
  );
}
