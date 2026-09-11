import { divergencePlaceId, evaluateRoute } from "@/lib/scenario/engine/feasibility";
import type { EffectiveSegment } from "@/lib/scenario/engine/network";
import { getPlace, getRoute, routes, scenarioMeta } from "@/lib/scenario/seed/nh29";
import type { DecisionRecommendation, FollowUp, Mission, Vehicle } from "@/lib/scenario/types";

export type DecisionContext = {
  network: Record<string, EffectiveSegment>;
  deadlineAt: number;
  now: number;
  supersedesApprovedAction: boolean;
  triggerDescription: string | null;
};

function formatEta(travelMin: number): string {
  const hours = Math.floor(travelMin / 60);
  const minutes = Math.round(travelMin % 60);
  return hours > 0 ? `${hours} h ${String(minutes).padStart(2, "0")} min` : `${minutes} min`;
}

function formatSlack(deadlineAt: number, arrivalAt: number): string {
  const hours = (deadlineAt - arrivalAt) / 3_600_000;
  if (hours < 0) return `${Math.abs(hours).toFixed(1)} h past the deadline`;
  return `${hours.toFixed(1)} h of margin before the deadline`;
}

export function recommendDecision(mission: Mission, vehicle: Vehicle, context: DecisionContext): DecisionRecommendation {
  const evaluations = routes.map((route) =>
    evaluateRoute(route.id, mission, vehicle, context.network, context.deadlineAt, context.now),
  );
  const planned = evaluations.find((evaluation) => evaluation.routeId === mission.plannedRouteId);
  const plannedRoute = getRoute(mission.plannedRouteId);
  const why: string[] = [];
  if (context.triggerDescription) why.push(context.triggerDescription);

  if (planned && planned.feasibility === "FEASIBLE") {
    why.push(`${plannedRoute.name} (${plannedRoute.label}) remains verified feasible for ${vehicle.name}`);
    why.push(`ETA ${formatEta(planned.travelMin)} — ${formatSlack(context.deadlineAt, planned.arrivalAt)}`);
    why.push("No hard constraint is violated; no network change affects this mission");
    return {
      action: "CONTINUE",
      routeId: mission.plannedRouteId,
      feasibility: "FEASIBLE",
      noVerifiedFeasibleRoute: false,
      followUp: [],
      stagingPlaceId: null,
      divertPlaceId: null,
      etaAt: planned.arrivalAt,
      why,
      evaluations,
      instruction: null,
    };
  }

  if (planned) {
    why.push(...planned.reasons.filter((reason) => reason.ok === false).map((reason) => `${plannedRoute.name}: ${reason.text}`));
  }

  const alternatives = evaluations.filter((evaluation) => evaluation.routeId !== mission.plannedRouteId);
  const feasible = alternatives
    .filter((evaluation) => evaluation.feasibility === "FEASIBLE")
    .sort((a, b) => a.travelMin - b.travelMin);
  const rejected = alternatives.filter((evaluation) => evaluation.feasibility !== "FEASIBLE");

  for (const evaluation of rejected) {
    const route = getRoute(evaluation.routeId);
    const headline = evaluation.reasons.find((reason) => reason.ok !== true);
    why.push(`${route.name} (${route.label}) rejected — ${evaluation.feasibility}: ${headline?.text ?? "not verified feasible"}`);
  }

  if (feasible.length > 0) {
    const chosen = feasible[0];
    const route = getRoute(chosen.routeId);
    const divertPlaceId = divergencePlaceId(mission.plannedRouteId, route.id);
    why.push(`${route.name} (${route.label}) is verified feasible: vehicle ${vehicle.name} (${vehicle.vehicleClass}) is compatible with every restriction`);
    why.push(`ETA via ${route.name} ${formatEta(chosen.travelMin)} — ${formatSlack(context.deadlineAt, chosen.arrivalAt)}`);
    why.push("No hard constraint is violated on the selected route");
    const divert = divertPlaceId ? getPlace(divertPlaceId) : null;
    return {
      action: "REROUTE",
      routeId: route.id,
      feasibility: "FEASIBLE",
      noVerifiedFeasibleRoute: false,
      followUp: [],
      stagingPlaceId: null,
      divertPlaceId,
      etaAt: chosen.arrivalAt,
      why,
      evaluations,
      instruction: `REROUTE via ${route.name} (${route.label}). ${divert ? `DIVERT AT ${divert.name}.` : ""} Proceed to ${getPlace(mission.destinationPlaceId).name}.`,
    };
  }

  const followUp: FollowUp[] = ["VERIFY"];
  if (mission.priority !== "NORMAL" || context.supersedesApprovedAction) followUp.push("ESCALATE");
  const anyUndetermined = alternatives.some((evaluation) => evaluation.feasibility === "UNDETERMINED");
  why.push("No currently verified feasible route satisfies the vehicle constraints within the assessed network and evidence");
  if (mission.priority === "CRITICAL" || mission.priority === "HIGH") {
    why.push(`Priority ${mission.priority} accelerated preparation of this assessment; it does not override a hard vehicle restriction`);
  }
  if (context.supersedesApprovedAction) {
    why.push("A previously approved action for this mission is no longer valid after the network change and has been superseded");
  }
  const staging = getPlace(scenarioMeta.defaultStagingPlaceId);
  why.push(`Hold at ${staging.name}; follow-up: ${followUp.join(" / ")}${anyUndetermined ? " (uncertain segments need verification)" : ""}`);
  return {
    action: "HOLD",
    routeId: null,
    feasibility: anyUndetermined ? "UNDETERMINED" : "INFEASIBLE",
    noVerifiedFeasibleRoute: true,
    followUp,
    stagingPlaceId: staging.id,
    divertPlaceId: null,
    etaAt: null,
    why,
    evaluations,
    instruction: `HOLD at ${staging.name}. Do not proceed beyond ${getPlace("chumoukedima").name} until a verified feasible route is confirmed.`,
  };
}

export function recommendationsDiffer(a: DecisionRecommendation, b: DecisionRecommendation): boolean {
  return a.action !== b.action || a.routeId !== b.routeId || a.feasibility !== b.feasibility;
}
