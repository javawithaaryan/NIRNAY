"use client";

import { Badge, Card, CardHeader, EmptyState, PageHeader, type Tone } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { formatStamp } from "@/lib/scenario/format";
import type { PortalEvent } from "@/lib/scenario/events";

function eventTone(event: PortalEvent): Tone {
  switch (event.payload.type) {
    case "decision.superseded":
    case "reassessment.triggered":
      return "info";
    case "segment.state_changed":
      return event.payload.to === "BLOCKED" ? "danger" : "success";
    case "incident.verified":
    case "decision.acted":
    case "instruction.acknowledged":
      return "success";
    case "incident.reported":
    case "decision.recommended":
      return "warning";
    default:
      return "neutral";
  }
}

export function AuditPage() {
  const view = usePortalView();
  if (!view) return <p className="text-sm text-on-surface-variant">Loading audit trail…</p>;
  const events = [...view.events].reverse();

  return (
    <>
      <PageHeader title="Audit trail" subtitle="Append-only record of every incident, evidence, verification, network change, decision, approval, instruction, acknowledgement and reassessment in this browser." />
      <Card>
        <CardHeader title="Events" subtitle={`${events.length} recorded`} />
        {events.length === 0 ? (
          <EmptyState>No events recorded. Reset the demo to start the scenario.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-2.5 font-mono text-xs text-on-surface-variant">{event.seq ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{formatStamp(event.at)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={eventTone(event)}>{event.payload.type}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {event.actor.name}
                      <span className="block text-on-surface-variant">{event.actor.role.toLowerCase()}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm">{event.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
