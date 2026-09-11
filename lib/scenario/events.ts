import type { AiInterpretation } from "@/lib/ai/types";
import { initialNetwork, type NetworkState } from "@/lib/scenario/engine/network";
import type {
  Actor,
  DecisionRecord,
  DecisionStatus,
  EvidenceItem,
  Incident,
  Instruction,
  RoadState,
} from "@/lib/scenario/types";

export type PortalEventPayload =
  | { type: "scenario.started"; startedAt: number }
  | { type: "incident.reported"; incident: Incident; evidence: EvidenceItem }
  | { type: "evidence.added"; evidence: EvidenceItem }
  | { type: "incident.verified"; incidentId: string }
  | { type: "incident.rejected"; incidentId: string; note: string | null }
  | { type: "incident.more_evidence_requested"; incidentId: string }
  | {
      type: "segment.state_changed";
      segmentId: string;
      from: RoadState;
      to: RoadState;
      reason: string;
      incidentId: string | null;
    }
  | { type: "mission.vehicle_changed"; missionId: string; vehicleId: string }
  | { type: "decision.recommended"; decision: DecisionRecord }
  | { type: "decision.acted"; decisionId: string; status: Exclude<DecisionStatus, "RECOMMENDED" | "SUPERSEDED">; note: string | null }
  | { type: "decision.superseded"; decisionId: string; supersededBy: string; reason: string }
  | { type: "reassessment.triggered"; reason: string; incidentId: string | null; missionIds: string[] }
  | { type: "instruction.issued"; instruction: Instruction }
  | { type: "instruction.acknowledged"; instructionId: string; by: string }
  | { type: "ai.interpreted"; interpretation: AiInterpretation };

export type PortalEvent = {
  seq?: number;
  id: string;
  at: number;
  actor: Actor;
  summary: string;
  payload: PortalEventPayload;
};

export type Reassessment = { at: number; reason: string; incidentId: string | null; missionIds: string[] };

export type PortalState = {
  startedAt: number | null;
  incidents: Record<string, Incident>;
  incidentOrder: string[];
  evidence: EvidenceItem[];
  network: NetworkState;
  vehicleOverrides: Record<string, string>;
  decisions: Record<string, DecisionRecord>;
  decisionOrder: string[];
  instructions: Record<string, Instruction>;
  instructionOrder: string[];
  reassessments: Reassessment[];
  interpretations: Record<string, AiInterpretation>;
  interpretationCount: number;
  events: PortalEvent[];
};

export function emptyState(): PortalState {
  return {
    startedAt: null,
    incidents: {},
    incidentOrder: [],
    evidence: [],
    network: {},
    vehicleOverrides: {},
    decisions: {},
    decisionOrder: [],
    instructions: {},
    instructionOrder: [],
    reassessments: [],
    interpretations: {},
    interpretationCount: 0,
    events: [],
  };
}

export function applyEvent(state: PortalState, event: PortalEvent): PortalState {
  const next: PortalState = { ...state, events: [...state.events, event] };
  const payload = event.payload;
  switch (payload.type) {
    case "scenario.started":
      next.startedAt = payload.startedAt;
      next.network = initialNetwork(payload.startedAt);
      return next;
    case "incident.reported":
      next.incidents = { ...state.incidents, [payload.incident.id]: payload.incident };
      next.incidentOrder = [...state.incidentOrder, payload.incident.id];
      next.evidence = [...state.evidence, payload.evidence];
      next.network = attachIncident(state.network, payload.incident.segmentId, payload.incident.id);
      return next;
    case "evidence.added":
      next.evidence = [...state.evidence, payload.evidence];
      return next;
    case "incident.verified": {
      const incident = state.incidents[payload.incidentId];
      if (!incident) return next;
      next.incidents = { ...state.incidents, [incident.id]: { ...incident, verifiedAt: event.at, verifiedBy: event.actor } };
      return next;
    }
    case "incident.rejected": {
      const incident = state.incidents[payload.incidentId];
      if (!incident) return next;
      next.incidents = { ...state.incidents, [incident.id]: { ...incident, rejectedAt: event.at, rejectedBy: event.actor } };
      return next;
    }
    case "incident.more_evidence_requested": {
      const incident = state.incidents[payload.incidentId];
      if (!incident) return next;
      next.incidents = { ...state.incidents, [incident.id]: { ...incident, moreEvidenceRequestedAt: event.at } };
      return next;
    }
    case "segment.state_changed": {
      const runtime = state.network[payload.segmentId];
      if (!runtime) return next;
      next.network = {
        ...state.network,
        [payload.segmentId]: {
          ...runtime,
          state: payload.to,
          lastVerifiedAt: event.at,
          reason: payload.reason,
          incidentIds: payload.incidentId && !runtime.incidentIds.includes(payload.incidentId)
            ? [...runtime.incidentIds, payload.incidentId]
            : runtime.incidentIds,
        },
      };
      return next;
    }
    case "mission.vehicle_changed":
      next.vehicleOverrides = { ...state.vehicleOverrides, [payload.missionId]: payload.vehicleId };
      return next;
    case "decision.recommended":
      next.decisions = { ...state.decisions, [payload.decision.id]: payload.decision };
      next.decisionOrder = [...state.decisionOrder, payload.decision.id];
      return next;
    case "decision.acted": {
      const decision = state.decisions[payload.decisionId];
      if (!decision) return next;
      next.decisions = {
        ...state.decisions,
        [decision.id]: {
          ...decision,
          status: payload.status,
          actedBy: event.actor,
          actedAt: event.at,
          actedStatus: payload.status,
          actionNote: payload.note,
        },
      };
      return next;
    }
    case "decision.superseded": {
      const decision = state.decisions[payload.decisionId];
      if (!decision) return next;
      next.decisions = {
        ...state.decisions,
        [decision.id]: { ...decision, status: "SUPERSEDED", supersededBy: payload.supersededBy, supersededAt: event.at },
      };
      return next;
    }
    case "reassessment.triggered":
      next.reassessments = [
        ...state.reassessments,
        { at: event.at, reason: payload.reason, incidentId: payload.incidentId, missionIds: payload.missionIds },
      ];
      return next;
    case "instruction.issued":
      next.instructions = { ...state.instructions, [payload.instruction.id]: payload.instruction };
      next.instructionOrder = [...state.instructionOrder, payload.instruction.id];
      return next;
    case "instruction.acknowledged": {
      const instruction = state.instructions[payload.instructionId];
      if (!instruction) return next;
      next.instructions = {
        ...state.instructions,
        [instruction.id]: { ...instruction, acknowledgedAt: event.at, acknowledgedBy: payload.by },
      };
      return next;
    }
    case "ai.interpreted":
      next.interpretations = { ...state.interpretations, [payload.interpretation.incidentId]: payload.interpretation };
      next.interpretationCount = state.interpretationCount + 1;
      return next;
    default:
      return next;
  }
}

function attachIncident(network: NetworkState, segmentId: string, incidentId: string): NetworkState {
  const runtime = network[segmentId];
  if (!runtime || runtime.incidentIds.includes(incidentId)) return network;
  return { ...network, [segmentId]: { ...runtime, incidentIds: [...runtime.incidentIds, incidentId] } };
}

export function reduceEvents(events: PortalEvent[]): PortalState {
  return events.reduce(applyEvent, emptyState());
}
