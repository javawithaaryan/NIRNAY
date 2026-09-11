"use client";

import Link from "next/link";
import { DecisionCard } from "@/components/portal/DecisionCard";
import { responseStateLabel } from "@/components/portal/MissionTable";
import { RouteComparison } from "@/components/portal/RouteComparison";
import { Badge, Card, CardHeader, KeyValue, PageHeader, impactTone, priorityTone } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { useSession } from "@/lib/auth/session";
import { impactWeights, priorityWeights } from "@/lib/scenario/engine/scoring";
import { formatClock, formatHoursUntil, formatStamp } from "@/lib/scenario/format";
import { getPlace } from "@/lib/scenario/seed/nh29";

export function MissionDetail({ id }: { id: string }) {
  const view = usePortalView();
  const session = useSession();

  if (!view || !session) return <p className="text-sm text-on-surface-variant">Loading mission…</p>;
  const item = view.missions.find((mission) => mission.mission.id === id);
  if (!item) {
    return (
      <>
        <PageHeader title="Mission not found" />
        <Link href="/missions" className="text-sm font-semibold text-secondary hover:underline">
          ← Back to missions
        </Link>
      </>
    );
  }

  const history = [...item.decisions].reverse();

  return (
    <>
      <PageHeader
        title={`${item.mission.id} · ${item.mission.cargo}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={priorityTone(item.mission.priority)}>{item.mission.priority}</Badge>
            <Badge tone={impactTone(item.impact.level)}>Impact {item.impact.level}</Badge>
            <span>{responseStateLabel(item)}</span>
          </span>
        }
        actions={
          <Link href="/missions" className="text-sm font-semibold text-secondary hover:underline">
            ← All missions
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Mission" />
          <dl className="grid grid-cols-2 gap-3 p-4 text-sm sm:p-5">
            <KeyValue label="Cargo">{item.mission.cargoDetail}</KeyValue>
            <KeyValue label="Origin → destination">
              {getPlace(item.mission.originPlaceId).name} → {getPlace(item.mission.destinationPlaceId).name}
            </KeyValue>
            <KeyValue label="Deadline" mono>
              {formatClock(item.deadlineAt)} <span className="font-sans text-xs text-on-surface-variant">({formatHoursUntil(item.deadlineAt, view.now)})</span>
            </KeyValue>
            <KeyValue label="Planned route">Route {item.mission.plannedRouteId}</KeyValue>
            <KeyValue label="Current route">Route {item.currentRouteId}</KeyValue>
            <KeyValue label="ETA on current route" mono>
              {item.etaAt ? formatClock(item.etaAt) : "— (not verified feasible)"}
            </KeyValue>
            <div className="col-span-2">
              <KeyValue label="Assigned vehicle">
                {item.vehicle.name} · {item.vehicle.vehicleClass} · {item.vehicle.grossTonnes} t · {item.vehicle.wheels} wheels
                <span className="mt-0.5 block text-xs font-normal text-on-surface-variant">Fixed for the primary scenario (M-101 HCV · M-102 MCV · M-103 LMV).</span>
              </KeyValue>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Mission impact" subtitle="Mi = 0.30 Q + 0.20 U + 0.20 T + 0.15 R + 0.15 G (prototype policy)" />
          <div className="p-4 sm:p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary-container">{item.impact.Mi.toFixed(2)}</span>
              <Badge tone={impactTone(item.impact.level)}>{item.impact.level}</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
              {(["Q", "U", "T", "R", "G"] as const).map((factor) => (
                <div key={factor} className="rounded-xs border border-outline-variant/40 bg-surface-container-low p-2">
                  <dt className="font-bold text-primary-container">
                    {factor} <span className="font-normal text-on-surface-variant">×{impactWeights[factor]}</span>
                  </dt>
                  <dd className="font-mono">{item.impact[factor].toFixed(2)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[0.6875rem] text-on-surface-variant">
              Q criticality · U urgency (deadline slack {item.impact.slackHours.toFixed(1)} h) · T time sensitivity · R route dependency · G consequence exposure
            </p>
            <p className="mt-3 border-t border-outline-variant/40 pt-3 text-sm">
              Operational priority P = {priorityWeights.D} D + {priorityWeights.Mi} Mi = <span className="font-mono font-bold">{item.priority.P.toFixed(2)}</span>{" "}
              <Badge tone={item.priority.tier === "CRITICAL" ? "danger" : item.priority.tier === "HIGH" ? "warning" : "neutral"}>{item.priority.tier}</Badge>
            </p>
            <p className="mt-1 text-[0.6875rem] text-on-surface-variant">Priority orders preparation. It never overrides a hard constraint.</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Response state" />
          <div className="space-y-3 p-4 text-sm sm:p-5">
            <p className="text-lg font-bold text-primary-container">{responseStateLabel(item)}</p>
            {item.impact.affectedSegmentIds.length > 0 && (
              <p className="text-xs text-on-surface-variant">Affected segments on planned route: {item.impact.affectedSegmentIds.join(", ")}</p>
            )}
            {item.instruction && (
              <div className="rounded-xs border border-outline-variant/40 bg-surface-container-low p-3 text-xs">
                <p className="font-semibold text-primary-container">
                  {item.instruction.id} · issued {formatStamp(item.instruction.issuedAt)}
                </p>
                <p className="mt-1 text-on-surface">{item.instruction.text}</p>
                <p className="mt-1 text-on-surface-variant">
                  {item.instruction.acknowledgedAt
                    ? `Acknowledged by ${item.instruction.acknowledgedBy} at ${formatStamp(item.instruction.acknowledgedAt)}`
                    : "Awaiting driver acknowledgement"}
                </p>
              </div>
            )}
            {!item.activeDecision && item.impact.affectedSegmentIds.length === 0 && (
              <p className="text-xs text-on-surface-variant">No network change affects this mission. It continues on its planned route.</p>
            )}
          </div>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary-container">Candidate routes for {item.mission.id} ({item.vehicle.name})</h2>
        <RouteComparison routes={view.routes} mission={item} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary-container">Decisions</h2>
        {history.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No decision has been recommended for this mission yet.</p>
        ) : (
          history.map((decision) => <DecisionCard key={decision.id} decision={decision} showMission={false} />)
        )}
      </section>
    </>
  );
}
