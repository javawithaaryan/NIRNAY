"use client";

import type { ReactNode } from "react";
import { MissionImpactCards } from "@/components/portal/MissionStory";
import type { PortalState } from "@/lib/scenario/events";
import { getPlace } from "@/lib/scenario/seed/nh29";
import type { Priority } from "@/lib/scenario/types";
import type { PortalView } from "@/lib/scenario/view";

type Props = {
  view: PortalView;
  state: PortalState;
  selectedMissionId: string | null;
  onSelectMission: (missionId: string) => void;
};

const glyph = { FEASIBLE: "✅", INFEASIBLE: "❌", UNDETERMINED: "⚠️" } as const;

export function SituationSummary({ view, selectedMissionId, onSelectMission }: Props) {
  const incidents = view.incidents;
  const blocked = view.segments.filter((segment) => segment.effectiveState === "BLOCKED");
  const blockedCorridors = [...new Set(blocked.map((segment) => segment.segment.corridor))];
  const affected = view.missions.filter((mission) => mission.impact.affectedSegmentIds.length > 0);
  const priorityCount = (priority: Priority) => affected.filter((mission) => mission.mission.priority === priority).length;

  return (
    <section id="situation" data-situation className="scroll-mt-20 overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
      <div className="grid grid-cols-1 divide-y divide-outline-variant/40 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
        <Tile label="Active incident" tone={incidents.length ? "danger" : "ok"}>
          {incidents.length === 0 ? (
            <span className="text-success">None · NH-29 normal</span>
          ) : (
            incidents.map((item) => (
              <span key={item.incident.id} data-situation-incident className="block">
                {(item.interpretation?.hazard.label ?? item.incident.ai.label).toUpperCase()} · {item.segment ? getPlace(item.segment.segment.fromPlaceId).name.toUpperCase() : ""} · {item.segment?.segment.corridor}
              </span>
            ))
          )}
        </Tile>
        <Tile label="Evidence" tone={incidents.length ? "danger" : "ok"}>
          {incidents.length === 0 ? (
            <span className="text-on-surface-variant">—</span>
          ) : (
            incidents.map((item) => (
              <span key={item.incident.id} data-situation-evidence className={`block ${item.incident.verifiedAt || item.assessment.corroborated ? "text-success" : "text-warning"}`}>
                {item.incident.verifiedAt ? "Verified" : item.incident.rejectedAt ? "Rejected" : item.assessment.corroborated ? "Corroborated" : item.interpretation ? "Corroborating…" : "AI analysing…"}
                <span className="ml-1 font-mono text-xs font-bold text-on-surface-variant">E {item.assessment.E.toFixed(2)}</span>
              </span>
            ))
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
        <Tile label="Missions affected" tone={affected.length ? "danger" : "ok"}>
          <span data-situation-missions className={affected.length ? "text-error" : "text-success"}>
            {affected.length ? `${affected.length} affected` : `${view.missions.length} on time`}
          </span>
          {affected.length > 0 && (
            <span className="mt-0.5 flex flex-wrap gap-1.5 text-[0.6875rem] font-bold">
              <span className="rounded-xs bg-error px-1.5 py-0.5 text-on-primary">Critical {priorityCount("CRITICAL")}</span>
              <span className="rounded-xs bg-warning px-1.5 py-0.5 text-on-primary">High {priorityCount("HIGH")}</span>
              <span className="rounded-xs bg-success px-1.5 py-0.5 text-on-primary">Normal {priorityCount("NORMAL")}</span>
            </span>
          )}
        </Tile>
      </div>

      <div className="space-y-3 border-t border-outline-variant/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p data-payoff className="text-lg font-black uppercase tracking-tight text-primary-container">
            {affected.length ? `One landslide. ${affected.length === 3 ? "Three" : affected.length} missions. Different decisions.` : "Three missions on the Dimapur → Kohima corridor"}
          </p>
          <p className="text-xs text-on-surface-variant">When a road fails, what happens to the mission? A road closure is not the answer — the mission decision is.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <MissionImpactCards missions={view.missions} selectedMissionId={selectedMissionId} onSelectMission={onSelectMission} />
          <div className="rounded-xs border border-outline-variant/50 bg-surface-container-low p-3">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">Route feasibility</p>
            <table className="mt-1 text-center text-sm" aria-label="Route by mission feasibility">
              <thead>
                <tr className="text-[0.6875rem] font-bold text-on-surface-variant">
                  <th className="px-2 py-1 text-left font-bold" />
                  {view.missions.map((mission) => (
                    <th key={mission.mission.id} className="px-2 py-1 font-mono">
                      {mission.mission.id}
                      <span className="block font-sans font-semibold">{mission.vehicle.vehicleClass}</span>
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
            <p className="mt-1 max-w-[14rem] text-[0.6875rem] text-on-surface-variant">A route can exist and still be infeasible for a mission.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/40 bg-primary-container px-4 py-3 text-on-primary">
        <p className="text-sm">
          <span className="font-black uppercase tracking-wide">Why different?</span> Vehicle + network state + evidence freshness + mission urgency + deadline
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
