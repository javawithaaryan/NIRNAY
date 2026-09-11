"use client";

import { Bot } from "lucide-react";
import { Badge, impactTone, priorityTone } from "@/components/portal/ui";
import { CargoIcon, actionClass, decisionLabel } from "@/components/portal/MissionStory";
import { routeVerdict } from "@/lib/scenario/storyline";
import type { PortalView } from "@/lib/scenario/view";

export function ResponseSynthesisHero({ view }: { view: PortalView }) {
  const decided = view.missions.filter((mission) => mission.activeDecision);
  if (decided.length === 0) return null;
  const blocked = [...new Set(view.segments.filter((segment) => segment.effectiveState === "BLOCKED").map((segment) => segment.segment.corridor))];

  const routeSummaries = view.routes.map((route) => {
    const verdicts = decided.flatMap((mission) => {
      const evaluation = mission.evaluations.find((item) => item.routeId === route.route.id);
      return evaluation ? [{ mission, verdict: routeVerdict(evaluation, mission.vehicle) }] : [];
    });
    const feasibleFor = verdicts.filter((item) => item.verdict.glyph === "✅");
    const restricted = verdicts.filter((item) => item.verdict.headline.startsWith("INFEASIBLE · VEHICLE"));
    return { route, feasibleFor, restricted };
  });

  const sentences = routeSummaries
    .filter((summary) => summary.feasibleFor.length && summary.restricted.length)
    .map(
      (summary) =>
        `${summary.route.route.name} is compatible with ${summary.feasibleFor.map((item) => `${item.mission.mission.id}'s ${item.mission.vehicle.vehicleClass}`).join(", ")} and current evidence, while ${summary.restricted
          .map((item) => `${item.mission.mission.id} (${item.mission.mission.cargo.toLowerCase()}, ${item.mission.vehicle.vehicleClass})`)
          .join(" and ")} cannot use it because of the vehicle restriction (${summary.restricted[0].verdict.reason.split(";")[0]}).`,
    );
  const noneFeasible = routeSummaries.every((summary) => summary.feasibleFor.length === 0);
  const affectedCount = view.missions.filter((mission) => mission.impact.affectedSegmentIds.length > 0).length;
  const verified = view.incidents.filter((item) => item.incident.verifiedAt).length;
  const strategy = [
    { label: "Incident", value: verified ? "verified" : "pending" },
    { label: "Network", value: blocked.length ? `${blocked.join(" + ")} blocked` : "unchanged" },
    { label: "Mission impact", value: `${affectedCount} missions affected` },
    { label: "Vehicle constraints", value: "checked" },
    { label: "Alternative routes", value: "evaluated" },
    { label: "Deadlines", value: "checked" },
    { label: "Current evidence", value: "checked" },
    { label: "Strategy", value: "prepared" },
  ];
  const synthesis = sentences.length
    ? sentences.join(" ")
    : noneFeasible
      ? "No route is currently verified feasible for any affected mission — the original corridor is blocked, the alternative's evidence is stale, and the remaining route is blocked or vehicle-restricted. Holding with verification and escalation is the safe response."
      : "Routes were compared per mission against network state, evidence freshness, vehicle restrictions and deadlines.";

  return (
    <section id="response-synthesis" data-response-synthesis className="arrive scroll-mt-20 overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
      <div className="bg-primary-container px-4 py-3 text-on-primary sm:px-5">
        <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <Bot aria-hidden="true" className="size-5" />
          AI-assisted response synthesis
        </p>
        <p className="text-xs text-on-primary/80">
          Combining verified incident status, evidence freshness, mission requirements, vehicle constraints and available routes to prepare response options.
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <ol data-strategy-build className="flex flex-wrap items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wide">
          {strategy.map((item) => (
            <li key={item.label} className="arrive rounded-xs border border-success-outline bg-success-container/60 px-2 py-0.5 text-success">
              ✓ {item.label} <span className="text-primary-container">{item.value}</span>
            </li>
          ))}
          <li className="rounded-xs bg-primary-container px-2 py-0.5 text-on-primary">→ Response options ready</li>
        </ol>

        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-3" aria-label="Mission-specific responses">
          {decided.map((mission) => {
            const decision = mission.activeDecision!;
            const verdicts = [...mission.evaluations].sort((a, b) => a.routeId.localeCompare(b.routeId)).map((evaluation) => routeVerdict(evaluation, mission.vehicle));
            return (
              <li key={mission.mission.id} data-response-mission={mission.mission.id} className="flex flex-col gap-2 rounded-xs border border-outline-variant/60 p-3 text-xs">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-bold text-primary-container">{mission.mission.id}</span>
                  <CargoIcon cargo={mission.mission.cargo} className="size-4 text-primary-container" />
                  <span className="font-black uppercase text-primary-container">{mission.mission.cargo}</span>
                </p>
                <p className="flex flex-wrap gap-1">
                  <Badge tone={priorityTone(mission.mission.priority)}>{mission.mission.priority}</Badge>
                  <Badge tone="neutral">{mission.vehicle.name}</Badge>
                  <Badge tone={impactTone(mission.impact.level)}>Impact {mission.impact.level}</Badge>
                </p>
                <p data-response-result className={`font-black uppercase ${decision.recommendation.routeId ? "text-secondary" : "text-on-error-container"}`}>
                  {decision.recommendation.routeId
                    ? `Route ${decision.recommendation.routeId} feasible — alternative route found`
                    : `No feasible verified ${{ HCV: "heavy-vehicle", MCV: "medium-vehicle", LMV: "light-vehicle" }[mission.vehicle.vehicleClass]} route`}
                </p>
                <div>
                  <p className="font-bold uppercase tracking-wider text-on-surface-variant">Deterministic feasibility result</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {verdicts.map((verdict) => (
                      <li key={verdict.routeId}>
                        <span aria-hidden="true">{verdict.glyph}</span> Route {verdict.routeId} — {verdict.headline.toLowerCase()}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-auto">
                  <span className="font-bold uppercase tracking-wider text-on-surface-variant">NIRNYAY recommendation </span>
                  <span className={`mt-0.5 inline-block rounded-xs px-2 py-0.5 font-extrabold uppercase ${actionClass(decision.recommendation.action)}`}>{decisionLabel(decision)}</span>
                  <span className="ml-1 text-on-surface-variant">{decision.status.replace("_", " ").toLowerCase()}</span>
                </p>
              </li>
            );
          })}
        </ul>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <p data-response-ai-synthesis className="rounded-xs border border-secondary/30 bg-secondary-container/20 px-3 py-2 text-sm text-on-surface">
            <span className="font-bold uppercase tracking-wide text-secondary">AI / system synthesis: </span>
            {synthesis}
          </p>
          <div className="rounded-xs border border-primary-container/30 bg-surface-container-low px-3 py-2 text-xs">
            <p className="font-black uppercase tracking-wide text-primary-container">Why different?</p>
            <p className="mt-0.5 text-on-surface">Cargo consequence + deadline + vehicle + route dependency + network condition</p>
            <p className="mt-1 text-sm font-black uppercase text-secondary">Therefore: same disruption ≠ same decision</p>
          </div>
        </div>
        <dl data-roles className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-xs border border-secondary/30 bg-secondary-container/20 px-3 py-2">
            <dt className="font-bold uppercase tracking-wider text-secondary">AI</dt>
            <dd>Summarizes evidence and operational context.</dd>
          </div>
          <div className="rounded-xs border border-outline-variant/60 bg-surface-container-low px-3 py-2">
            <dt className="font-bold uppercase tracking-wider text-primary-container">Deterministic engine</dt>
            <dd>Checks actual feasibility — hard constraints first.</dd>
          </div>
          <div className="rounded-xs border border-success-outline bg-success-container/40 px-3 py-2">
            <dt className="font-bold uppercase tracking-wider text-success">Authority</dt>
            <dd>Approves or rejects before anything moves.</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
