"use client";

import Link from "next/link";
import { useState } from "react";
import { MissionIdentity } from "@/components/portal/MissionStory";
import { responseStateLabel } from "@/components/portal/MissionTable";
import { Badge, Card, CardHeader, PageHeader, actionTone, portalPrimaryButton, priorityTone } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { portalActions } from "@/lib/scenario/actions";
import { formatClock, formatStamp } from "@/lib/scenario/format";
import { getPlace, getRoute } from "@/lib/scenario/seed/nh29";

export function MonitoringPage() {
  const view = usePortalView();
  const [busy, setBusy] = useState<string | null>(null);
  if (!view) return <p className="text-sm text-on-surface-variant">Loading monitoring…</p>;

  const acknowledge = async (instructionId: string) => {
    setBusy(instructionId);
    try {
      await portalActions.acknowledgeInstruction(instructionId);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Monitoring"
        subtitle="Current response state of each mission and the driver instructions issued on approval. Driver acknowledgement is simulated from this screen in the prototype."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {view.missions.map((item) => {
          const decision = item.activeDecision;
          return (
            <Card key={item.mission.id} as="article">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <span className="font-mono">{item.mission.id}</span>
                    <Badge tone={priorityTone(item.mission.priority)}>{item.mission.priority}</Badge>
                  </span>
                }
                subtitle={`${item.mission.cargo} · ${item.vehicle.vehicleClass} · ${item.vehicle.name}`}
              />
              <div className="space-y-3 p-4 text-sm sm:p-5">
                <MissionIdentity mission={item} />
                <p data-monitoring-state={item.responseState} className="text-lg font-bold text-primary-container">{responseStateLabel(item)}</p>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Route</dt>
                    <dd>
                      {getRoute(item.currentRouteId).name} · {getRoute(item.currentRouteId).label}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">ETA</dt>
                    <dd className="font-mono">{item.etaAt ? formatClock(item.etaAt) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Decision</dt>
                    <dd>
                      {decision ? (
                        <Badge tone={actionTone(decision.recommendation.action)}>
                          {decision.recommendation.action} · {decision.status.replace("_", " ")}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Driver</dt>
                    <dd>{item.mission.driverName}</dd>
                  </div>
                </dl>
                {decision && (
                  <ol data-execution-chain={item.mission.id} className="grid grid-cols-2 gap-1 text-[0.6875rem] font-bold uppercase tracking-wide sm:grid-cols-4">
                    {[
                      { label: "System recommends", done: true },
                      { label: "Authority approves", done: decision.status === "APPROVED" },
                      { label: "Driver receives", done: Boolean(item.instruction) },
                      { label: "Driver acknowledges", done: Boolean(item.instruction?.acknowledgedAt) },
                    ].map((stage) => (
                      <li key={stage.label} className={`rounded-xs border px-1.5 py-1 text-center ${stage.done ? "border-success-outline bg-success-container text-success" : "border-outline-variant/60 text-outline"}`}>
                        {stage.done ? "✓ " : ""}
                        {stage.label}
                      </li>
                    ))}
                  </ol>
                )}
                {item.instruction && decision?.recommendation.action === "REROUTE" && decision.status === "APPROVED" && (
                  <div data-new-route className="rounded-xs border border-secondary/40 bg-secondary-container/20 p-3 text-xs">
                    <p className="text-sm font-black uppercase tracking-wide text-secondary">New route approved</p>
                    <p className="mt-0.5 font-bold text-primary-container">
                      {item.mission.id} · {item.mission.cargo}
                    </p>
                    <dl className="mt-1.5 grid grid-cols-2 gap-2">
                      <div>
                        <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Divert at</dt>
                        <dd className="font-semibold">{decision.recommendation.divertPlaceId ? getPlace(decision.recommendation.divertPlaceId).name : "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Route</dt>
                        <dd className="font-semibold">{decision.recommendation.routeId ? getRoute(decision.recommendation.routeId).label : "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">ETA</dt>
                        <dd className="font-mono">{decision.recommendation.etaAt ? formatClock(decision.recommendation.etaAt) : "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Driver</dt>
                        <dd className={`font-bold ${item.instruction.acknowledgedAt ? "text-success" : "text-warning"}`}>{item.instruction.acknowledgedAt ? "✓ Acknowledged" : "Acknowledgement required"}</dd>
                      </div>
                    </dl>
                  </div>
                )}
                {item.instruction ? (
                  <div className="rounded-xs border border-outline-variant/60 bg-surface-container-low p-3">
                    <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-primary-container">Driver instruction {item.instruction.id}</p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">{item.instruction.text}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">Issued {formatStamp(item.instruction.issuedAt)}</p>
                    {item.instruction.acknowledgedAt ? (
                      <p className="mt-2 text-xs font-semibold text-success">
                        DRIVER ACKNOWLEDGED · {item.instruction.acknowledgedBy} · {formatStamp(item.instruction.acknowledgedAt)}
                      </p>
                    ) : (
                      <button type="button" disabled={busy !== null} onClick={() => void acknowledge(item.instruction!.id)} className={`${portalPrimaryButton} mt-3 w-full`}>
                        Acknowledge as {item.mission.driverName} (simulated)
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant">
                    {decision?.status === "RECOMMENDED" ? "Instruction will be issued when the authority approves." : "No instruction issued."}
                  </p>
                )}
                <Link href={`/missions/${item.mission.id}`} className="inline-block text-xs font-bold text-secondary hover:underline">
                  Mission detail →
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
