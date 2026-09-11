"use client";

import Link from "next/link";
import { Check, Circle, FileText } from "lucide-react";
import { Badge, Card, CardHeader, portalPrimaryButton } from "@/components/portal/ui";
import type { PortalState } from "@/lib/scenario/events";
import { formatStamp } from "@/lib/scenario/format";
import { buildIncidentIntelligence } from "@/lib/scenario/intelligence";
import type { IncidentView, PortalView } from "@/lib/scenario/view";

const kindTone: Record<string, string> = { ai: "bg-warning", human: "bg-success", system: "bg-secondary", field: "bg-primary-container" };

export function ResponseActionsPanel({ view, state, incidentView }: { view: PortalView; state: PortalState; incidentView: IncidentView }) {
  const intel = buildIncidentIntelligence(view, incidentView, state);
  return (
    <Card>
      <CardHeader
        title="Response actions & propagation"
        subtitle={`${incidentView.incident.reference} · what the system updated, notified and prepared. Simulated endpoints are labelled.`}
        actions={
          <Link href={`/incidents/${incidentView.incident.id}/report`} className={portalPrimaryButton} data-report-link>
            <FileText aria-hidden="true" className="size-4" />
            Generate incident report
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-2">
        <ul className="space-y-1.5" aria-label="Response actions">
          {intel.notifications.map((item) => (
            <li key={item.key} data-notification={item.key} data-notification-state={item.state} className="flex items-start gap-2 text-sm">
              {item.state === "done" ? <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" /> : <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-outline" />}
              <span>
                <span className={item.state === "done" ? "font-semibold text-on-surface" : "text-on-surface-variant"}>{item.label}</span>
                {item.simulated && <Badge tone="muted" className="ml-1.5">Simulated / demo data</Badge>}
                <span className="block text-xs text-on-surface-variant">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <ol className="space-y-1.5 border-l border-outline-variant/60 pl-3" aria-label="Timeline">
          {intel.timeline.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="relative text-xs">
              <span aria-hidden="true" className={`absolute -left-[0.95rem] top-1.5 size-2 rounded-full ${kindTone[entry.kind]}`} />
              <span className="font-mono text-on-surface-variant">{formatStamp(entry.at)}</span> <span className="font-semibold text-on-surface">{entry.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
