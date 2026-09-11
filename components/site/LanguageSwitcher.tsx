"use client";

import { Fragment } from "react";
import { useSiteCopy } from "@/lib/i18n/siteCopy";
import { setLanguage, useLanguage, type Language } from "@/lib/preferences";

const languageOptions: { value: Language; label: string; shortLabel: string }[] = [
  { value: "en", label: "English", shortLabel: "EN" },
  { value: "hi", label: "हिंदी", shortLabel: "हिं" },
];

export function LanguageSwitcher() {
  const language = useLanguage();
  const copy = useSiteCopy();

  return (
    <div
      role="group"
      aria-label={copy.header.languageLabel}
      className="flex items-center rounded-xs border border-outline-variant/40 bg-surface-container-low px-1 py-0.5 text-xs"
    >
      {languageOptions.map((option, index) => {
        const isActive = language === option.value;
        return (
          <Fragment key={option.value}>
            {index > 0 && (
              <span aria-hidden="true" className="mx-0.5 text-outline-variant">
                |
              </span>
            )}
            <button
              type="button"
              lang={option.value}
              aria-label={option.label}
              aria-pressed={isActive}
              onClick={() => setLanguage(option.value)}
              className={`rounded-xs px-1.5 py-0.5 transition-colors ${
                isActive
                  ? "font-bold text-primary-container"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="sm:hidden">{option.shortLabel}</span>
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
