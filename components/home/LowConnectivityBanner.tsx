"use client";

import { Database, Signal } from "lucide-react";
import { useDeviceStorage, type DeviceStorageState } from "@/lib/deviceStorage";
import { useSiteCopy } from "@/lib/i18n/siteCopy";

const storageTone: Record<DeviceStorageState, { text: string; icon: string }> = {
  checking: { text: "text-on-surface-variant", icon: "text-outline" },
  available: { text: "text-secondary", icon: "text-success" },
  unavailable: { text: "text-warning", icon: "text-warning" },
};

export function LowConnectivityBanner() {
  const copy = useSiteCopy();
  const storageState = useDeviceStorage();
  const tone = storageTone[storageState];

  return (
    <aside
      aria-labelledby="connectivity-heading"
      className="mt-8 flex flex-col items-start justify-between gap-4 rounded-lg border border-outline-variant/50 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex items-start gap-3 sm:items-center">
        <Signal aria-hidden="true" className="size-6 shrink-0 text-secondary" />
        <div>
          <h3 id="connectivity-heading" className="text-xs font-bold uppercase tracking-wider text-primary-container">
            {copy.connectivity.title}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">{copy.connectivity.body}</p>
        </div>
      </div>
      <p
        role="status"
        aria-live="polite"
        title={copy.connectivity.storage.basis}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xs border border-outline-variant/40 bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold ${tone.text}`}
      >
        <Database aria-hidden="true" className={`size-[0.9375rem] ${tone.icon}`} />
        {copy.connectivity.storage[storageState]}
      </p>
    </aside>
  );
}
