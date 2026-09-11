"use client";

import { useId, useRef } from "react";
import { CircleQuestionMark, Phone, X } from "lucide-react";
import { useSiteCopy } from "@/lib/i18n/siteCopy";

export function HelpdeskDialog() {
  const copy = useSiteCopy();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const openDialog = () => dialogRef.current?.showModal();
  const closeDialog = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={openDialog}
        className="inline-flex items-center gap-1 rounded-xs px-2 py-1 text-xs font-medium text-secondary transition-colors hover:bg-surface-container-low hover:text-primary-container"
      >
        <CircleQuestionMark aria-hidden="true" className="size-[1.0625rem]" />
        <span className="sr-only lg:not-sr-only">{copy.header.helpdesk}</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-0 text-on-surface shadow-2xl backdrop:bg-primary/60"
      >
        <div className="flex items-center justify-between gap-4 bg-primary-container px-6 py-4 text-on-primary">
          <h2 id={titleId} className="flex items-center gap-2.5 text-base font-bold">
            <CircleQuestionMark aria-hidden="true" className="size-5 text-secondary-container" />
            {copy.helpdesk.title}
          </h2>
          <button
            type="button"
            aria-label={copy.helpdesk.close}
            onClick={closeDialog}
            className="rounded-xs p-1 text-on-primary/80 transition-colors hover:text-on-primary"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="space-y-4 p-6 text-sm leading-relaxed text-on-surface-variant">
          <div className="rounded-xs border border-error/30 bg-error-container p-4 text-on-error-container">
            <p>{copy.helpdesk.emergency}</p>
            <a
              href="tel:112"
              className="mt-3 inline-flex items-center gap-2 rounded-xs bg-error px-4 py-2 text-sm font-bold text-on-primary transition-colors hover:bg-on-error-container"
            >
              <Phone aria-hidden="true" className="size-4" />
              {copy.helpdesk.emergencyAction}
            </a>
          </div>
          <p>{copy.helpdesk.reporting}</p>
          <p>{copy.helpdesk.officers}</p>
        </div>

        <div className="flex justify-end border-t border-outline-variant/40 bg-surface-container-low px-6 py-3">
          <button
            type="button"
            onClick={closeDialog}
            className="rounded-xs bg-primary-container px-4 py-2 text-xs font-bold uppercase tracking-wide text-on-primary transition-colors hover:bg-primary-container-hover active:bg-primary-container-active"
          >
            {copy.helpdesk.close}
          </button>
        </div>
      </dialog>
    </>
  );
}
