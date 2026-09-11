import { clamp01, round2 } from "@/lib/scenario/engine/geo";
import type { EffectiveSegment } from "@/lib/scenario/engine/network";
import { getRoute, getSegment } from "@/lib/scenario/seed/nh29";
import type { ImpactLevel, Incident, Mission, Priority, PriorityTier } from "@/lib/scenario/types";

export const severityWeights = { H: 0.35, A: 0.2, R: 0.2, X: 0.25 } as const;
export const impactWeights = { Q: 0.3, U: 0.2, T: 0.2, R: 0.15, G: 0.15 } as const;
export const priorityWeights = { D: 0.4, Mi: 0.6 } as const;

const hazardByCategory: Record<Incident["category"], number> = {
  landslide: 0.9,
  flooding: 0.8,
  "road-damage": 0.6,
  bridge: 0.85,
  blockage: 0.7,
  other: 0.5,
};

const criticalityByPriority: Record<Priority, number> = { CRITICAL: 1, HIGH: 0.7, NORMAL: 0.3 };

export type SeverityAssessment = { H: number; A: number; R: number; X: number; D: number };

export function assessSeverity(incident: Incident): SeverityAssessment {
  const segment = getSegment(incident.segmentId);
  const H = hazardByCategory[incident.category];
  const A = segment.corridor === "NH-29" ? 1 : 0.6;
  const R = incident.fullBlockage ? 1 : 0.6;
  const X = 0.6;
  const D = clamp01(severityWeights.H * H + severityWeights.A * A + severityWeights.R * R + severityWeights.X * X);
  return { H, A, R, X, D: round2(D) };
}

export type ImpactAssessment = {
  Q: number;
  U: number;
  T: number;
  R: number;
  G: number;
  Mi: number;
  level: ImpactLevel;
  affectedSegmentIds: string[];
  slackHours: number;
};

export function impactLevel(Mi: number, affected: boolean): ImpactLevel {
  if (!affected) return "NONE";
  if (Mi >= 0.8) return "SEVERE";
  if (Mi >= 0.6) return "HIGH";
  if (Mi >= 0.4) return "MODERATE";
  return "LOW";
}

export function assessMissionImpact(
  mission: Mission,
  network: Record<string, EffectiveSegment>,
  deadlineAt: number,
  now: number,
): ImpactAssessment {
  const route = getRoute(mission.plannedRouteId);
  const plannedMin = route.segmentIds.reduce((sum, id) => sum + getSegment(id).travelMin, 0);
  const affectedSegmentIds = route.segmentIds.filter((id) => !network[id]?.usable);
  const slackHours = (deadlineAt - (now + plannedMin * 60_000)) / 3_600_000;
  const Q = criticalityByPriority[mission.priority];
  const U = clamp01(1 - slackHours / 24);
  const T = mission.timeSensitivity;
  const R = affectedSegmentIds.length > 0 ? 1 : 0;
  const G = mission.consequenceExposure;
  const Mi = clamp01(impactWeights.Q * Q + impactWeights.U * U + impactWeights.T * T + impactWeights.R * R + impactWeights.G * G);
  return {
    Q,
    U: round2(U),
    T,
    R,
    G,
    Mi: round2(Mi),
    level: impactLevel(Mi, affectedSegmentIds.length > 0),
    affectedSegmentIds,
    slackHours: round2(slackHours),
  };
}

export function operationalPriority(D: number, Mi: number): { P: number; tier: PriorityTier } {
  const P = round2(clamp01(priorityWeights.D * D + priorityWeights.Mi * Mi));
  const tier: PriorityTier = P >= 0.8 ? "CRITICAL" : P >= 0.6 ? "HIGH" : P >= 0.4 ? "MODERATE" : "LOW";
  return { P, tier };
}
