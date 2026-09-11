"use client";

import { Bot } from "lucide-react";
import { Badge, impactTone, priorityTone } from "@/components/portal/ui";
import { CargoIcon, actionClass, decisionLabel } from "@/components/portal/MissionStory";
import { routeVerdict } from "@/lib/scenario/storyline";
import type { PortalView } from "@/lib/scenario/view";

const inputs = ["Incident severity", "Mission cargo", "Mission priority", "Deadline", "Vehicle class", "Route states", "Evidence freshness"];

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
          Combining the verified incident, evidence state, mission context and network constraints to prepare mission-specific response options.
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <p>
            <span className="font-bold uppercase tracking-wider text-on-surface-variant">Verified incident </span>
            <span className="text-sm font-black uppercase text-error">{blocked.length ? blocked.map((corridor) => `${corridor} → BLOCKED`).join(" · ") : "Network change pending"}</span>
          </p>
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold uppercase tracking-wider text-on-surface-variant">Inputs considered</span>
            {inputs.map((input) => (
              <span key={input} className="rounded-xs border border-success-outline bg-success-container/50 px-1.5 py-0.5 font-semibold text-success">
                ✓ {input}
              </span>
            ))}
          </p>
        </div>

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
        <p className="rounded-xs border border-outline-variant/60 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
          AI summarizes the evidence and operational situation. <b>Deterministic feasibility rules</b> produce the route result. <b>Authority approval</b> is required before execution.
        </p>
      </div>
    </section>
  );
}
