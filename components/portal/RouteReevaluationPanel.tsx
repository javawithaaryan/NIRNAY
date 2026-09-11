"use client";

import { ArrowDown, Hourglass, Route as RouteIcon } from "lucide-react";
import { CargoIcon, actionClass, decisionLabel } from "@/components/portal/MissionStory";
import { Badge, priorityTone } from "@/components/portal/ui";
import { formatClock } from "@/lib/scenario/format";
import { getPlace, getRoute, getSegment } from "@/lib/scenario/seed/nh29";
import { routeVerdict } from "@/lib/scenario/storyline";
import type { VehicleClass } from "@/lib/scenario/types";
import type { MissionView, PortalView } from "@/lib/scenario/view";

const vehicleWord: Record<VehicleClass, string> = { HCV: "heavy-vehicle", MCV: "medium-vehicle", LMV: "light-vehicle" };

function routePath(routeId: string): string {
  const route = getRoute(routeId);
  const names = route.segmentIds.map((id) => getPlace(getSegment(id).fromPlaceId).shortName);
  names.push(getPlace(getSegment(route.segmentIds[route.segmentIds.length - 1]).toPlaceId).shortName);
  return [...new Set(names)].join(" → ");
}

function MissionReevaluation({ mission, revealed }: { mission: MissionView; revealed: boolean }) {
  const decision = mission.activeDecision;
  if (!decision) return null;
  const rec = decision.recommendation;
  const verdicts = [...rec.evaluations].sort((a, b) => a.routeId.localeCompare(b.routeId)).map((evaluation) => ({ evaluation, verdict: routeVerdict(evaluation, mission.vehicle) }));
  const planned = verdicts.find((item) => item.evaluation.routeId === mission.mission.plannedRouteId);
  const alternatives = verdicts.filter((item) => item.evaluation.routeId !== mission.mission.plannedRouteId);
  const chosen = verdicts.find((item) => item.evaluation.routeId === rec.routeId);
  const instruction = mission.instruction;
  const status = !chosen
    ? null
    : decision.status === "APPROVED"
      ? instruction?.acknowledgedAt
        ? "✓ REROUTED · driver acknowledged"
        : "✓ APPROVED · driver instructed"
      : decision.status === "RECOMMENDED"
        ? "✓ REROUTE PREPARED · awaiting authority"
        : decision.status.replace("_", " ");

  return (
    <li data-reeval-mission={mission.mission.id} className={`flex flex-col gap-2 rounded-xs border p-3 text-xs ${revealed && chosen ? "border-secondary bg-secondary-container/15" : "border-outline-variant/60"}`}>
      <p className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono font-bold text-primary-container">{mission.mission.id}</span>
        <CargoIcon cargo={mission.mission.cargo} className="size-4 text-primary-container" />
        <span className="font-black uppercase text-primary-container">{mission.mission.cargo}</span>
      </p>
      <p className="flex flex-wrap gap-1">
        <Badge tone={priorityTone(mission.mission.priority)}>{mission.mission.priority}</Badge>
        <Badge tone="neutral">
          {mission.vehicle.vehicleClass} · {mission.vehicle.name}
        </Badge>
      </p>

      <div className="rounded-xs border border-error/30 bg-error-container/30 px-2 py-1.5">
        <p className="font-bold uppercase tracking-wider text-on-surface-variant">Original route</p>
        <p className="font-semibold">
          Route {mission.mission.plannedRouteId} · {getRoute(mission.mission.plannedRouteId).label} — <span className="font-black text-error">{planned?.verdict.glyph} {planned?.verdict.headline}</span>
        </p>
      </div>
      <ArrowDown aria-hidden="true" className="size-3.5 text-outline" />
      <div>
        <p className="font-bold uppercase tracking-wider text-on-surface-variant">Searching verified alternatives</p>
        <ul className="mt-0.5 space-y-0.5">
          {alternatives.map(({ evaluation, verdict }) => (
            <li key={evaluation.routeId} data-reeval-route={evaluation.routeId} className="arrive">
              {revealed ? (
                <>
                  <span aria-hidden="true">{verdict.glyph}</span> <b>Route {evaluation.routeId}</b> — {verdict.headline.toLowerCase()}
                  <span className="block pl-5 text-[0.6875rem] text-on-surface-variant">{verdict.reason}</span>
                </>
              ) : (
                <span className="flex items-center gap-1 text-on-surface-variant">
                  <Hourglass aria-hidden="true" className="size-3.5 text-secondary" /> Route {evaluation.routeId} — checking conditions, vehicle, evidence, ETA…
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <ArrowDown aria-hidden="true" className="size-3.5 text-outline" />
      {!revealed ? (
        <p className="font-bold uppercase tracking-wide text-secondary">Re-evaluating…</p>
      ) : chosen ? (
        <div className="arrive space-y-1.5">
          <p className="grid grid-cols-2 gap-1 text-[0.6875rem] font-semibold">
            <span>{chosen.verdict.checks.vehicle.ok ? "✓" : "✗"} Vehicle {mission.vehicle.vehicleClass}</span>
            <span>{chosen.verdict.checks.closure.ok ? "✓" : "✗"} Network OPEN</span>
            <span>{chosen.verdict.checks.evidence.ok ? "✓" : "⚠"} Evidence current</span>
            <span>{chosen.verdict.checks.deadline.ok ? "✓" : "✗"} Deadline achievable</span>
          </p>
          <div data-new-route-found className="rounded-xs border-2 border-secondary bg-surface-container-lowest px-2 py-1.5">
            <p className="text-sm font-black uppercase text-secondary">
              <RouteIcon aria-hidden="true" className="mr-1 inline size-4 align-text-bottom" />
              New route found · Route {rec.routeId}
            </p>
            <p className="font-semibold text-primary-container">{routePath(rec.routeId!)}</p>
            <p className="text-on-surface-variant">
              ETA <b className="font-mono">{rec.etaAt ? formatClock(rec.etaAt) : "—"}</b> · divert at {rec.divertPlaceId ? getPlace(rec.divertPlaceId).name : "—"}
            </p>
          </div>
          <p className="font-black uppercase text-primary-container">
            {mission.mission.id} route change: Route {mission.mission.plannedRouteId} → Route {rec.routeId}
          </p>
          <p data-reroute-status className="font-bold text-success">{status}</p>
        </div>
      ) : (
        <div className="arrive space-y-1">
          <p className="font-black uppercase text-on-error-container">No feasible verified {vehicleWord[mission.vehicle.vehicleClass]} route</p>
          <p className="text-[0.6875rem] text-on-surface-variant">Result: NO CURRENTLY VERIFIED FEASIBLE ROUTE — a safe abstention, not a routing failure.</p>
          <span className={`inline-block rounded-xs px-2 py-0.5 font-extrabold uppercase ${actionClass(rec.action)}`}>{decisionLabel(decision)}</span>
        </div>
      )}
    </li>
  );
}

export function RouteReevaluationPanel({ view, revealed }: { view: PortalView; revealed: boolean }) {
  const decided = view.missions.filter((mission) => mission.activeDecision);
  if (decided.length === 0) return null;
  const affected = view.missions.filter((mission) => mission.impact.affectedSegmentIds.length > 0).length;
  const found = decided.filter((mission) => mission.activeDecision?.recommendation.action === "REROUTE");
  const process = ["Affected missions detected", "Candidate alternatives generated", "Route conditions checked", "Vehicle restrictions checked", "ETA recalculated", "Best currently feasible alternative selected"];

  return (
    <section id="route-reevaluation" data-route-reevaluation className="arrive scroll-mt-20 overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-primary-container px-4 py-3 text-on-primary sm:px-5">
        <div>
          <p className="text-sm font-black uppercase tracking-wide">System response · live route re-evaluation</p>
          <p className="text-xs text-on-primary/80">Deterministic feasibility per mission and vehicle — hard constraints are checked before anything is ranked.</p>
        </div>
        <p className="flex flex-wrap gap-2 text-[0.6875rem] font-bold uppercase tracking-wider">
          <span className="rounded-xs bg-on-primary/15 px-2 py-1">Affected missions {affected}</span>
          <span className="rounded-xs bg-on-primary/15 px-2 py-1">Re-evaluation {revealed ? "complete" : "started"}</span>
          {revealed && <span className="rounded-xs bg-success px-2 py-1">Alternative routes found {found.length}</span>}
        </p>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        <ol className="flex flex-wrap gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wide">
          {process.map((step, index) => {
            const done = revealed || index === 0;
            return (
              <li key={step} className={`rounded-xs border px-2 py-0.5 ${done ? "border-success-outline bg-success-container text-success" : "border-outline-variant/60 text-outline"}`}>
                {done ? "✓ " : "⏳ "}
                {step}
              </li>
            );
          })}
        </ol>
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {decided.map((mission) => (
            <MissionReevaluation key={mission.mission.id} mission={mission} revealed={revealed} />
          ))}
        </ul>
        {revealed && found.length > 0 && (
          <p className="text-xs text-on-surface-variant">
            On the map: the new route for {found.map((mission) => mission.mission.id).join(", ")} is highlighted with its diversion point.{" "}
            <a href="#operational-map" className="font-bold text-secondary hover:underline">
              View on map ↑
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
