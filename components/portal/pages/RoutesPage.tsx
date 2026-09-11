"use client";

import { useState } from "react";
import { RouteComparison } from "@/components/portal/RouteComparison";
import { Badge, Card, CardHeader, PageHeader, feasibilityTone } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";

export function RoutesPage() {
  const view = usePortalView();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!view) return <p className="text-sm text-on-surface-variant">Loading routes…</p>;

  const selected = view.missions.find((mission) => mission.mission.id === selectedId) ?? view.missions[0];

  return (
    <>
      <PageHeader title="Routes" subtitle="A route existing is not the same as a mission being feasible on it. Feasibility is evaluated per mission and per vehicle." />

      <Card>
        <CardHeader title="Feasibility matrix" subtitle="Rows: candidate routes · columns: missions with their assigned vehicles" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface-container text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3">Route</th>
                {view.missions.map((mission) => (
                  <th key={mission.mission.id} className="px-4 py-3">
                    {mission.mission.id}
                    <span className="block font-normal normal-case tracking-normal">{mission.vehicle.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {view.routes.map((routeView) => (
                <tr key={routeView.route.id}>
                  <td className="px-4 py-3 font-semibold text-primary-container">
                    {routeView.route.name} · {routeView.route.label}
                    <span className="block text-xs font-normal text-on-surface-variant">
                      {routeView.distanceKm} km · {routeView.travelMin} min · worst segment {routeView.worstState.replace("_", " ")}
                    </span>
                  </td>
                  {view.missions.map((mission) => {
                    const evaluation = mission.evaluations.find((item) => item.routeId === routeView.route.id);
                    const chosen = mission.activeDecision?.recommendation.routeId === routeView.route.id;
                    return (
                      <td key={mission.mission.id} className="px-4 py-3">
                        {evaluation && <Badge tone={feasibilityTone(evaluation.feasibility)}>{evaluation.feasibility}</Badge>}
                        {chosen && <span className="ml-1 text-[0.6875rem] font-bold text-secondary">recommended</span>}
                        {evaluation?.hardConstraintViolation && <span className="block text-[0.6875rem] text-on-error-container">hard constraint</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary-container">Route comparison for</h2>
          <div role="tablist" aria-label="Mission" className="flex gap-1">
            {view.missions.map((mission) => (
              <button
                key={mission.mission.id}
                type="button"
                role="tab"
                aria-selected={selected.mission.id === mission.mission.id}
                onClick={() => setSelectedId(mission.mission.id)}
                className={`rounded-xs px-3 py-1.5 text-xs font-bold ${
                  selected.mission.id === mission.mission.id ? "bg-primary-container text-on-primary" : "border border-outline-variant bg-surface-container-lowest text-primary-container hover:bg-surface-container-low"
                }`}
              >
                {mission.mission.id} · {mission.vehicle.vehicleClass}
              </button>
            ))}
          </div>
        </div>
        <RouteComparison routes={view.routes} mission={selected} />
      </section>
    </>
  );
}
