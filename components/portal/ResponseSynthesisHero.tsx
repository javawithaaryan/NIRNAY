"use client";

import { ArrowDown, Bot } from "lucide-react";
import { Badge, impactTone } from "@/components/portal/ui";
import { actionClass, decisionLabel } from "@/components/portal/MissionStory";
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
    const glyph = feasibleFor.length ? "✅" : verdicts.every((item) => item.verdict.glyph === "❌") ? "❌" : "⚠️";
    const headline = feasibleFor.length
      ? `Feasible for ${[...new Set(feasibleFor.map((item) => item.mission.vehicle.vehicleClass))].join(" / ")} only`
      : route.worstState === "BLOCKED"
        ? "BLOCKED"
        : verdicts.every((item) => item.verdict.headline.startsWith("INFEASIBLE · VEHICLE"))
          ? "Vehicle-restricted for these missions"
          : verdicts[0]?.verdict.headline.split(" · ")[0] ?? "—";
    return { route, glyph, headline, feasibleFor, restricted };
  });

  const sentences = routeSummaries
    .filter((summary) => summary.feasibleFor.length && summary.restricted.length)
    .map(
      (summary) =>
        `${summary.route.route.name} is compatible with ${summary.feasibleFor.map((item) => `${item.mission.mission.id}'s ${item.mission.vehicle.vehicleClass}`).join(", ")} and current evidence, while ${summary.restricted
          .map((item) => item.mission.mission.id)
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
        <p className="text-xs text-on-primary/80">Summarizing the operational consequences of the verified disruption.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-2 text-xs">
          <div>
            <p className="font-bold uppercase tracking-wider text-on-surface-variant">Verified incident</p>
            <p className="text-sm font-black uppercase text-error">{blocked.length ? blocked.map((corridor) => `${corridor} → BLOCKED`).join(" · ") : "Network change pending"}</p>
          </div>
          <ArrowDown aria-hidden="true" className="size-4 text-outline" />
          <div>
            <p className="font-bold uppercase tracking-wider text-on-surface-variant">Missions affected</p>
            <ul className="mt-1 space-y-1">
              {decided.map((mission) => (
                <li key={mission.mission.id} className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-bold text-primary-container">{mission.mission.id}</span>
                  <span className="font-bold uppercase text-primary-container">{mission.mission.cargo}</span>
                  <span className="text-on-surface-variant">
                    {mission.mission.priority} · {mission.vehicle.vehicleClass}
                  </span>
                  <Badge tone={impactTone(mission.impact.level)}>{mission.impact.level} impact</Badge>
                </li>
              ))}
            </ul>
          </div>
          <ArrowDown aria-hidden="true" className="size-4 text-outline" />
          <div>
            <p className="font-bold uppercase tracking-wider text-on-surface-variant">Routes assessed</p>
            <ul className="mt-1 space-y-0.5">
              {routeSummaries.map((summary) => (
                <li key={summary.route.route.id} data-route-summary={summary.route.route.id} className="font-semibold">
                  <span aria-hidden="true">{summary.glyph}</span> {summary.route.route.name} · {summary.route.route.label} — {summary.headline}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-3">
          <p data-response-ai-synthesis className="rounded-xs border border-secondary/30 bg-secondary-container/20 px-3 py-2 text-sm text-on-surface">
            <span className="font-bold uppercase tracking-wide text-secondary">AI synthesis: </span>
            {synthesis}
          </p>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-container">NIRNYAY recommendations</p>
            <ul className="mt-1 space-y-1">
              {decided.map((mission) => (
                <li key={mission.mission.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-primary-container">{mission.mission.id}</span>
                  <span className="text-on-surface-variant">{mission.mission.cargo.toLowerCase()}</span>
                  <span aria-hidden="true">→</span>
                  <span className={`rounded-xs px-2 py-0.5 font-extrabold uppercase ${actionClass(mission.activeDecision!.recommendation.action)}`}>{decisionLabel(mission.activeDecision!)}</span>
                  <span className="text-on-surface-variant">{mission.activeDecision!.status.replace("_", " ").toLowerCase()}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="rounded-xs border border-outline-variant/60 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
            AI summarizes the evidence and operational situation. <b>Deterministic feasibility rules</b> produce the route result. <b>Authority approval</b> is required before execution.
          </p>
        </div>
      </div>
    </section>
  );
}
