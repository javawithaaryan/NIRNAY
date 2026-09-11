"use client";

import type { ReactNode } from "react";
import type { PortalState } from "@/lib/scenario/events";
import type { DecisionRecord } from "@/lib/scenario/types";
import type { MissionView, PortalView } from "@/lib/scenario/view";

type Props = {
  view: PortalView;
  state: PortalState;
  selectedMissionId: string | null;
  onSelectMission: (missionId: string) => void;
};

const glyph = { FEASIBLE: "✅", INFEASIBLE: "❌", UNDETERMINED: "⚠️" } as const;

function actionText(decision: DecisionRecord): string {
  const rec = decision.recommendation;
  return `${rec.action}${rec.routeId ? ` via Route ${rec.routeId}` : ""}${rec.followUp.length ? ` + ${rec.followUp.join(" / ")}` : ""}`;
}

function actionClass(action: string): string {
  if (action === "HOLD") return "bg-error text-on-primary";
  if (action === "REROUTE") return "bg-secondary text-on-primary";
  return "bg-success text-on-primary";
}

export function SituationSummary({ view, state, selectedMissionId, onSelectMission }: Props) {
  const incidents = view.incidents;
  const blocked = view.segments.filter((segment) => segment.effectiveState === "BLOCKED");
  const blockedCorridors = [...new Set(blocked.map((segment) => segment.segment.corridor))];
  const affected = view.missions.filter((mission) => mission.impact.affectedSegmentIds.length > 0);
  const superseded = (mission: MissionView) =>
    state.decisionOrder
      .map((id) => state.decisions[id])
      .filter((decision) => decision.missionId === mission.mission.id && decision.status === "SUPERSEDED")
      .at(-1) ?? null;

  const incidentLine = (index: number) => {
    const item = incidents[index];
    const hazard = (item.interpretation?.hazard.label ?? item.incident.ai.label).toUpperCase();
    const status = item.incident.verifiedAt
      ? "VERIFIED"
      : item.incident.rejectedAt
        ? "REJECTED"
        : item.interpretation
          ? "AI ANALYSED · AWAITING OFFICER"
          : "REPORTED · PENDING AI ANALYSIS";
    return { hazard, status, where: item.segment?.segment.corridor ?? "", verified: Boolean(item.incident.verifiedAt) };
  };

  return (
    <section id="situation" data-situation className="scroll-mt-20 overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
      <div className="grid grid-cols-1 divide-y divide-outline-variant/40 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Tile label="Incident" tone={incidents.length ? "danger" : "ok"}>
          {incidents.length === 0 ? (
            <span className="text-success">None · NH-29 normal</span>
          ) : (
            incidents.map((_, index) => {
              const line = incidentLine(index);
              return (
                <span key={index} data-situation-incident className="block">
                  {line.hazard} <span className="text-on-surface-variant">({line.where})</span> —{" "}
                  <span className={line.verified ? "text-success" : "text-warning"}>{line.status}</span>
                </span>
              );
            })
          )}
        </Tile>
        <Tile label="Network" tone={blocked.length ? "danger" : "ok"}>
          {blockedCorridors.length === 0 ? (
            <span className="text-success">NH-29 OPEN · Route C OPEN</span>
          ) : (
            blockedCorridors.map((corridor) => (
              <span key={corridor} data-situation-network className="block">
                {corridor} → <span className="text-error">BLOCKED</span>
              </span>
            ))
          )}
        </Tile>
        <Tile label="Missions" tone={affected.length ? "danger" : "ok"}>
          <span data-situation-missions>{affected.length ? `${affected.length} AFFECTED` : `${view.missions.length} ON TIME`}</span>
          <span className="block text-xs font-semibold text-on-surface-variant">
            {view.missions.map((mission) => `${mission.mission.id} ${mission.vehicle.vehicleClass}`).join(" · ")}
          </span>
        </Tile>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-outline-variant/40 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <ul aria-label="Mission decisions" className="space-y-2">
          {view.missions.map((mission) => {
            const decision = mission.activeDecision;
            const previous = superseded(mission);
            const selected = selectedMissionId === mission.mission.id;
            return (
              <li key={mission.mission.id}>
                <button
                  type="button"
                  data-mission-row={mission.mission.id}
                  aria-pressed={selected}
                  onClick={() => onSelectMission(mission.mission.id)}
                  className={`w-full rounded-xs border px-3 py-2 text-left transition-colors ${selected ? "border-secondary bg-secondary-container/20" : "border-outline-variant/50 hover:bg-surface-container-low"}`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary-container">{mission.mission.id}</span>
                    <span className="text-xs text-on-surface-variant">
                      {mission.mission.priority.toLowerCase()} · {mission.mission.cargo.toLowerCase()} · {mission.vehicle.vehicleClass}
                    </span>
                    <span className="ml-auto">
                      {decision ? (
                        <span className={`rounded-xs px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide ${actionClass(decision.recommendation.action)}`}>{actionText(decision)}</span>
                      ) : (
                        <span className="rounded-xs bg-success-container px-2 py-0.5 text-xs font-bold uppercase text-success">
                          {mission.impact.affectedSegmentIds.length ? "Assessing" : "On time · Route A"}
                        </span>
                      )}
                    </span>
                  </span>
                  {previous && (
                    <span className="mt-1 block text-xs">
                      <span className="font-bold text-on-surface-variant line-through">{actionText(previous)}</span>{" "}
                      <span className="font-bold uppercase text-warning">previous decision superseded</span>
                    </span>
                  )}
                  {decision?.recommendation.noVerifiedFeasibleRoute && (
                    <span className="mt-1 block text-xs font-bold text-on-error-container">NO CURRENTLY VERIFIED FEASIBLE ROUTE</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="rounded-xs border border-outline-variant/50 bg-surface-container-low p-3">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">Route feasibility</p>
          <table className="mt-1 text-center text-sm" aria-label="Route by mission feasibility">
            <thead>
              <tr className="text-[0.6875rem] font-bold text-on-surface-variant">
                <th className="px-2 py-1 text-left font-bold" />
                {view.missions.map((mission) => (
                  <th key={mission.mission.id} className="px-2 py-1 font-mono">
                    {mission.mission.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.routes.map((route) => (
                <tr key={route.route.id} data-mini-route={route.route.id}>
                  <th className="px-2 py-1 text-left text-xs font-bold text-primary-container">{route.route.name}</th>
                  {view.missions.map((mission) => (
                    <td key={mission.mission.id} className="px-2 py-1">
                      {glyph[mission.evaluations.find((item) => item.routeId === route.route.id)?.feasibility ?? "UNDETERMINED"]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/40 bg-primary-container px-4 py-3 text-on-primary">
        <p className="text-sm">
          <span className="font-black uppercase tracking-wide">Why different?</span> Vehicle constraints + route state + evidence freshness + mission urgency
        </p>
        <span className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-wide">
          <a href="#decisions" onClick={() => openSection("decisions")} className="hover:underline">
            Why? →
          </a>
          <a href="#feasibility" onClick={() => openSection("feasibility")} className="hover:underline">
            View route comparison →
          </a>
        </span>
      </div>
    </section>
  );
}

function Tile({ label, tone, children }: { label: string; tone: "ok" | "danger"; children: ReactNode }) {
  return (
    <div className={`px-4 py-3 ${tone === "danger" ? "bg-error-container/30" : ""}`}>
      <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <div className="mt-0.5 text-base font-black uppercase leading-snug text-primary-container">{children}</div>
    </div>
  );
}

function openSection(id: string) {
  const element = document.getElementById(id);
  if (element instanceof HTMLDetailsElement) element.open = true;
}
