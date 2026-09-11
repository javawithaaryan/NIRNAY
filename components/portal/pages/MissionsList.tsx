"use client";

import Link from "next/link";
import { responseStateLabel } from "@/components/portal/MissionTable";
import { Badge, Card, PageHeader, actionTone, feasibilityTone, impactTone, priorityTone } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { formatClock, formatHoursUntil } from "@/lib/scenario/format";
import { getPlace } from "@/lib/scenario/seed/nh29";

export function MissionsList() {
  const view = usePortalView();
  if (!view) return <p className="text-sm text-on-surface-variant">Loading missions…</p>;

  return (
    <>
      <PageHeader
        title="Missions"
        subtitle={`${view.summary.affectedMissions} of ${view.missions.length} missions affected by the current network state. Same disruption ≠ same decision.`}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {view.missions.map((item) => {
          const decision = item.activeDecision;
          return (
            <Card key={item.mission.id} as="article" className="flex flex-col">
              <div className="border-b border-outline-variant/40 bg-surface-container-low px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-bold text-primary-container">{item.mission.id}</span>
                  <Badge tone={priorityTone(item.mission.priority)}>{item.mission.priority}</Badge>
                </div>
                <p className="mt-1 text-sm font-semibold text-on-surface">{item.mission.cargo}</p>
                <p className="text-xs text-on-surface-variant">{item.mission.cargoDetail}</p>
              </div>
              <dl className="grid flex-1 grid-cols-2 gap-3 p-4 text-sm">
                <div>
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Vehicle</dt>
                  <dd>
                    {item.vehicle.name}
                    <span className="block text-xs text-on-surface-variant">
                      {item.vehicle.vehicleClass} · {item.vehicle.grossTonnes} t
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Route</dt>
                  <dd>
                    {getPlace(item.mission.originPlaceId).name} → {getPlace(item.mission.destinationPlaceId).name}
                    <span className="block text-xs text-on-surface-variant">Current: Route {item.currentRouteId}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Deadline</dt>
                  <dd className="font-mono">
                    {formatClock(item.deadlineAt)}
                    <span className="block font-sans text-xs text-on-surface-variant">{formatHoursUntil(item.deadlineAt, view.now)}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Impact</dt>
                  <dd>
                    <Badge tone={impactTone(item.impact.level)}>{item.impact.level}</Badge>
                    <span className="ml-1 font-mono text-xs text-on-surface-variant">Mi {item.impact.Mi.toFixed(2)}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Feasibility</dt>
                  <dd>
                    <Badge tone={feasibilityTone(decision ? decision.recommendation.feasibility : item.evaluations.find((e) => e.routeId === item.currentRouteId)?.feasibility ?? "UNDETERMINED")}>
                      {decision ? decision.recommendation.feasibility : item.evaluations.find((e) => e.routeId === item.currentRouteId)?.feasibility ?? "UNDETERMINED"}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Decision</dt>
                  <dd>
                    {decision ? (
                      <Badge tone={actionTone(decision.recommendation.action)}>
                        {decision.recommendation.action}
                        {decision.recommendation.routeId ? ` · Route ${decision.recommendation.routeId}` : ""}
                      </Badge>
                    ) : (
                      <Badge tone={item.responseState === "ON_TIME" ? "success" : "warning"}>{responseStateLabel(item)}</Badge>
                    )}
                  </dd>
                </div>
              </dl>
              {decision && (
                <p className="border-t border-outline-variant/40 px-4 py-3 text-xs text-on-surface-variant">
                  <span className="font-semibold text-primary-container">Why:</span> {decision.recommendation.why.slice(-2, -1)[0] ?? decision.recommendation.why[0]}
                </p>
              )}
              <div className="border-t border-outline-variant/40 bg-surface-container-low px-4 py-2.5">
                <Link href={`/missions/${item.mission.id}`} className="text-xs font-bold text-secondary hover:underline">
                  Mission detail, routes and WHY →
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
