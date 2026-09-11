import type { EffectiveSegment } from "@/lib/scenario/engine/network";
import { getPlace, getRoute, getSegment } from "@/lib/scenario/seed/nh29";
import type { Mission, Route, RouteEvaluation, Vehicle, VehicleClass } from "@/lib/scenario/types";

const classRank: Record<VehicleClass, number> = { LMV: 1, MCV: 2, HCV: 3 };

export function vehicleAllowedOnSegment(vehicle: Vehicle, segment: EffectiveSegment): { allowed: boolean; reason: string | null } {
  const restriction = segment.segment.restriction;
  if (!restriction) return { allowed: true, reason: null };
  if (restriction.maxVehicleClass && classRank[vehicle.vehicleClass] > classRank[restriction.maxVehicleClass]) {
    return {
      allowed: false,
      reason: `${segment.segment.name} is restricted to ${restriction.maxVehicleClass}; assigned vehicle is ${vehicle.vehicleClass} (${vehicle.name}, ${vehicle.grossTonnes} t)`,
    };
  }
  if (restriction.maxGrossTonnes && vehicle.grossTonnes > restriction.maxGrossTonnes) {
    return {
      allowed: false,
      reason: `${segment.segment.name} allows up to ${restriction.maxGrossTonnes} t; assigned vehicle is ${vehicle.grossTonnes} t`,
    };
  }
  return { allowed: true, reason: null };
}

export function routeTravelMin(route: Route): number {
  return route.segmentIds.reduce((sum, id) => sum + getSegment(id).travelMin, 0);
}

export function routeDistanceKm(route: Route): number {
  return route.segmentIds.reduce((sum, id) => sum + getSegment(id).distanceKm, 0);
}

function formatAge(hours: number): string {
  return hours < 1 ? `${Math.round(hours * 60)} min` : `${Math.round(hours)} h`;
}

export function evaluateRoute(
  routeId: string,
  mission: Mission,
  vehicle: Vehicle,
  network: Record<string, EffectiveSegment>,
  deadlineAt: number,
  now: number,
): RouteEvaluation {
  const route = getRoute(routeId);
  const reasons: RouteEvaluation["reasons"] = [];
  const blockingSegmentIds: string[] = [];
  const undeterminedSegmentIds: string[] = [];
  let hardConstraintViolation = false;

  for (const segmentId of route.segmentIds) {
    const segment = network[segmentId];
    if (!segment) continue;
    const vehicleCheck = vehicleAllowedOnSegment(vehicle, segment);
    if (!vehicleCheck.allowed) {
      hardConstraintViolation = true;
      blockingSegmentIds.push(segmentId);
      reasons.push({ ok: false, text: `Vehicle restriction: ${vehicleCheck.reason}` });
    }
    if (segment.effectiveState === "BLOCKED") {
      blockingSegmentIds.push(segmentId);
      reasons.push({ ok: false, text: `${segment.segment.name} is BLOCKED${segment.runtime.reason ? ` — ${segment.runtime.reason}` : ""}` });
    } else if (segment.effectiveState === "HIGH_RISK" || segment.effectiveState === "UNKNOWN" || segment.effectiveState === "STALE") {
      undeterminedSegmentIds.push(segmentId);
      const staleNote = segment.stale ? `; last verified ${formatAge(segment.verifiedAgeHours)} ago` : "";
      reasons.push({
        ok: null,
        text: `${segment.segment.name} is ${segment.effectiveState.replace("_", " ")}${staleNote}${segment.runtime.reason ? ` — ${segment.runtime.reason}` : ""}`,
      });
    } else if (segment.effectiveState === "RESTRICTED" && vehicleCheck.allowed) {
      reasons.push({ ok: true, text: `${segment.segment.name} is RESTRICTED but the assigned vehicle satisfies the restriction` });
    }
  }

  const travelMin = routeTravelMin(route);
  const arrivalAt = now + travelMin * 60_000;
  const deadlineAchievable = arrivalAt <= deadlineAt;
  if (!deadlineAchievable) {
    reasons.push({ ok: false, text: `ETA ${Math.round(travelMin)} min misses the mission deadline` });
  }

  let feasibility: RouteEvaluation["feasibility"];
  if (blockingSegmentIds.length > 0 || !deadlineAchievable) feasibility = "INFEASIBLE";
  else if (undeterminedSegmentIds.length > 0) feasibility = "UNDETERMINED";
  else feasibility = "FEASIBLE";

  if (feasibility === "FEASIBLE") {
    const freshest = Math.max(...route.segmentIds.map((id) => network[id]?.verifiedAgeHours ?? 0));
    reasons.push({ ok: true, text: `All segments OPEN with current evidence (oldest verification ${formatAge(freshest)} ago)` });
    reasons.push({ ok: true, text: `Vehicle ${vehicle.name} (${vehicle.vehicleClass}) satisfies every restriction on this route` });
    reasons.push({ ok: true, text: `ETA ${Math.round(travelMin)} min keeps the deadline achievable` });
  } else if (feasibility === "UNDETERMINED") {
    reasons.push({ ok: null, text: "Route cannot be assessed as verified feasible until the uncertain segments are checked" });
  }

  return {
    routeId,
    feasibility,
    travelMin,
    arrivalAt,
    deadlineAchievable,
    reasons,
    blockingSegmentIds: [...new Set(blockingSegmentIds)],
    undeterminedSegmentIds,
    hardConstraintViolation,
  };
}

export function divergencePlaceId(plannedRouteId: string, routeId: string): string | null {
  const planned = getRoute(plannedRouteId);
  const target = getRoute(routeId);
  for (let index = 0; index < target.segmentIds.length; index += 1) {
    if (planned.segmentIds[index] !== target.segmentIds[index]) {
      return getSegment(target.segmentIds[index]).fromPlaceId;
    }
  }
  return null;
}

export function routeSummary(route: Route): string {
  return route.segmentIds.map((id) => getPlace(getSegment(id).fromPlaceId).shortName).concat(getPlace(getSegment(route.segmentIds[route.segmentIds.length - 1]).toPlaceId).shortName).join(" → ");
}
