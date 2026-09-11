import type { AiInterpretation } from "@/lib/ai/types";
import { assessIncidentFallback } from "@/lib/scenario/engine/ai";
import { recommendDecision, recommendationsDiffer } from "@/lib/scenario/engine/decision";
import { distanceKm } from "@/lib/scenario/engine/geo";
import { effectiveNetwork } from "@/lib/scenario/engine/network";
import { applyEvent, type PortalEvent, type PortalEventPayload, type PortalState } from "@/lib/scenario/events";
import {
  getMission,
  getPlace,
  getSegment,
  getVehicle,
  missions,
  primaryIncidentSeed,
  secondaryIncidentSeed,
} from "@/lib/scenario/seed/nh29";
import type {
  Actor,
  DecisionRecord,
  DecisionStatus,
  EvidenceItem,
  Incident,
  IncidentCategory,
  Instruction,
  RoadState,
} from "@/lib/scenario/types";

export const systemActor: Actor = { name: "NIRNYAY engine", role: "SYSTEM" };

const priorityOrder = { CRITICAL: 0, HIGH: 1, NORMAL: 2 } as const;
const demoRelocationKm = 25;

function pad(value: number): string {
  return String(value).padStart(3, "0");
}

function newId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function makeEvent(actor: Actor, at: number, summary: string, payload: PortalEventPayload): PortalEvent {
  return { id: newId("evt"), at, actor, summary, payload };
}

export type FieldReportSource = {
  reportId: string;
  reference: string;
  submittedAt: number;
  latitude: number;
  longitude: number;
  accuracyM: number;
  category: IncidentCategory | null;
  note: string | null;
};

export type IncidentSeedLike = typeof primaryIncidentSeed;

export function currentVehicleId(state: PortalState, missionId: string): string {
  return state.vehicleOverrides[missionId] ?? getMission(missionId).vehicleId;
}

export function deadlineAt(state: PortalState, missionId: string): number {
  return (state.startedAt ?? 0) + getMission(missionId).deadlineHours * 3_600_000;
}

export function activeDecisionFor(state: PortalState, missionId: string): DecisionRecord | null {
  for (let index = state.decisionOrder.length - 1; index >= 0; index -= 1) {
    const decision = state.decisions[state.decisionOrder[index]];
    if (decision.missionId !== missionId) continue;
    if (decision.status === "SUPERSEDED" || decision.status === "REJECTED") continue;
    return decision;
  }
  return null;
}

export function startScenario(actor: Actor, now: number): PortalEvent[] {
  return [
    makeEvent(actor, now, "Scenario started — network in normal state, all missions on time", {
      type: "scenario.started",
      startedAt: now,
    }),
  ];
}

export function reportIncident(
  state: PortalState,
  actor: Actor,
  now: number,
  seed: IncidentSeedLike,
  fieldReport: FieldReportSource | null,
): PortalEvent[] {
  const index = state.incidentOrder.length + 1;
  const incidentId = `INC-${pad(index)}`;
  const category = fieldReport?.category ?? seed.category;
  const note = fieldReport?.note ?? seed.note;
  const incident: Incident = {
    id: incidentId,
    reference: seed.reference,
    segmentId: seed.segmentId,
    lat: seed.lat,
    lon: seed.lon,
    reportedAt: fieldReport?.submittedAt ?? now,
    category,
    note,
    fullBlockage: seed.fullBlockage,
    verifiedAt: null,
    verifiedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    moreEvidenceRequestedAt: null,
    ai: assessIncidentFallback(category, note),
  };

  let evidence: EvidenceItem;
  if (fieldReport) {
    const offsetKm = distanceKm(seed.lat, seed.lon, fieldReport.latitude, fieldReport.longitude);
    const relocated = offsetKm > demoRelocationKm;
    evidence = {
      id: newId("ev"),
      incidentId,
      kind: "FIELD_REPORT",
      origin: "FIELD",
      source: "Field report (public reporter, identity not verified)",
      title: `Field report ${fieldReport.reference}`,
      summary: relocated
        ? `Demo relocation: the device reported ${fieldReport.latitude.toFixed(4)}, ${fieldReport.longitude.toFixed(4)} (${Math.round(offsetKm)} km from the corridor). For the controlled simulation the incident is placed on ${getSegment(seed.segmentId).name}; original coordinates retained.`
        : `Photo, device location (±${Math.round(fieldReport.accuracyM)} m) and capture time submitted from the field.`,
      capturedAt: fieldReport.submittedAt,
      lat: relocated ? seed.lat : fieldReport.latitude,
      lon: relocated ? seed.lon : fieldReport.longitude,
      accuracyM: fieldReport.accuracyM,
      originalLat: fieldReport.latitude,
      originalLon: fieldReport.longitude,
      reliability: 0.6,
      photo: { kind: "field-db", reportId: fieldReport.reportId },
      fieldReportReference: fieldReport.reference,
    };
  } else {
    evidence = {
      id: newId("ev"),
      incidentId,
      kind: "FIELD_REPORT",
      origin: "SEEDED",
      source: "Seeded field report (demo data)",
      title: `Field report (demo) at ${getPlace(getSegment(seed.segmentId).fromPlaceId).name}`,
      summary: "Photo, device location and capture time seeded for the controlled simulation.",
      capturedAt: now,
      lat: seed.lat,
      lon: seed.lon,
      accuracyM: 20,
      reliability: 0.6,
      photo: { kind: "none" },
    };
  }

  return [
    makeEvent(actor, now, `Incident ${seed.reference} reported on ${getSegment(seed.segmentId).name} — ${incident.ai.label}`, {
      type: "incident.reported",
      incident,
      evidence,
    }),
  ];
}

export type ContextEvidenceKind = "SECOND_REPORT" | "WEATHER" | "INSTITUTIONAL" | "HISTORICAL" | "LOGISTICS" | "NETWORK_RECORD";

export const allContextEvidenceKinds: ContextEvidenceKind[] = ["SECOND_REPORT", "WEATHER", "INSTITUTIONAL", "HISTORICAL", "LOGISTICS", "NETWORK_RECORD"];

const contextEvidenceTemplates: Record<
  ContextEvidenceKind,
  (incident: Incident) => Omit<EvidenceItem, "id" | "incidentId" | "capturedAt">
> = {
  SECOND_REPORT: (incident) => ({
    kind: "SECOND_REPORT",
    origin: "SIMULATED",
    source: "District control room call log (SIMULATED)",
    title: "Second report — control room",
    summary: `Caller reports the carriageway near ${getPlace(getSegment(incident.segmentId).fromPlaceId).name} obstructed and traffic halted in both directions.`,
    lat: incident.lat + 0.004,
    lon: incident.lon - 0.003,
    distanceKm: 0.5,
    reliability: 0.8,
    contextualConsistency: 0.9,
  }),
  WEATHER: (incident) => ({
    kind: "WEATHER",
    origin: "SIMULATED",
    source: "IMD district rainfall bulletin (SIMULATED)",
    title: "Weather context",
    summary: `Very heavy rainfall recorded over the ${getSegment(incident.segmentId).corridor} hill section in the last 24 h; landslide advisory in force.`,
    reliability: 0.85,
    contextualConsistency: 1,
  }),
  INSTITUTIONAL: () => ({
    kind: "INSTITUTIONAL",
    origin: "SIMULATED",
    source: "SACHET / NDMA alert feed (SIMULATED)",
    title: "Institutional context",
    summary: "Landslide alert issued for the district; SACHET does not itself confirm any specific road closure.",
    reliability: 0.9,
    contextualConsistency: 0.9,
  }),
  HISTORICAL: (incident) => ({
    kind: "HISTORICAL",
    origin: "SEEDED",
    source: "NIRNYAY scenario record (seeded)",
    title: "Historical context",
    summary: `${getSegment(incident.segmentId).name} has recurrent monsoon slope failures; the September 2024 NH-29 disruption is the basis of this reconstruction.`,
    reliability: 0.7,
    contextualConsistency: 0.8,
  }),
  LOGISTICS: (incident) => ({
    kind: "LOGISTICS",
    origin: "SIMULATED",
    source: "Transport operator status feed (SIMULATED)",
    title: "Logistics report",
    summary: `Two operator convoys report being halted on the ${getSegment(incident.segmentId).corridor} approach with no movement for 40 min; no vehicle has cleared the stretch.`,
    reliability: 0.75,
    contextualConsistency: 0.85,
  }),
  NETWORK_RECORD: (incident) => ({
    kind: "NETWORK_RECORD",
    origin: "SEEDED",
    source: "NIRNYAY network register (seeded)",
    title: "Network / road-condition record",
    summary: `${getSegment(incident.segmentId).name} is recorded as a ${getSegment(incident.segmentId).roadClass.toLowerCase()} with no active closure before this report; last patrol verification within the current freshness window.`,
    reliability: 0.8,
    contextualConsistency: 0.7,
  }),
};

export function addContextEvidence(
  state: PortalState,
  actor: Actor,
  now: number,
  incidentId: string,
  kinds: ContextEvidenceKind[],
): PortalEvent[] {
  const incident = state.incidents[incidentId];
  if (!incident) return [];
  const existing = new Set(state.evidence.filter((item) => item.incidentId === incidentId).map((item) => item.kind));
  return kinds
    .filter((kind) => !existing.has(kind))
    .map((kind, offset) => {
      const template = contextEvidenceTemplates[kind](incident);
      const evidence: EvidenceItem = { ...template, id: newId("ev"), incidentId, capturedAt: now - (30 - offset * 5) * 60_000 };
      return makeEvent(actor, now + offset, `${template.title} attached to ${incident.reference} (${template.origin.toLowerCase()})`, {
        type: "evidence.added",
        evidence,
      });
    });
}

export function attachNearbyReports(
  state: PortalState,
  actor: Actor,
  now: number,
  incidentId: string,
  reports: FieldReportSource[],
  maxKm = 5,
  windowHours = 6,
): PortalEvent[] {
  const incident = state.incidents[incidentId];
  if (!incident) return [];
  const primary = state.evidence.find((item) => item.incidentId === incidentId && item.kind === "FIELD_REPORT");
  if (!primary) return [];
  const anchorLat = primary.originalLat ?? primary.lat ?? incident.lat;
  const anchorLon = primary.originalLon ?? primary.lon ?? incident.lon;
  const attached = new Set(state.evidence.flatMap((item) => (item.photo?.kind === "field-db" ? [item.photo.reportId] : [])));
  const events: PortalEvent[] = [];
  for (const report of reports) {
    if (attached.has(report.reportId)) continue;
    if (Math.abs(report.submittedAt - incident.reportedAt) > windowHours * 3_600_000) continue;
    const km = distanceKm(anchorLat, anchorLon, report.latitude, report.longitude);
    if (km > maxKm) continue;
    const rounded = Math.round(km * 10) / 10;
    const evidence: EvidenceItem = {
      id: newId("ev"),
      incidentId,
      kind: "NEARBY_REPORT",
      origin: "FIELD",
      source: "Nearby field report from another device / user (field data)",
      title: `Nearby report ${report.reference}`,
      summary: report.note
        ? `Independent report ${rounded} km from the primary report: "${report.note}"`
        : `Independent report ${rounded} km from the primary report with photo, device location and time.`,
      capturedAt: report.submittedAt,
      lat: incident.lat + (report.latitude - anchorLat),
      lon: incident.lon + (report.longitude - anchorLon),
      accuracyM: report.accuracyM,
      distanceKm: rounded,
      originalLat: report.latitude,
      originalLon: report.longitude,
      reliability: 0.65,
      contextualConsistency: 0.9,
      photo: { kind: "field-db", reportId: report.reportId },
      fieldReportReference: report.reference,
    };
    events.push(
      makeEvent(actor, now + events.length, `Nearby field report ${report.reference} (${rounded} km, within ${windowHours} h) attached to ${incident.reference}`, {
        type: "evidence.added",
        evidence,
      }),
    );
  }
  return events;
}

export function rejectIncident(state: PortalState, actor: Actor, now: number, incidentId: string, note: string | null): PortalEvent[] {
  const incident = state.incidents[incidentId];
  if (!incident || incident.verifiedAt || incident.rejectedAt) return [];
  return [
    makeEvent(actor, now, `Incident ${incident.reference} REJECTED by ${actor.name} (${actor.role})${note ? ` — ${note}` : ""}`, {
      type: "incident.rejected",
      incidentId,
      note,
    }),
  ];
}

export function verifyIncident(state: PortalState, actor: Actor, now: number, incidentId: string): PortalEvent[] {
  const incident = state.incidents[incidentId];
  if (!incident || incident.verifiedAt || incident.rejectedAt) return [];
  return [
    makeEvent(actor, now, `Incident ${incident.reference} VERIFIED by ${actor.name} (${actor.role})`, {
      type: "incident.verified",
      incidentId,
    }),
  ];
}

export function requestMoreEvidence(state: PortalState, actor: Actor, now: number, incidentId: string): PortalEvent[] {
  const incident = state.incidents[incidentId];
  if (!incident) return [];
  return [
    makeEvent(actor, now, `More evidence requested for ${incident.reference}`, {
      type: "incident.more_evidence_requested",
      incidentId,
    }),
  ];
}

export function changeSegmentState(
  state: PortalState,
  actor: Actor,
  now: number,
  segmentId: string,
  to: RoadState,
  reason: string,
  incidentId: string | null,
): PortalEvent[] {
  const runtime = state.network[segmentId];
  if (!runtime) return [];
  const segment = getSegment(segmentId);
  const change = makeEvent(actor, now, `${segment.name} (${segment.corridor}): ${runtime.state} → ${to}`, {
    type: "segment.state_changed",
    segmentId,
    from: runtime.state,
    to,
    reason,
    incidentId,
  });
  const afterChange = applyEvent(state, change);
  const incidentRef = incidentId ? state.incidents[incidentId]?.reference ?? incidentId : null;
  const trigger = `Network change: ${segment.name} (${segment.corridor}) ${runtime.state} → ${to}${incidentRef ? ` after verified incident ${incidentRef}` : ""}`;
  return [change, ...assessMissions(afterChange, now + 1, trigger, incidentId)];
}

export function changeMissionVehicle(
  state: PortalState,
  actor: Actor,
  now: number,
  missionId: string,
  vehicleId: string,
): PortalEvent[] {
  if (currentVehicleId(state, missionId) === vehicleId) return [];
  const vehicle = getVehicle(vehicleId);
  const change = makeEvent(actor, now, `${missionId} vehicle changed to ${vehicle.name} (${vehicle.vehicleClass})`, {
    type: "mission.vehicle_changed",
    missionId,
    vehicleId,
  });
  const afterChange = applyEvent(state, change);
  return [change, ...assessMissions(afterChange, now + 1, `Vehicle change: ${missionId} now assigned ${vehicle.name} (${vehicle.vehicleClass})`, null, [missionId])];
}

export function assessMissions(
  state: PortalState,
  now: number,
  trigger: string,
  incidentId: string | null,
  onlyMissionIds?: string[],
): PortalEvent[] {
  if (!state.startedAt) return [];
  const network = effectiveNetwork(state.network, now);
  const events: PortalEvent[] = [];
  let working = state;
  let decisionCount = state.decisionOrder.length;
  const reassessed: string[] = [];
  const ordered = [...missions]
    .filter((mission) => !onlyMissionIds || onlyMissionIds.includes(mission.id))
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  for (const mission of ordered) {
    const active = activeDecisionFor(working, mission.id);
    const vehicle = getVehicle(currentVehicleId(working, mission.id));
    const recommendation = recommendDecision(mission, vehicle, {
      network,
      deadlineAt: deadlineAt(working, mission.id),
      now,
      supersedesApprovedAction: active?.status === "APPROVED",
      triggerDescription: trigger,
    });
    if (!active && recommendation.action === "CONTINUE") continue;
    if (active && !recommendationsDiffer(active.recommendation, recommendation)) continue;

    decisionCount += 1;
    const decision: DecisionRecord = {
      id: `DEC-${pad(decisionCount)}`,
      missionId: mission.id,
      createdAt: now,
      status: "RECOMMENDED",
      recommendation,
      triggerIncidentId: incidentId,
      reassessmentOf: active?.id ?? null,
      supersededBy: null,
      supersededAt: null,
      actedBy: null,
      actedAt: null,
      actedStatus: null,
      actionNote: null,
    };
    if (active) {
      reassessed.push(mission.id);
      const supersede = makeEvent(systemActor, now, `${active.id} (${mission.id} ${active.recommendation.action}) SUPERSEDED — ${trigger}`, {
        type: "decision.superseded",
        decisionId: active.id,
        supersededBy: decision.id,
        reason: trigger,
      });
      events.push(supersede);
      working = applyEvent(working, supersede);
    }
    const recommended = makeEvent(
      systemActor,
      now,
      `${decision.id}: ${mission.id} → ${recommendation.action}${recommendation.routeId ? ` via Route ${recommendation.routeId}` : ""}${recommendation.noVerifiedFeasibleRoute ? " (no currently verified feasible route)" : ""}`,
      { type: "decision.recommended", decision },
    );
    events.push(recommended);
    working = applyEvent(working, recommended);
  }

  if (reassessed.length > 0) {
    events.unshift(
      makeEvent(systemActor, now, `Reassessment triggered — ${trigger}`, {
        type: "reassessment.triggered",
        reason: trigger,
        incidentId,
        missionIds: reassessed,
      }),
    );
  }
  return events;
}

export function actOnDecision(
  state: PortalState,
  actor: Actor,
  now: number,
  decisionId: string,
  status: Exclude<DecisionStatus, "RECOMMENDED" | "SUPERSEDED">,
  note: string | null,
): PortalEvent[] {
  const decision = state.decisions[decisionId];
  if (!decision || decision.status === "SUPERSEDED") return [];
  const labels = { APPROVED: "APPROVED", REJECTED: "REJECTED", VERIFICATION_REQUESTED: "sent back for verification" } as const;
  const events: PortalEvent[] = [
    makeEvent(actor, now, `${decision.id} (${decision.missionId} ${decision.recommendation.action}) ${labels[status]} by ${actor.name}`, {
      type: "decision.acted",
      decisionId,
      status,
      note,
    }),
  ];
  if (status === "APPROVED" && decision.recommendation.instruction) {
    const instruction: Instruction = {
      id: `INS-${pad(state.instructionOrder.length + 1)}`,
      decisionId,
      missionId: decision.missionId,
      text: decision.recommendation.instruction,
      issuedAt: now,
      acknowledgedAt: null,
      acknowledgedBy: null,
    };
    events.push(
      makeEvent(systemActor, now + 1, `Instruction ${instruction.id} issued to ${decision.missionId}: ${instruction.text}`, {
        type: "instruction.issued",
        instruction,
      }),
    );
  }
  return events;
}

export function acknowledgeInstruction(state: PortalState, now: number, instructionId: string): PortalEvent[] {
  const instruction = state.instructions[instructionId];
  if (!instruction || instruction.acknowledgedAt) return [];
  const driver = getMission(instruction.missionId).driverName;
  return [
    makeEvent({ name: driver, role: "DRIVER" }, now, `${instruction.id} acknowledged by ${driver} (${instruction.missionId})`, {
      type: "instruction.acknowledged",
      instructionId,
      by: driver,
    }),
  ];
}

export function recordInterpretation(state: PortalState, now: number, interpretation: Omit<AiInterpretation, "id">): PortalEvent[] {
  const incident = state.incidents[interpretation.incidentId];
  if (!incident) return [];
  const existing = state.interpretations[interpretation.incidentId];
  if (existing && existing.inputFingerprint === interpretation.inputFingerprint && existing.provider.kind === interpretation.provider.kind) return [];
  const record: AiInterpretation = { ...interpretation, id: `AI-${pad(state.interpretationCount + 1)}` };
  return [
    makeEvent(
      { name: record.provider.name, role: "SYSTEM" },
      now,
      `AI-assisted interpretation ${record.id} recorded for ${incident.reference} — ${record.hazard.label}, confidence ${record.confidence.toFixed(2)} (assistive only; no state changed)`,
      { type: "ai.interpreted", interpretation: record },
    ),
  ];
}

export function secondDisruption(state: PortalState, actor: Actor, now: number): PortalEvent[] {
  const events: PortalEvent[] = [];
  let working = state;
  const push = (batch: PortalEvent[]) => {
    for (const event of batch) {
      events.push(event);
      working = applyEvent(working, event);
    }
  };
  push(reportIncident(working, actor, now, secondaryIncidentSeed, null));
  const incidentId = working.incidentOrder[working.incidentOrder.length - 1];
  push(addContextEvidence(working, systemActor, now + 10, incidentId, ["SECOND_REPORT", "WEATHER", "INSTITUTIONAL", "LOGISTICS", "NETWORK_RECORD"]));
  push(verifyIncident(working, actor, now + 20, incidentId));
  push(
    changeSegmentState(
      working,
      actor,
      now + 30,
      secondaryIncidentSeed.segmentId,
      "BLOCKED",
      `Verified incident ${secondaryIncidentSeed.reference}: ${secondaryIncidentSeed.note}`,
      incidentId,
    ),
  );
  return events;
}

export { primaryIncidentSeed, secondaryIncidentSeed };
