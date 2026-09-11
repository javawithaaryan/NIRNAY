"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Download, Printer } from "lucide-react";
import { PageHeader, portalPrimaryButton, portalSecondaryButton } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { useSession } from "@/lib/auth/session";
import { buildReportHtml } from "@/lib/scenario/report";
import { usePortalState } from "@/lib/scenario/store";

export function IncidentReport({ id }: { id: string }) {
  const view = usePortalView();
  const state = usePortalState();
  const session = useSession();

  const html = useMemo(() => {
    if (!view || !state || !session) return null;
    return buildReportHtml(view, state, id, `${session.name} (${session.role.toLowerCase()})`, view.now);
  }, [view, state, session, id]);

  if (!view || !state || !session) return <p className="text-sm text-on-surface-variant">Preparing report…</p>;
  if (!html) {
    return (
      <>
        <PageHeader title="Incident not found" />
        <Link href="/incidents" className="text-sm font-semibold text-secondary hover:underline">
          ← Back to incidents
        </Link>
      </>
    );
  }

  const reference = view.incidents.find((item) => item.incident.id === id)?.incident.reference ?? id;
  const download = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nirnyay-incident-report-${reference}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const print = () => {
    const frame = document.querySelector<HTMLIFrameElement>("[data-report-frame]");
    frame?.contentWindow?.print();
  };

  return (
    <>
      <PageHeader
        title={`Incident report · ${reference}`}
        subtitle="Prototype-generated from the current audit log and decision state. Labelled DEMO / SIMULATION; not an official record."
        actions={
          <>
            <Link href={`/incidents/${id}`} className="text-sm font-semibold text-secondary hover:underline">
              ← Incident
            </Link>
            <button type="button" onClick={print} className={portalSecondaryButton}>
              <Printer aria-hidden="true" className="size-4" />
              Print / save as PDF
            </button>
            <button type="button" onClick={download} className={portalPrimaryButton} data-report-download>
              <Download aria-hidden="true" className="size-4" />
              Download HTML
            </button>
          </>
        }
      />
      <iframe data-report-frame title={`Incident report ${reference}`} srcDoc={html} className="h-[80vh] w-full rounded-lg border border-outline-variant/60 bg-white" />
    </>
  );
}
