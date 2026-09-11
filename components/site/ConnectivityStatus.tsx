"use client";

import { useConnectivity, type ConnectivityState } from "@/lib/connectivity";
import { useSiteCopy } from "@/lib/i18n/siteCopy";

const toneClasses: Record<ConnectivityState, { pill: string; dot: string }> = {
  checking: { pill: "border-outline-variant/60 bg-surface-container-low text-on-surface-variant", dot: "bg-outline" },
  online: { pill: "border-success-outline bg-success-container text-success", dot: "bg-success" },
  weak: { pill: "border-warning-outline bg-warning-container text-warning", dot: "bg-warning" },
  offline: { pill: "border-error/40 bg-error-container text-on-error-container", dot: "bg-error" },
};

export function ConnectivityStatus() {
  const state = useConnectivity();
  const copy = useSiteCopy();
  const text = copy.status[state];
  const tone = toneClasses[state];

  return (
    <div
      role="status"
      aria-live="polite"
      title={copy.status.basis}
      className={`inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-xs font-medium ${tone.pill}`}
    >
      <span aria-hidden="true" className={`size-2 rounded-full ${tone.dot}`} />
      <span className="sr-only">{copy.status.label}: </span>
      <span className="lg:hidden">{text.short}</span>
      <span className="hidden lg:inline">{text.long}</span>
    </div>
  );
}
