"use client";

import { useId, useRef } from "react";
import { Info, X } from "lucide-react";

export function AboutDemoDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        data-demo-badge
        aria-haspopup="dialog"
        title="About this demo"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex shrink-0 items-center gap-1 rounded-xs border border-warning-outline bg-warning-container px-2 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-warning transition-colors hover:bg-warning-container/70"
      >
        <Info aria-hidden="true" className="size-3.5" />
        Simulation
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-0 text-on-surface shadow-2xl backdrop:bg-primary/60"
      >
        <div className="flex items-center justify-between gap-4 bg-primary-container px-6 py-4 text-on-primary">
          <h2 id={titleId} className="flex items-center gap-2.5 text-base font-bold">
            <Info aria-hidden="true" className="size-5 text-secondary-container" />
            About this demo
          </h2>
          <button type="button" aria-label="Close" onClick={close} className="rounded-xs p-1 text-on-primary/80 transition-colors hover:text-on-primary">
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="space-y-3 p-6 text-sm leading-relaxed text-on-surface-variant">
          <p className="rounded-xs border border-warning-outline bg-warning-container p-3 font-semibold text-warning">
            This Round-1 prototype uses reconstructed scenario data, seeded data and simulated external feeds. It is not an official record of the historical incident.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>The scenario reconstructs the September 2024 NH-29 (Nagaland) disruption. NIRNYAY did not operate during the historical event.</li>
            <li>Weather, institutional / government, logistics, second-report and historical context are simulated or seeded and are labelled SIMULATED / DEMO DATA where they appear.</li>
            <li>Corridor geometry is demo-only and schematic. The Northeast orientation map shows indicative state outlines, not authoritative boundaries.</li>
            <li>Field reports submitted from /field/report on this browser are real device data. Decision logic runs in this browser; state is stored locally (IndexedDB). No government, weather or logistics API is connected.</li>
            <li>AI analysis is assistive. Official verification is an authorized officer action; route feasibility is deterministic; authorization is an authority action.</li>
          </ul>
          <p className="text-xs">The generated incident report carries the full disclosure. Presenters: open /demo to show the presentation control.</p>
        </div>
      </dialog>
    </>
  );
}
