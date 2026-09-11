"use client";

import { Check, CircleAlert, TriangleAlert } from "lucide-react";
import { Badge, feasibilityTone, impactTone, priorityTone } from "@/components/portal/ui";
import type { PortalState } from "@/lib/scenario/events";
import { formatClock, formatStamp } from "@/lib/scenario/format";
import { getPlace, getRoute, getSegment } from "@/lib/scenario/seed/nh29";
import { routeVerdict, type RouteCheck, type TimelineStep } from "@/lib/scenario/storyline";
import type { DecisionRecord, Priority, Vehicle } from "@/lib/scenario/types";
import type { MissionView } from "@/lib/scenario/view";

const priorityDot: Record<Priority, string> = { CRITICAL: "bg-error", HIGH: "bg-warning", NORMAL: "bg-success" };

export function decisionLabel(decision: DecisionRecord): string {
  const rec = decision.recommendation;
  return `${rec.action}${rec.routeId ? ` via Route ${rec.routeId}` : ""}${rec.followUp.length ? ` + ${rec.followUp.join(" / ")}` : ""}`;
}

export function actionClass(action: string): string {
  if (action === "HOLD") return "bg-error text-on-primary";
  if (action === "REROUTE") return "bg-secondary text-on-primary";
  return "bg-success text-on-primary";
}

export function missionPosition(mission: MissionView): string {
  const rec = mission.activeDecision?.recommendation;
  if (rec?.action === "HOLD" && rec.stagingPlaceId && mission.activeDecision?.status === "APPROVED") return `Holding at ${getPlace(rec.stagingPlaceId).name}`;
  const segment = getSegment(mission.mission.positionSegmentId);
  return `${segment.name} (${segment.corridor})`;
}

export function MissionIdentity({ mission, compact = false }: { mission: MissionView; compact?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className={`size-2.5 rounded-full ${priorityDot[mission.mission.priority]}`} />
        <span className="font-mono text-sm font-bold text-primary-container">{mission.mission.id}</span>
        <span className="text-sm font-black uppercase tracking-wide text-primary-container">{mission.mission.cargo}</span>
      </p>
      <p className="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge tone={priorityTone(mission.mission.priority)}>{mission.mission.priority} priority</Badge>
        <Badge tone="neutral">
          {mission.vehicle.vehicleClass} · {mission.vehicle.name}
        </Badge>
      </p>
      {!compact && (
        <p className="text-xs text-on-surface-variant">
          {getPlace(mission.mission.originPlaceId).name} → {getPlace(mission.mission.destinationPlaceId).name} · deadline {formatStamp(mission.deadlineAt)} · {mission.mission.cargoDetail.toLowerCase()}
        </p>
      )}
    </div>
  );
}

export function MissionImpactCards({ missions, selectedMissionId, onSelectMission }: { missions: MissionView[]; selectedMissionId?: string | null; onSelectMission?: (id: string) => void }) {
  return (
    <ul aria-label="Missions" className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {missions.map((mission) => {
        const decision = mission.activeDecision;
        const affected = mission.impact.affectedSegmentIds.length > 0;
        const selected = selectedMissionId === mission.mission.id;
        return (
          <li key={mission.mission.id} className="arrive">
            <button
              type="button"
              data-mission-row={mission.mission.id}
              aria-pressed={selected}
              onClick={() => onSelectMission?.(mission.mission.id)}
              className={`flex h-full w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors ${
                selected ? "border-secondary bg-secondary-container/20" : affected ? "border-error/40 bg-surface-container-lowest hover:bg-surface-container-low" : "border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low"
              }`}
            >
              <MissionIdentity mission={mission} />
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Impact</dt>
                  <dd className="mt-0.5">{affected ? <Badge tone={impactTone(mission.impact.level)}>{mission.impact.level}</Badge> : <Badge tone="success">NONE</Badge>}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Feasibility</dt>
                  <dd className="mt-0.5">{decision ? <Badge tone={feasibilityTone(decision.recommendation.feasibility)}>{decision.recommendation.feasibility}</Badge> : "—"}</dd>
                </div>
              </dl>
              <div className="mt-auto">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Decision</p>
                {decision ? (
                  <span className={`mt-0.5 inline-block rounded-xs px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide ${actionClass(decision.recommendation.action)}`}>{decisionLabel(decision)}</span>
                ) : (
                  <span className="mt-0.5 inline-block rounded-xs bg-success-container px-2 py-0.5 text-xs font-bold uppercase text-success">{affected ? "Assessing" : "On time · Route A"}</span>
                )}
                {decision?.recommendation.noVerifiedFeasibleRoute && <p className="mt-1 text-[0.6875rem] font-bold text-on-error-container">NO CURRENTLY VERIFIED FEASIBLE ROUTE</p>}
                {decision && <RouteLine decision={decision} vehicle={mission.vehicle} />}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RouteLine({ decision, vehicle }: { decision: DecisionRecord; vehicle: Vehicle }) {
  const verdicts = [...decision.recommendation.evaluations].sort((a, b) => a.routeId.localeCompare(b.routeId)).map((evaluation) => routeVerdict(evaluation, vehicle));
  const key =
    verdicts.find((verdict) => verdict.routeId === decision.recommendation.routeId) ??
    verdicts.find((verdict) => verdict.headline.startsWith("INFEASIBLE · VEHICLE")) ??
    verdicts[verdicts.length - 1];
  return (
    <p data-route-line className="mt-1 text-[0.6875rem] text-on-surface-variant">
      <span className="font-bold text-on-surface">{verdicts.map((verdict) => `${verdict.routeId} ${verdict.glyph}`).join("  ")}</span>
      {key && (
        <span className="block">
          Route {key.routeId}: {key.glyph === "✅" ? `feasible for ${vehicle.vehicleClass}` : key.headline.startsWith("INFEASIBLE · VEHICLE") ? `vehicle-infeasible (${vehicle.vehicleClass})` : key.headline.toLowerCase()}
        </span>
      )}
    </p>
  );
}

function CheckIcon({ check }: { check: RouteCheck }) {
  if (check.ok === true) return <Check aria-label="pass" className="mx-auto size-4 text-success" />;
  if (check.ok === false) return <CircleAlert aria-label="fail" className="mx-auto size-4 text-error" />;
  return <TriangleAlert aria-label="unverified" className="mx-auto size-4 text-warning" />;
}

export function RouteFeasibilityBlock({ decision, vehicle }: { decision: DecisionRecord; vehicle: Vehicle }) {
  const rec = decision.recommendation;
  const verdicts = [...rec.evaluations].sort((a, b) => a.routeId.localeCompare(b.routeId)).map((evaluation) => ({ evaluation, verdict: routeVerdict(evaluation, vehicle) }));
  const chosen = verdicts.find((item) => item.evaluation.routeId === rec.routeId);
  const planned = verdicts[0];

  return (
    <div data-route-feasibility className="space-y-3">
      <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">Route feasibility for {vehicle.vehicleClass} · {vehicle.name}</p>
      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {verdicts.map(({ evaluation, verdict }) => {
          const route = getRoute(evaluation.routeId);
          return (
            <li
              key={evaluation.routeId}
              data-route-verdict={evaluation.routeId}
              className={`rounded-xs border px-3 py-2 ${verdict.glyph === "✅" ? "border-success-outline bg-success-container/40" : verdict.glyph === "⚠️" ? "border-warning-outline bg-warning-container/40" : "border-error/30 bg-error-container/30"}`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-primary-container">
                {route.name.replace("Route ", "")} · {route.label}
              </p>
              <p className="mt-0.5 text-sm font-black">
                <span aria-hidden="true">{verdict.glyph}</span> {verdict.headline}
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">{verdict.reason}</p>
            </li>
          );
        })}
      </ul>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-xs" aria-label="Hard constraint check">
          <thead>
            <tr className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">
              <th className="py-1 pr-2 text-left">Hard constraint check</th>
              {verdicts.map(({ evaluation }) => (
                <th key={evaluation.routeId} className="px-2 py-1 text-center">
                  Route {evaluation.routeId}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {(["closure", "vehicle", "evidence", "deadline"] as const).map((key) => (
              <tr key={key}>
                <th className="py-1 pr-2 text-left font-semibold text-on-surface">
                  {{ closure: "Confirmed closure", vehicle: "Vehicle class / weight restriction", evidence: "Evidence freshness", deadline: "Deadline" }[key]}
                </th>
                {verdicts.map(({ evaluation, verdict }) => (
                  <td key={evaluation.routeId} className="px-2 py-1 text-center" title={verdict.checks[key].label}>
                    <CheckIcon check={verdict.checks[key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-[0.6875rem] text-on-surface-variant">Hard constraints are applied before any ranking. Priority, urgency or AI confidence cannot override them.</p>
      </div>

      {rec.action === "REROUTE" && chosen ? (
        <div className="rounded-xs border border-secondary/30 bg-secondary-container/20 p-3 text-xs">
          <p className="font-bold uppercase tracking-wider text-primary-container">Why this route?</p>
          <ul className="mt-1 grid grid-cols-1 gap-0.5 sm:grid-cols-2">
            <li>{planned && planned.verdict.glyph === "❌" ? "✓ Original corridor blocked" : "✓ Original corridor unavailable"}</li>
            <li>{chosen.verdict.checks.vehicle.ok ? "✓ Vehicle compatible" : "✗ Vehicle restricted"}</li>
            <li>{chosen.verdict.checks.evidence.ok ? "✓ Evidence current" : "⚠ Evidence unverified"}</li>
            <li>{chosen.verdict.checks.deadline.ok ? "✓ Deadline achievable" : "✗ Deadline at risk"}</li>
            <li>✓ No hard constraint violated</li>
          </ul>
          <p className="mt-1.5 text-sm font-black uppercase text-secondary">Therefore: reroute via Route {rec.routeId}</p>
        </div>
      ) : rec.noVerifiedFeasibleRoute ? (
        <div className="rounded-xs border border-error/40 bg-error-container/50 p-3 text-xs text-on-error-container">
          <p className="font-bold">
            {verdicts.map(({ evaluation, verdict }) => `${evaluation.routeId} ${verdict.glyph} ${verdict.headline.split(" · ")[0]}`).join("   ·   ")}
          </p>
          <p className="mt-1 text-sm font-black uppercase">Therefore: no currently verified feasible route</p>
          <p className="mt-0.5">
            Feasibility <b>{rec.feasibility}</b> · Movement <b>{rec.action}</b> · Follow-up <b>{rec.followUp.join(" + ") || "—"}</b>
          </p>
          <p className="mt-1 font-semibold">This is a valid operational outcome, not a failure to compute. NIRNYAY does not fabricate feasibility.</p>
        </div>
      ) : null}
    </div>
  );
}

export function ReassessmentAlert({ state, missions }: { state: PortalState; missions: MissionView[] }) {
  const superseded = state.decisionOrder.map((id) => state.decisions[id]).filter((decision) => decision.status === "SUPERSEDED");
  if (superseded.length === 0) return null;
  const blockedEvents = state.events.filter((event) => event.payload.type === "segment.state_changed" && event.payload.to === "BLOCKED");
  const latestChange = blockedEvents[blockedEvents.length - 1];
  const changed = latestChange && latestChange.payload.type === "segment.state_changed" ? getSegment(latestChange.payload.segmentId) : null;
  const secondIncident = state.incidentOrder.length > 1 ? state.incidents[state.incidentOrder[state.incidentOrder.length - 1]] : null;

  return (
    <section id="reassessment-alert" data-reassessment-alert aria-label="New disruption" className="arrive scroll-mt-20 overflow-hidden rounded-lg border-2 border-warning bg-surface-container-lowest">
      <div className="flex flex-wrap items-center gap-3 bg-warning-container px-4 py-2.5 text-warning">
        <TriangleAlert aria-hidden="true" className="size-5" />
        <p className="text-sm font-black uppercase tracking-wide">New disruption detected</p>
        {changed && (
          <p className="text-sm font-bold">
            {changed.corridor}: OPEN → BLOCKED <span className="font-normal">({changed.name}{latestChange ? ` · ${formatStamp(latestChange.at)}` : ""})</span>
          </p>
        )}
      </div>
      <div className="space-y-3 p-4">
        {secondIncident && (
          <ol data-second-pipeline className="flex flex-wrap items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wide">
            {[
              `New field report · ${secondIncident.reference}`,
              `AI decodes → ${(state.interpretations[secondIncident.id]?.hazard.label ?? secondIncident.ai.label).toLowerCase()}`,
              `Multi-source check · ${state.evidence.filter((item) => item.incidentId === secondIncident.id).length} items`,
              "Corroborated",
              secondIncident.verifiedAt ? "Officer verified" : "Awaiting officer",
              changed ? `${changed.corridor} OPEN → BLOCKED` : "Network update",
            ].map((label, index, all) => (
              <li key={label} className="flex items-center gap-1.5">
                <span className="rounded-xs border border-outline-variant/60 bg-surface-container-low px-2 py-0.5 text-primary-container">{label}</span>
                {index < all.length - 1 && <span aria-hidden="true" className="text-outline">→</span>}
              </li>
            ))}
          </ol>
        )}
        {superseded.map((old) => {
          const mission = missions.find((item) => item.mission.id === old.missionId);
          const replacement = old.supersededBy ? state.decisions[old.supersededBy] : null;
          return (
            <div key={old.id} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="rounded-xs border border-outline-variant/60 bg-surface-container-low p-3 text-xs">
                <p className="font-bold uppercase tracking-wider text-on-surface-variant">Previous decision · {old.id}</p>
                <p className="mt-0.5 text-sm font-bold text-primary-container">
                  {old.missionId} · {mission?.mission.cargo}
                </p>
                <p className="mt-0.5 font-bold line-through">{decisionLabel(old)}</p>
                <p className="mt-0.5">
                  {old.actedStatus === "APPROVED" ? "✓ Approved" : old.actedStatus ? old.actedStatus.toLowerCase() : "recommended"} → <span className="font-black text-warning">SUPERSEDED</span>
                  {old.supersededAt ? ` · ${formatStamp(old.supersededAt)}` : ""}
                </p>
              </div>
              <p className="text-center text-xs font-black uppercase tracking-wider text-secondary">Reassessment triggered →</p>
              {replacement && mission ? (
                <div className="rounded-xs border border-error/40 bg-error-container/40 p-3 text-xs">
                  <p className="font-bold uppercase tracking-wider text-on-surface-variant">New recommendation · {replacement.id}</p>
                  <p className="mt-0.5">
                    {[...replacement.recommendation.evaluations]
                      .sort((a, b) => a.routeId.localeCompare(b.routeId))
                      .map((evaluation) => `Route ${evaluation.routeId} ${routeVerdict(evaluation, mission.vehicle).glyph}`)
                      .join("  ·  ")}
                  </p>
                  {replacement.recommendation.noVerifiedFeasibleRoute && <p className="mt-0.5 font-black text-on-error-container">NO CURRENTLY VERIFIED FEASIBLE ROUTE</p>}
                  <p className="mt-0.5 text-sm font-black text-primary-container">
                    {old.missionId}: MOVEMENT → {replacement.recommendation.action} · FOLLOW-UP → {replacement.recommendation.followUp.join(" + ") || "—"}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
        <p className="text-xs text-on-surface-variant">NIRNYAY invalidates its own earlier recommendation when the world changes. The old decision is kept in the record, marked superseded.</p>
      </div>
    </section>
  );
}

export function TimelineList({ steps, title, emptyText }: { steps: TimelineStep[]; title: string; emptyText: string }) {
  return (
    <section aria-label={title} className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-primary-container">{title}</p>
      {steps.length === 0 ? (
        <p className="mt-2 text-sm text-on-surface-variant">{emptyText}</p>
      ) : (
        <ol className="mt-3 space-y-0">
          {steps.map((step, index) => (
            <li key={step.key} data-timeline-step={step.key} data-timeline-done={step.at !== null} className="arrive relative flex gap-3 pb-3 last:pb-0">
              <span className="flex flex-col items-center">
                <span className={`mt-0.5 flex size-4 items-center justify-center rounded-full ${step.at !== null ? "bg-success" : "border-2 border-outline-variant bg-surface-container-lowest"}`}>
                  {step.at !== null && <Check aria-hidden="true" className="size-3 text-on-primary" />}
                </span>
                {index < steps.length - 1 && <span aria-hidden="true" className="mt-0.5 w-px flex-1 bg-outline-variant" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-[0.6875rem] text-on-surface-variant">{step.at !== null ? formatClock(step.at, true) : "pending"}</span>
                  <span className={`text-xs font-bold uppercase tracking-wide ${step.at !== null ? "text-primary-container" : "text-outline"}`}>{step.label}</span>
                </span>
                {step.detail && <span className="block text-[0.6875rem] text-on-surface-variant">{step.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
