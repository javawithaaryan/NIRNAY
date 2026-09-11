import type { AiInterpretation } from "@/lib/ai/types";
import { assessEvidence, type EvidenceAssessment } from "@/lib/scenario/engine/evidence";
import { evaluateRoute, routeDistanceKm, routeTravelMin } from "@/lib/scenario/engine/feasibility";
import { effectiveNetwork, type EffectiveSegment } from "@/lib/scenario/engine/network";
import {
  assessMissionImpact,
  assessSeverity,
  operationalPriority,
  type ImpactAssessment,
  type SeverityAssessment,
} from "@/lib/scenario/engine/scoring";
import { activeDecisionFor, currentVehicleId, deadlineAt } from "@/lib/scenario/commands";
import type { PortalEvent, PortalState } from "@/lib/scenario/events";
import { getRoute, getSegment, getVehicle, missions, routes } from "@/lib/scenario/seed/nh29";
import type {
  DecisionRecord,
  EvidenceItem,
  Incident,
  Instruction,
  Mission,
  PriorityTier,
  Route,
  RouteEvaluation,
  Vehicle,
} from "@/lib/scenario/types";

export type IncidentView = {
  incident: Incident;
  segment: EffectiveSegment | null;
  evidence: EvidenceItem[];
  assessment: EvidenceAssessment;
  severity: SeverityAssessment;
  networkApplied: boolean;
  interpretation: AiInterpretation | null;
};

export type ResponseState =
  | "ON_TIME"
  | "AFFECTED"
  | "AWAITING_AUTHORITY"
  | "VERIFICATION_REQUESTED"
  | "REJECTED"
  | "HOLD"
  | "REROUTE_PENDING_ACK"
  | "REROUTING";

export type MissionView = {
  mission: Mission;
  vehicle: Vehicle;
  deadlineAt: number;
  impact: ImpactAssessment;
  priority: { P: number; tier: PriorityTier; D: number };
  evaluations: RouteEvaluation[];
  activeDecision: DecisionRecord | null;
  decisions: DecisionRecord[];
  instruction: Instruction | null;
  responseState: ResponseState;
  currentRouteId: string;
  etaAt: number | null;
};

export type RouteView = {
  route: Route;
  distanceKm: number;
  travelMin: number;
  segments: EffectiveSegment[];
  worstState: string;
};

export type ActionItem = {
  id: string;
  kind: "VERIFY" | "APPROVE" | "ACKNOWLEDGE" | "REASSESSED" | "NETWORK";
  title: string;
  detail: string;
  href: string;
  severity: "critical" | "high" | "normal";
};

export type PortalView = {
  startedAt: number | null;
  now: number;
  incidents: IncidentView[];
  network: Record<string, EffectiveSegment>;
  segments: EffectiveSegment[];
  missions: MissionView[];
  routes: RouteView[];
  decisions: DecisionRecord[];
  instructions: Instruction[];
  actionItems: ActionItem[];
  events: PortalEvent[];
  summary: { activeIncidents: number; affectedMissions: number; criticalResponses: number; pendingApprovals: number };
};

const stateSeverity = { BLOCKED: 5, HIGH_RISK: 4, UNKNOWN: 3, STALE: 2, RESTRICTED: 1, OPEN: 0 } as const;

function responseStateFor(decision: DecisionRecord | null, instruction: Instruction | null, affected: boolean): ResponseState {
  if (!decision) return affected ? "AFFECTED" : "ON_TIME";
  if (decision.status === "RECOMMENDED") return "AWAITING_AUTHORITY";
  if (decision.status === "VERIFICATION_REQUESTED") return "VERIFICATION_REQUESTED";
  if (decision.status === "REJECTED") return "REJECTED";
  if (decision.recommendation.action === "HOLD") return "HOLD";
  if (decision.recommendation.action === "REROUTE") return instruction?.acknowledgedAt ? "REROUTING" : "REROUTE_PENDING_ACK";
  return "ON_TIME";
}

export function buildView(state: PortalState, now: number): PortalView {
  const network = effectiveNetwork(state.network, now);
  const segments = Object.values(network);

  const incidents: IncidentView[] = state.incidentOrder.map((id) => {
    const incident = state.incidents[id];
    const evidence = state.evidence.filter((item) => item.incidentId === id);
    const segment = network[incident.segmentId] ?? null;
    return {
      incident,
      segment,
      evidence,
      assessment: assessEvidence(incident, evidence, now),
      severity: assessSeverity(incident),
      networkApplied: segment?.runtime.incidentIds.includes(id) === true && segment.recordedState === "BLOCKED",
      interpretation: state.interpretations[id] ?? null,
    };
  });

  const decisions = state.decisionOrder.map((id) => state.decisions[id]);
  const instructions = state.instructionOrder.map((id) => state.instructions[id]);

  const missionViews: MissionView[] = missions.map((mission) => {
    const vehicle = getVehicle(currentVehicleId(state, mission.id));
    const deadline = deadlineAt(state, mission.id);
    const impact = assessMissionImpact(mission, network, deadline, now);
    const affectingIncidents = incidents.filter((view) => impact.affectedSegmentIds.includes(view.incident.segmentId));
    const D = affectingIncidents.length ? Math.max(...affectingIncidents.map((view) => view.severity.D)) : 0;
    const evaluations = routes.map((route) => evaluateRoute(route.id, mission, vehicle, network, deadline, now));
    const activeDecision = state.startedAt ? activeDecisionFor(state, mission.id) : null;
    const missionDecisions = decisions.filter((decision) => decision.missionId === mission.id);
    const latestDecision = missionDecisions[missionDecisions.length - 1] ?? null;
    const instruction = activeDecision
      ? instructions.filter((item) => item.decisionId === activeDecision.id).at(-1) ?? null
      : null;
    const effectiveDecision = activeDecision ?? (latestDecision?.status === "REJECTED" ? latestDecision : null);
    const responseState = responseStateFor(effectiveDecision, instruction, impact.affectedSegmentIds.length > 0);
    const currentRouteId =
      activeDecision?.status === "APPROVED" && activeDecision.recommendation.routeId
        ? activeDecision.recommendation.routeId
        : mission.plannedRouteId;
    const currentEvaluation = evaluations.find((evaluation) => evaluation.routeId === currentRouteId) ?? null;
    return {
      mission,
      vehicle,
      deadlineAt: deadline,
      impact,
      priority: { ...operationalPriority(D, impact.Mi), D },
      evaluations,
      activeDecision,
      decisions: missionDecisions,
      instruction,
      responseState,
      currentRouteId,
      etaAt: currentEvaluation && currentEvaluation.feasibility === "FEASIBLE" ? currentEvaluation.arrivalAt : null,
    };
  });

  const routeViews: RouteView[] = routes.map((route) => {
    const routeSegments = route.segmentIds.map((id) => network[id]).filter(Boolean);
    const worst = routeSegments.reduce(
      (acc, segment) => (stateSeverity[segment.effectiveState] > stateSeverity[acc] ? segment.effectiveState : acc),
      "OPEN" as EffectiveSegment["effectiveState"],
    );
    return {
      route,
      distanceKm: routeDistanceKm(route),
      travelMin: routeTravelMin(route),
      segments: routeSegments,
      worstState: worst,
    };
  });

  const actionItems: ActionItem[] = [];
  for (const view of incidents) {
    if (!view.incident.verifiedAt) {
      actionItems.push({
        id: `verify-${view.incident.id}`,
        kind: "VERIFY",
        title: `${view.incident.reference} · ${view.incident.ai.label}`,
        detail:
          view.assessment.status === "CORROBORATED"
            ? `Corroborated by ${view.assessment.independentSources} supporting sources (E = ${view.assessment.E}). Verification package ready for the officer.`
            : `Evidence quality E = ${view.assessment.E}. Awaiting corroboration or verification.`,
        href: `/incidents/${view.incident.id}`,
        severity: "high",
      });
    } else if (!view.networkApplied && view.segment && view.segment.recordedState !== "BLOCKED") {
      actionItems.push({
        id: `network-${view.incident.id}`,
        kind: "NETWORK",
        title: `${view.incident.reference} verified — network state not yet applied`,
        detail: `${view.segment.segment.name} is still recorded ${view.segment.recordedState}. Apply BLOCKED to trigger mission assessment.`,
        href: `/incidents/${view.incident.id}`,
        severity: "high",
      });
    }
  }
  for (const decision of decisions) {
    if (decision.status === "RECOMMENDED") {
      const mission = missions.find((item) => item.id === decision.missionId);
      actionItems.push({
        id: `approve-${decision.id}`,
        kind: "APPROVE",
        title: `${decision.missionId} · ${decision.recommendation.action}${decision.recommendation.routeId ? ` via Route ${decision.recommendation.routeId}` : ""}`,
        detail: decision.recommendation.noVerifiedFeasibleRoute
          ? "No currently verified feasible route. Recommendation awaits authority decision."
          : "Recommendation awaits authority decision.",
        href: "/approvals",
        severity: mission?.priority === "CRITICAL" ? "critical" : mission?.priority === "HIGH" ? "high" : "normal",
      });
    }
  }
  for (const instruction of instructions) {
    const decision = state.decisions[instruction.decisionId];
    if (!instruction.acknowledgedAt && decision?.status === "APPROVED") {
      actionItems.push({
        id: `ack-${instruction.id}`,
        kind: "ACKNOWLEDGE",
        title: `${instruction.missionId} · driver acknowledgement pending`,
        detail: instruction.text,
        href: "/monitoring",
        severity: "normal",
      });
    }
  }
  for (const reassessment of state.reassessments.slice(-3)) {
    actionItems.push({
      id: `reassess-${reassessment.at}`,
      kind: "REASSESSED",
      title: `Reassessment: ${reassessment.missionIds.join(", ")}`,
      detail: reassessment.reason,
      href: "/decisions",
      severity: "high",
    });
  }

  return {
    startedAt: state.startedAt,
    now,
    incidents,
    network,
    segments,
    missions: missionViews,
    routes: routeViews,
    decisions,
    instructions,
    actionItems,
    events: state.events,
    summary: {
      activeIncidents: incidents.length,
      affectedMissions: missionViews.filter((view) => view.impact.affectedSegmentIds.length > 0).length,
      criticalResponses: missionViews.filter((view) => view.activeDecision && view.mission.priority === "CRITICAL").length,
      pendingApprovals: decisions.filter((decision) => decision.status === "RECOMMENDED").length,
    },
  };
}

export function segmentLabel(segmentId: string): string {
  const segment = getSegment(segmentId);
  return `${segment.name} (${segment.corridor})`;
}

export function routeLabel(routeId: string): string {
  const route = getRoute(routeId);
  return `${route.name} · ${route.label}`;
}
