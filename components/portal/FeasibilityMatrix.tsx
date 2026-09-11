"use client";

import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { Badge, Card, CardHeader, roadStateTone } from "@/components/portal/ui";
import type { Feasibility } from "@/lib/scenario/types";
import type { MissionView, RouteView } from "@/lib/scenario/view";

type Props = {
  routes: RouteView[];
  missions: MissionView[];
  selectedMissionId: string | null;
  highlightRouteId: string | null;
  onSelectMission: (missionId: string) => void;
  onSelectRoute: (routeId: string | null) => void;
};

function Glyph({ feasibility }: { feasibility: Feasibility }) {
  if (feasibility === "FEASIBLE") return <CircleCheck aria-hidden="true" className="size-6 text-success" />;
  if (feasibility === "INFEASIBLE") return <CircleX aria-hidden="true" className="size-6 text-error" />;
  return <TriangleAlert aria-hidden="true" className="size-6 text-warning" />;
}

export function FeasibilityMatrix({ routes, missions, selectedMissionId, highlightRouteId, onSelectMission, onSelectRoute }: Props) {
  return (
    <Card>
      <CardHeader
        title="Route × mission feasibility"
        subtitle="A route existing ≠ a mission being feasible on it. Click a route to highlight it on the map; click a mission to select it. Hard constraints are checked before anything is ranked."
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-outline-variant/40 bg-surface-container text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">
              <th className="px-4 py-3 text-left">Route</th>
              {missions.map((mission) => (
                <th key={mission.mission.id} className="px-4 py-2 text-center">
                  <button
                    type="button"
                    aria-pressed={selectedMissionId === mission.mission.id}
                    onClick={() => onSelectMission(mission.mission.id)}
                    className={`rounded-xs px-2 py-1 ${selectedMissionId === mission.mission.id ? "bg-primary-container text-on-primary" : "hover:bg-surface-container-high"}`}
                  >
                    {mission.mission.id}
                    <span className="block font-semibold normal-case tracking-normal">
                      {mission.vehicle.vehicleClass} · {mission.vehicle.grossTonnes} t
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {routes.map((routeView) => {
              const restriction = routeView.segments.map((segment) => segment.segment.restriction?.maxVehicleClass).find(Boolean);
              const active = highlightRouteId === routeView.route.id;
              return (
                <tr key={routeView.route.id} data-matrix-route={routeView.route.id} className={active ? "bg-secondary-container/20" : ""}>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSelectRoute(active ? null : routeView.route.id)}
                      className="text-left"
                    >
                      <span className="font-bold text-primary-container">
                        {routeView.route.name} · {routeView.route.label}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone={roadStateTone(routeView.worstState as never)}>{routeView.worstState.replace("_", " ")}</Badge>
                        {restriction && <Badge tone="info">{restriction} only</Badge>}
                        <span className="text-xs text-on-surface-variant">
                          {routeView.distanceKm} km · {routeView.travelMin} min
                        </span>
                      </span>
                    </button>
                  </td>
                  {missions.map((mission) => {
                    const evaluation = mission.evaluations.find((item) => item.routeId === routeView.route.id);
                    const feasibility = evaluation?.feasibility ?? "UNDETERMINED";
                    const chosen = mission.activeDecision?.recommendation.routeId === routeView.route.id;
                    const reason = evaluation?.reasons.find((item) => item.ok !== true)?.text ?? evaluation?.reasons[0]?.text ?? "";
                    return (
                      <td key={mission.mission.id} data-matrix-cell={`${routeView.route.id}-${mission.mission.id}`} className="px-4 py-3 text-center align-top">
                        <div className="flex flex-col items-center gap-1">
                          <Glyph feasibility={feasibility} />
                          <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">{feasibility}</span>
                          {chosen && <Badge tone="info">recommended</Badge>}
                          {evaluation?.hardConstraintViolation && <Badge tone="danger">hard constraint</Badge>}
                          <span className="max-w-[16rem] text-[0.6875rem] leading-snug text-on-surface-variant" title={reason}>
                            {reason.length > 90 ? `${reason.slice(0, 90)}…` : reason}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-outline-variant/40 px-4 py-2 text-[0.6875rem] text-on-surface-variant">
        ✅ verified feasible · ⚠️ undetermined (high risk, stale or unknown evidence — never treated as open) · ❌ infeasible (blocked, hard vehicle constraint or deadline)
      </p>
    </Card>
  );
}
