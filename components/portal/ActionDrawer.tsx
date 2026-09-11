"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { Bell, X } from "lucide-react";
import { Badge, portalSecondaryButton, type Tone } from "@/components/portal/ui";
import type { ActionItem } from "@/lib/scenario/view";

const kindTone: Record<ActionItem["kind"], Tone> = {
  VERIFY: "warning",
  APPROVE: "danger",
  ACKNOWLEDGE: "info",
  REASSESSED: "info",
  NETWORK: "warning",
};

const kindLabel: Record<ActionItem["kind"], string> = {
  VERIFY: "Verification",
  APPROVE: "Approval",
  ACKNOWLEDGE: "Driver",
  REASSESSED: "Reassessment",
  NETWORK: "Network state",
};

export function ActionDrawer({ items }: { items: ActionItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const humanItems = items.filter((item) => item.kind !== "REASSESSED");

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className={`inline-flex items-center gap-2 rounded-xs border px-3.5 py-2 text-xs font-bold tracking-wide shadow-xs transition-colors ${
          humanItems.length > 0
            ? "border-warning-outline bg-warning-container text-warning hover:bg-warning-outline/60"
            : "border-outline-variant bg-surface-container-lowest text-on-surface-variant"
        }`}
      >
        <Bell aria-hidden="true" className="size-4" />
        Action required · {humanItems.length}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="m-0 ml-auto h-dvh max-h-dvh w-[26rem] max-w-[92vw] overflow-hidden border-l border-outline-variant/60 bg-surface-container-lowest p-0 text-on-surface shadow-2xl backdrop:bg-primary/50"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low px-5 py-4">
            <h2 id={titleId} className="text-base font-bold text-primary-container">
              Action required ({humanItems.length})
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
              className="rounded-xs p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary-container"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {items.length === 0 && <p className="py-8 text-center text-sm text-on-surface-variant">Nothing awaits an officer right now.</p>}
            {items.map((item) => (
              <article
                key={item.id}
                className={`rounded-xs border p-3.5 ${
                  item.severity === "critical" ? "border-error/40 bg-error-container/40" : "border-outline-variant/60 bg-surface-container-lowest"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={kindTone[item.kind]}>{kindLabel[item.kind]}</Badge>
                  {item.severity === "critical" && <Badge tone="danger">Critical</Badge>}
                </div>
                <h3 className="mt-2 text-sm font-bold text-primary-container">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{item.detail}</p>
                <Link href={item.href} onClick={() => dialogRef.current?.close()} className={`${portalSecondaryButton} mt-3 w-full`}>
                  Open →
                </Link>
              </article>
            ))}
          </div>
          <p className="border-t border-outline-variant/40 bg-surface-container-low px-5 py-3 text-[0.6875rem] text-on-surface-variant">
            Items are derived from the current prototype state. The engine recommends; officers verify and authorize.
          </p>
        </div>
      </dialog>
    </>
  );
}
