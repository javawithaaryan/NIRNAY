"use client";

import { Check, CircleAlert, CircleQuestionMark } from "lucide-react";
import { Badge, GeometryTag, feasibilityTone, roadStateTone } from "@/components/portal/ui";
import { formatDuration } from "@/lib/scenario/format";
import type { MissionView, RouteView } from "@/lib/scenario/view";

export function RouteComparison({ routes, mission }: { routes: RouteView[]; mission: MissionView }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {routes.map((routeView) => {
        const evaluation = mission.evaluations.find((item) => item.routeId === routeView.route.id);
        const isPlanned = routeView.route.id === mission.mission.plannedRouteId;
        const isChosen = mission.activeDecision?.recommendation.routeId === routeView.route.id;
        return (
          <article
            key={routeView.route.id}
            data-route-card={routeView.route.id}
            className={`flex flex-col rounded-lg border bg-surface-container-lowest ${
              isChosen ? "border-secondary shadow-md" : evaluation?.feasibility === "INFEASIBLE" ? "border-error/30" : "border-outline-variant/60"
            }`}
          >
            <div className="border-b border-outline-variant/40 bg-surface-container-low px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-primary-container">
                  {routeView.route.name} · {routeView.route.label}
                </h3>
                {isPlanned && <Badge tone="neutral">Planned</Badge>}
                {isChosen && <Badge tone="info">Recommended</Badge>}
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">{routeView.route.description}</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {evaluation && <Badge tone={feasibilityTone(evaluation.feasibility)}>{evaluation.feasibility}</Badge>}
                <Badge tone={roadStateTone(routeView.worstState as never)}>{routeView.worstState.replace("_", " ")}</Badge>
                <GeometryTag source={routeView.route.geometrySource} />
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Distance</dt>
                  <dd className="font-mono text-sm">{routeView.distanceKm} km</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Travel time</dt>
                  <dd className="font-mono text-sm">{formatDuration(routeView.travelMin)}</dd>
                </div>
              </dl>
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Segments</p>
                <ul className="mt-1 space-y-1">
                  {routeView.segments.map((segment) => (
                    <li key={segment.segment.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{segment.segment.name}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {segment.segment.restriction?.maxVehicleClass && (
                          <Badge tone="info">{segment.segment.restriction.maxVehicleClass} only</Badge>
                        )}
                        <Badge tone={roadStateTone(segment.effectiveState)}>{segment.effectiveState.replace("_", " ")}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {evaluation && (
                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Assessment for {mission.mission.id} ({mission.vehicle.vehicleClass})
                  </p>
                  <ul className="mt-1 space-y-1.5 text-xs">
                    {evaluation.reasons.map((reason, index) => (
                      <li key={`${index}-${reason.text}`} className="flex gap-1.5">
                        {reason.ok === true && <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-success" />}
                        {reason.ok === false && <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-error" />}
                        {reason.ok === null && <CircleQuestionMark aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />}
                        <span>{reason.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
