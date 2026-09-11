"use client";

import { fillTemplate } from "@/lib/field/format";
import { useFieldReportCopy } from "@/lib/i18n/fieldReportCopy";

type StepState = "complete" | "current" | "upcoming";

export function ReportStepper({ current }: { current: number }) {
  const copy = useFieldReportCopy();
  const total = copy.steps.names.length;

  return (
    <nav aria-label={copy.steps.progressLabel}>
      <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
        {fillTemplate(copy.steps.counter, { current, total })}
      </p>
      <ol className="mt-3 grid grid-cols-3 gap-1.5">
        {copy.steps.names.map((name, index) => {
          const stepNumber = index + 1;
          const state: StepState = stepNumber < current ? "complete" : stepNumber === current ? "current" : "upcoming";
          return (
            <li key={name} aria-current={state === "current" ? "step" : undefined}>
              <span
                aria-hidden="true"
                className={`block h-1 rounded-full ${state === "upcoming" ? "bg-outline-variant/50" : "bg-primary-container"}`}
              />
              <span
                className={`mt-1.5 hidden text-xs leading-snug sm:block ${
                  state === "current" ? "font-semibold text-primary-container" : "text-on-surface-variant"
                }`}
              >
                {name}
              </span>
              <span className="sr-only">
                {`${name} (${copy.steps.states[state]})`}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
