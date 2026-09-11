"use client";

import { Check } from "lucide-react";
import { categoryIcons } from "@/components/field/categoryIcons";
import { fillTemplate } from "@/lib/field/format";
import { incidentCategories, type IncidentCategory } from "@/lib/field/types";
import { useFieldReportCopy } from "@/lib/i18n/fieldReportCopy";

export const maxNoteLength = 500;

type ObservationStepProps = {
  category: IncidentCategory | null;
  note: string;
  onCategoryChange: (category: IncidentCategory | null) => void;
  onNoteChange: (note: string) => void;
};

function OptionalTag({ label }: { label: string }) {
  return (
    <span className="ml-2 rounded-xs bg-surface-container-high px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">
      {label}
    </span>
  );
}

export function ObservationStep({ category, note, onCategoryChange, onNoteChange }: ObservationStepProps) {
  const copy = useFieldReportCopy();

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold text-on-surface">
          {copy.observation.categoryLabel}
          <OptionalTag label={copy.optional} />
        </legend>
        <p className="mt-1 text-xs text-on-surface-variant">{copy.observation.categoryHint}</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {incidentCategories.map((option) => {
            const Icon = categoryIcons[option];
            const isSelected = category === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onCategoryChange(isSelected ? null : option)}
                className={`flex min-h-20 flex-col justify-between gap-2 rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-2 border-primary-container bg-primary-container/5"
                    : "border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low"
                }`}
              >
                <span className="flex w-full items-center justify-between">
                  <Icon aria-hidden="true" className={`size-6 ${isSelected ? "text-primary-container" : "text-secondary"}`} />
                  {isSelected && <Check aria-hidden="true" className="size-4 text-primary-container" />}
                </span>
                <span className={`text-xs font-bold uppercase ${isSelected ? "text-primary-container" : "text-on-surface"}`}>
                  {copy.observation.categories[option]}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="observation-note" className="text-sm font-semibold text-on-surface">
          {copy.observation.noteLabel}
          <OptionalTag label={copy.optional} />
        </label>
        <textarea
          id="observation-note"
          value={note}
          maxLength={maxNoteLength}
          rows={4}
          aria-describedby="observation-note-hint"
          placeholder={copy.observation.notePlaceholder}
          onChange={(event) => onNoteChange(event.target.value)}
          className="mt-2 w-full rounded-xs border border-outline-variant bg-surface-container-low p-3 text-sm leading-relaxed text-on-surface placeholder:text-outline focus:border-secondary"
        />
        <div className="mt-1 flex items-start justify-between gap-3 text-xs text-on-surface-variant">
          <span id="observation-note-hint">{copy.observation.noteHint}</span>
          <span className="shrink-0 tabular-nums">
            {fillTemplate(copy.observation.noteCounter, { count: note.length, max: maxNoteLength })}
          </span>
        </div>
      </div>
    </div>
  );
}
