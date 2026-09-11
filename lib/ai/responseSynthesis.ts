import { getPlace, getRoute } from "@/lib/scenario/seed/nh29";
import type { MissionView } from "@/lib/scenario/view";

export type ResponseSynthesis = {
  missionId: string;
  situation: string;
  narrative: string;
  recommendation: string;
  provider: string;
};

export const responseSynthesisProvider = "Deterministic fallback narrative (no LLM connected) — explains the engine's decision; it cannot change it";

function routeStatusPhrase(view: MissionView, routeId: string): string {
  const evaluation = view.evaluations.find((item) => item.routeId === routeId);
  const route = getRoute(routeId);
  if (!evaluation) return `${route.name}: not evaluated`;
  if (evaluation.feasibility === "FEASIBLE") return `${route.name} (${route.label}) is verified feasible for this ${view.vehicle.vehicleClass}`;
  if (evaluation.hardConstraintViolation) return `${route.name} (${route.label}) is closed to this vehicle by a hard restriction`;
  if (evaluation.blockingSegmentIds.length) return `${route.name} (${route.label}) is blocked`;
  return `${route.name} (${route.label}) cannot be verified — high-risk or stale evidence`;
}

export function synthesizeResponse(view: MissionView): ResponseSynthesis {
  const mission = view.mission;
  const vehicle = view.vehicle;
  const decision = view.activeDecision;
  const situation = `${mission.priority === "CRITICAL" ? "Critical" : mission.priority === "HIGH" ? "High-priority" : "Routine"} mission · ${mission.cargo.toLowerCase()} · ${vehicle.name} (${vehicle.vehicleClass}, ${vehicle.grossTonnes} t) · impact ${view.impact.level.toLowerCase()}`;

  if (!decision) {
    return {
      missionId: mission.id,
      situation,
      narrative: `No verified network change affects Route ${mission.plannedRouteId}. The mission continues on its planned route.`,
      recommendation: "NIRNYAY recommendation: CONTINUE on planned route",
      provider: responseSynthesisProvider,
    };
  }

  const rec = decision.recommendation;
  const alternatives = ["A", "B", "C"].filter((id) => id !== mission.plannedRouteId).map((id) => routeStatusPhrase(view, id));
  const planned = routeStatusPhrase(view, mission.plannedRouteId);
  let narrative: string;
  let recommendation: string;

  if (rec.action === "REROUTE" && rec.routeId) {
    const route = getRoute(rec.routeId);
    narrative = `${planned}. ${alternatives.filter((line) => !line.startsWith(route.name)).join("; ")}. ${route.name} is compatible with the ${vehicle.vehicleClass} and keeps the deadline achievable${rec.divertPlaceId ? `; divert at ${getPlace(rec.divertPlaceId).name}` : ""}.`;
    recommendation = `NIRNYAY recommendation: REROUTE via ${route.name} (${route.label})`;
  } else if (rec.action === "HOLD") {
    narrative = `${planned}. ${alternatives.join("; ")}. No currently verified feasible route satisfies this vehicle's constraints${mission.priority !== "NORMAL" ? `; the ${mission.priority.toLowerCase()} priority accelerated preparation but cannot relax a hard constraint` : ""}. ${decision.reassessmentOf ? "The earlier decision was superseded by the network change." : ""}`;
    recommendation = `NIRNYAY recommendation: HOLD at ${rec.stagingPlaceId ? getPlace(rec.stagingPlaceId).name : "staging"} + ${rec.followUp.join(" / ")}`;
  } else {
    narrative = `${planned}. The mission continues on its planned route.`;
    recommendation = "NIRNYAY recommendation: CONTINUE";
  }

  return { missionId: mission.id, situation, narrative: narrative.replace(/\s+/g, " ").trim(), recommendation, provider: responseSynthesisProvider };
}
