"use client";

import { useSiteCopy } from "@/lib/i18n/siteCopy";
import { setTextScale, useTextScale, type TextScale } from "@/lib/preferences";

export function TextSizeControls() {
  const textScale = useTextScale();
  const copy = useSiteCopy();

  const scaleOptions: { value: TextScale; label: string; glyph: string; glyphClass: string }[] = [
    { value: "small", label: copy.header.decreaseText, glyph: "A-", glyphClass: "text-[0.6875rem] font-semibold" },
    { value: "default", label: copy.header.defaultText, glyph: "A", glyphClass: "text-xs font-bold" },
    { value: "large", label: copy.header.increaseText, glyph: "A+", glyphClass: "text-sm font-bold" },
  ];

  return (
    <div
      role="group"
      aria-label={copy.header.textSizeLabel}
      className="hidden items-center rounded-xs border border-outline-variant/40 bg-surface-container-low px-1.5 py-0.5 text-on-surface-variant lg:flex"
    >
      <span aria-hidden="true" className="mr-1 text-[0.625rem] font-bold uppercase tracking-wider text-outline">
        {copy.header.textSizeShort}
      </span>
      {scaleOptions.map((option) => {
        const isActive = textScale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={isActive}
            title={option.label}
            onClick={() => setTextScale(option.value)}
            className={`rounded-xs px-1.5 py-0.5 leading-none transition-colors hover:text-primary-container ${option.glyphClass} ${
              isActive ? "bg-surface-container-lowest text-primary-container shadow-xs" : ""
            }`}
          >
            {option.glyph}
          </button>
        );
      })}
    </div>
  );
}
