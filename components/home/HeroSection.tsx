"use client";

import { Fragment } from "react";
import { Waypoints } from "lucide-react";
import { useSiteCopy } from "@/lib/i18n/siteCopy";

export function HeroSection() {
  const copy = useSiteCopy();

  return (
    <section
      aria-labelledby="hero-heading"
      className="mx-auto w-full max-w-5xl px-4 pb-10 pt-12 text-center sm:px-6 md:pt-16 lg:px-8"
    >
      <p className="mb-6 inline-flex items-center gap-2 rounded-xs border border-outline-variant/40 bg-surface-container-high px-3 py-1 text-xs font-semibold tracking-wide text-on-surface-variant">
        <Waypoints aria-hidden="true" className="size-4 shrink-0 text-secondary" />
        {copy.hero.eyebrow}
      </p>
      <h1
        id="hero-heading"
        className="text-3xl font-extrabold uppercase leading-tight tracking-tight text-primary-container sm:text-4xl md:text-5xl md:leading-tight"
      >
        {copy.hero.headlineLines.map((line, index) => (
          <Fragment key={line}>
            {index > 0 && <br className="hidden sm:inline" />}
            {index > 0 && " "}
            {line}
          </Fragment>
        ))}
      </h1>
      <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-on-surface-variant sm:text-lg md:text-xl">
        {copy.hero.summary}
      </p>
    </section>
  );
}
