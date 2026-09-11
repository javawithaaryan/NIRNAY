"use client";

import Link from "next/link";
import { Badge, Card, CardHeader, decisionStatusTone, feasibilityTone, labelize, priorityTone } from "@/components/portal/ui";
import { getPlace, getRoute } from "@/lib/scenario/seed/nh29";
import type { MissionView } from "@/lib/scenario/view";

function keyReasons(view: MissionView): string[] {
  const rec = view.activeDecision?.recommendation;
  if (!rec) return [];
  const lines = rec.why.filter((line) => !line.startsWith("Network change:") && !line.startsWith("Vehicle change:") && !line.startsWith("Manual re-evaluation"));
  if (rec.action === "REROUTE") {
    return lines.filter((line) => line.includes("verified feasible") || line.includes("ETA via") || line.includes("rejected")).slice(0, 3);
  }
  return lines.filter((line) => line.includes("rejected") || line.includes("No currently verified") || line.includes("does not override")).slice(0, 4);
}

export function DecisionStrip({ missions, selectedMissionId, onSelectMission }: { missions: MissionView[]; selectedMissionId: string | null; onSelectMission: (id: string) => void }) {
  const decided = missions.filter((mission) => mission.activeDecision);
  const superseded = missions.flatMap((mission) => mission.decisions.filter((decision) => decision.status === "SUPERSEDED"));
  return (
    <Card>
      <CardHeader
        title="Same disruption ≠ same decision"
        subtitle="Vehicle-aware feasibility produces a different decision per mission. Urgency accelerates preparation; it cannot make an unsafe route safe. Recommendation ≠ authorization."
        actions={superseded.length > 0 && <Badge tone="info">{superseded.length} decision{superseded.length > 1 ? "s" : ""} superseded by reassessment</Badge>}
      />
      {decided.length === 0 ? (
        <p className="px-5 py-6 text-sm text-on-surface-variant">No decision needed yet — every mission continues on its planned route.</p>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-outline-variant/40 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {missions.map((view) => {
            const decision = view.activeDecision;
            const rec = decision?.recommendation;
            const supersededPrior = view.decisions.filter((item) => item.status === "SUPERSEDED").at(-1) ?? null;
            const selected = selectedMissionId === view.mission.id;
            return (
              <article
                key={view.mission.id}
                data-decision-card={view.mission.id}
                onClick={() => onSelectMission(view.mission.id)}
                className={`cursor-pointer space-y-2.5 p-4 transition-colors ${selected ? "bg-secondary-container/20" : "hover:bg-surface-container-low"}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary-container">{view.mission.id}</span>
                  <Badge tone={priorityTone(view.mission.priority)}>{view.mission.priority}</Badge>
                  <span className="text-xs text-on-surface-variant">
                    {view.mission.cargo} · {view.vehicle.name}
                  </span>
                </div>
                {rec ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-xs px-2.5 py-1 text-base font-extrabold uppercase tracking-wide ${rec.action === "HOLD" ? "bg-error text-on-primary" : rec.action === "REROUTE" ? "bg-secondary text-on-primary" : "bg-success text-on-primary"}`}>
                        {rec.action}
                        {rec.routeId ? ` via Route ${rec.routeId}` : ""}
                      </span>
                      {rec.followUp.length > 0 && <Badge tone="warning">+ {rec.followUp.join(" / ")}</Badge>}
                      <Badge tone={feasibilityTone(rec.feasibility)}>{rec.feasibility}</Badge>
                      <Badge tone={decisionStatusTone(decision!.status)}>{labelize(decision!.status)}</Badge>
                    </div>
                    {rec.noVerifiedFeasibleRoute && <p className="text-xs font-bold text-on-error-container">NO CURRENTLY VERIFIED FEASIBLE ROUTE — a valid operational outcome</p>}
                    {rec.action === "REROUTE" && rec.divertPlaceId && (
                      <p className="text-xs font-semibold text-primary-container">
                        Divert at {getPlace(rec.divertPlaceId).name} → {getRoute(rec.routeId ?? "A").label}
                      </p>
                    )}
                    {rec.action === "HOLD" && rec.stagingPlaceId && <p className="text-xs font-semibold text-primary-container">Hold at {getPlace(rec.stagingPlaceId).name}</p>}
                    <ul className="space-y-1 text-xs text-on-surface">
                      {keyReasons(view).map((line) => (
                        <li key={line} className="flex gap-1.5">
                          <span className="text-secondary">▸</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    {supersededPrior && (
                      <p className="rounded-xs border border-secondary/40 bg-secondary-container/30 px-2 py-1 text-[0.6875rem] text-on-secondary-container">
                        Supersedes {supersededPrior.id} ({supersededPrior.recommendation.action}
                        {supersededPrior.recommendation.routeId ? ` via ${supersededPrior.recommendation.routeId}` : ""}) after the network changed
                      </p>
                    )}
                    <Link href={`/missions/${view.mission.id}`} className="inline-block text-xs font-bold text-secondary hover:underline" onClick={(event) => event.stopPropagation()}>
                      Full WHY and route comparison →
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-on-surface-variant">Continues on Route A — no network change affects this mission.</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
