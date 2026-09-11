import type { PortalEvent, PortalState } from "@/lib/scenario/events";
import { severityWeights } from "@/lib/scenario/engine/scoring";
import { getPlace, getSegment } from "@/lib/scenario/seed/nh29";
import type { EvidenceItem, EvidenceKind } from "@/lib/scenario/types";
import type { IncidentView, PortalView } from "@/lib/scenario/view";

export type EvidenceRowStatus = "RECEIVED" | "CORROBORATES" | "SUPPORTS" | "CONTEXT";

export type EvidenceRow = {
  item: EvidenceItem;
  kindLabel: string;
  relevance: string;
  status: EvidenceRowStatus;
  contribution: string;
};

export type Freshness = "CURRENT" | "AGEING" | "STALE";
export type SeverityTier = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type SeverityFactor = { key: "H" | "A" | "R" | "X"; label: string; value: number; weight: number; why: string };

export type RailStageState = "pending" | "active" | "done" | "rejected";
export type RailStage = { key: string; label: string; state: RailStageState; detail: string };

export type NotificationState = "done" | "pending" | "not-applicable";
export type NotificationItem = { key: string; label: string; state: NotificationState; detail: string; simulated: boolean };

export type TimelineEntry = { at: number; label: string; detail: string; kind: "ai" | "human" | "system" | "field" };

export type IncidentIntelligence = {
  rows: EvidenceRow[];
  independentSources: number;
  freshness: Freshness;
  severityTier: SeverityTier;
  severityFactors: SeverityFactor[];
  synthesis: string;
  rail: RailStage[];
  notifications: NotificationItem[];
  timeline: TimelineEntry[];
  verificationState: "PENDING" | "READY" | "VERIFIED" | "REJECTED";
};

const kindLabels: Record<EvidenceKind, string> = {
  FIELD_REPORT: "Field report",
  NEARBY_REPORT: "Nearby field report",
  SECOND_REPORT: "Second report",
  WEATHER: "Weather context",
  INSTITUTIONAL: "Institutional alert",
  HISTORICAL: "Historical context",
  LOGISTICS: "Logistics report",
  NETWORK_RECORD: "Network record",
};

function rowFor(item: EvidenceItem): EvidenceRow {
  const base = { item, kindLabel: kindLabels[item.kind] };
  switch (item.kind) {
    case "FIELD_REPORT":
      return { ...base, relevance: "Primary", status: "RECEIVED", contribution: "Photo · GPS · time (L, T, S)" };
    case "NEARBY_REPORT":
      return { ...base, relevance: `${item.distanceKm ?? "?"} km`, status: "CORROBORATES", contribution: "Independent observation (C, L)" };
    case "SECOND_REPORT":
      return { ...base, relevance: `${item.distanceKm ?? 0.5} km`, status: "CORROBORATES", contribution: "Independent observation (C)" };
    case "WEATHER":
      return { ...base, relevance: "Relevant", status: "SUPPORTS", contribution: "Contextual consistency (K)" };
    case "INSTITUTIONAL":
      return { ...base, relevance: "Relevant", status: "CORROBORATES", contribution: "Institutional context (C, K)" };
    case "HISTORICAL":
      return { ...base, relevance: "Reference", status: "CONTEXT", contribution: "Background (K)" };
    case "LOGISTICS":
      return { ...base, relevance: "Relevant", status: "SUPPORTS", contribution: "Movement halted (C, K)" };
    case "NETWORK_RECORD":
      return { ...base, relevance: "Segment", status: "CONTEXT", contribution: "Prior road state (K)" };
  }
}

export function severityTier(D: number): SeverityTier {
  if (D >= 0.8) return "CRITICAL";
  if (D >= 0.6) return "HIGH";
  if (D >= 0.4) return "MODERATE";
  return "LOW";
}

function timelineLabel(event: PortalEvent): { label: string; kind: TimelineEntry["kind"] } | null {
  switch (event.payload.type) {
    case "incident.reported":
      return { label: "Incident detected — field report received", kind: "field" };
    case "ai.interpreted":
      return { label: "AI analysed the evidence (assistive)", kind: "ai" };
    case "evidence.added":
      return { label: `Evidence attached — ${event.payload.evidence.title}`, kind: event.payload.evidence.origin === "FIELD" ? "field" : "system" };
    case "incident.verified":
      return { label: "Officer verified the incident", kind: "human" };
    case "incident.rejected":
      return { label: "Officer rejected the incident", kind: "human" };
    case "incident.more_evidence_requested":
      return { label: "Officer requested more evidence", kind: "human" };
    case "segment.state_changed":
      return { label: `Network updated — ${event.payload.segmentId} ${event.payload.from} → ${event.payload.to}`, kind: "human" };
    case "reassessment.triggered":
      return { label: "Reassessment triggered", kind: "system" };
    case "decision.superseded":
      return { label: `${event.payload.decisionId} superseded`, kind: "system" };
    case "decision.recommended":
      return { label: `Recommendation generated — ${event.payload.decision.missionId} ${event.payload.decision.recommendation.action}`, kind: "system" };
    case "decision.acted":
      return { label: `Authority ${event.payload.status.toLowerCase().replace("_", " ")} ${event.payload.decisionId}`, kind: "human" };
    case "instruction.issued":
      return { label: `Driver instruction prepared — ${event.payload.instruction.missionId}`, kind: "system" };
    case "instruction.acknowledged":
      return { label: `Driver acknowledged — ${event.payload.instructionId}`, kind: "human" };
    default:
      return null;
  }
}

export function buildIncidentIntelligence(view: PortalView, incidentView: IncidentView, state: PortalState): IncidentIntelligence {
  const { incident, assessment, severity, evidence, interpretation, networkApplied, segment } = incidentView;
  const rows = evidence.map(rowFor);
  const freshness: Freshness = assessment.T >= 0.8 ? "CURRENT" : assessment.T >= 0.5 ? "AGEING" : "STALE";
  const seg = getSegment(incident.segmentId);
  const placeName = getPlace(seg.fromPlaceId).name;

  const severityFactors: SeverityFactor[] = [
    { key: "H", label: "Hazard severity", value: severity.H, weight: severityWeights.H, why: `${incident.category.replace("-", " ")} hazard class` },
    { key: "A", label: "Affected network importance", value: severity.A, weight: severityWeights.A, why: `${seg.corridor} ${seg.corridor === "NH-29" ? "is the primary Dimapur–Kohima artery" : "is a secondary corridor"}` },
    { key: "R", label: "Restriction / blockage severity", value: severity.R, weight: severityWeights.R, why: incident.fullBlockage ? "full carriageway blockage reported" : "partial restriction reported" },
    { key: "X", label: "Extent of disruption", value: severity.X, weight: severityWeights.X, why: "single segment, no alternative on the same corridor (seeded)" },
  ];

  const synthesis = assessment.corroborated
    ? `Multiple independent observations and contextual signals are consistent with a significant road obstruction near ${placeName} (${seg.corridor}). ${interpretation ? `AI interpretation: ${interpretation.hazard.label.toLowerCase()} (confidence ${interpretation.confidence.toFixed(2)}).` : ""}`
    : `A single field observation indicates a possible obstruction near ${placeName} (${seg.corridor}); independent corroboration is still pending.${interpretation ? ` AI interpretation: ${interpretation.hazard.label.toLowerCase()} (confidence ${interpretation.confidence.toFixed(2)}).` : ""}`;

  const verificationState = incident.rejectedAt ? "REJECTED" : incident.verifiedAt ? "VERIFIED" : assessment.corroborated ? "READY" : "PENDING";

  const decisions = view.decisions.filter((decision) => decision.createdAt >= incident.reportedAt);
  const activeDecisions = view.missions.map((mission) => mission.activeDecision).filter(Boolean);
  const approvedAll = activeDecisions.length > 0 && activeDecisions.every((decision) => decision!.status === "APPROVED");
  const instructions = view.instructions.filter((instruction) => instruction.issuedAt >= incident.reportedAt);
  const reassessed = state.reassessments.some((item) => item.incidentId === incident.id);

  const rail: RailStage[] = [
    { key: "report", label: "Field report received", state: "done", detail: `${incident.reference} · ${placeName}` },
    { key: "ai", label: "AI decoded", state: interpretation ? "done" : "active", detail: interpretation ? `${interpretation.hazard.label} · ${interpretation.confidence.toFixed(2)}` : "pending AI analysis" },
    { key: "corroboration", label: "Corroborated", state: assessment.corroborated ? "done" : interpretation ? "active" : "pending", detail: `${assessment.independentSources} independent sources · E ${assessment.E.toFixed(2)}` },
    {
      key: "verification",
      label: "Officer verification",
      state: incident.rejectedAt ? "rejected" : incident.verifiedAt ? "done" : assessment.corroborated ? "active" : "pending",
      detail: incident.rejectedAt ? `rejected by ${incident.rejectedBy?.name}` : incident.verifiedAt ? `verified by ${incident.verifiedBy?.name}` : "human action required",
    },
    { key: "network", label: "Network updated", state: networkApplied ? "done" : incident.verifiedAt ? "active" : "pending", detail: segment ? `${segment.segment.name} ${segment.effectiveState.replace("_", " ")}` : "" },
    { key: "missions", label: "Missions reassessed", state: decisions.length ? "done" : networkApplied ? "active" : "pending", detail: decisions.length ? `${new Set(decisions.map((decision) => decision.missionId)).size} missions · ${reassessed ? "reassessment" : "assessment"}` : "" },
    { key: "authority", label: "Authority", state: approvedAll ? "done" : activeDecisions.some((decision) => decision!.status === "RECOMMENDED") ? "active" : "pending", detail: approvedAll ? "recommendations approved" : "recommendation ≠ authorization" },
    { key: "driver", label: "Driver", state: instructions.length && instructions.every((instruction) => instruction.acknowledgedAt) ? "done" : instructions.length ? "active" : "pending", detail: instructions.length ? `${instructions.filter((instruction) => instruction.acknowledgedAt).length}/${instructions.length} acknowledged` : "" },
  ];

  const pendingDecisions = activeDecisions.filter((decision) => decision!.status === "RECOMMENDED");
  const approvedDecisions = activeDecisions.filter((decision) => decision!.status === "APPROVED");
  const notifications: NotificationItem[] = [
    { key: "portal", label: "Control-room portal updated", state: "done", detail: `${incident.reference} visible in the Command Center`, simulated: false },
    { key: "ai", label: "AI analysis recorded", state: interpretation ? "done" : "pending", detail: interpretation ? `${interpretation.id} · ${interpretation.provider.name}` : "awaiting interpretation", simulated: false },
    { key: "verify", label: "Officer verification", state: incident.verifiedAt || incident.rejectedAt ? "done" : "pending", detail: incident.verifiedAt ? "verified" : incident.rejectedAt ? "rejected" : "awaiting authorized officer", simulated: false },
    { key: "route", label: "Route / segment state updated", state: networkApplied ? "done" : "pending", detail: networkApplied ? `${seg.name} BLOCKED` : "applied after verification", simulated: false },
    { key: "missions", label: "Affected missions updated", state: decisions.length ? "done" : "pending", detail: decisions.length ? `${new Set(decisions.map((decision) => decision.missionId)).size} missions reassessed` : "after network change", simulated: false },
    { key: "authority", label: "Authority approval requested", state: activeDecisions.length ? "done" : "pending", detail: pendingDecisions.length ? `${pendingDecisions.length} awaiting authority` : approvedDecisions.length ? `${approvedDecisions.length} approved` : "no recommendation yet", simulated: false },
    { key: "driver", label: "Driver instruction prepared", state: instructions.length ? "done" : "pending", detail: instructions.length ? `${instructions.length} instruction(s), ${instructions.filter((instruction) => instruction.acknowledgedAt).length} acknowledged` : "issued on approval", simulated: false },
    { key: "logistics", label: "Logistics coordination node notified", state: approvedDecisions.length ? "done" : "pending", detail: "Simulated endpoint — no external system is connected in this prototype", simulated: true },
  ];

  const timeline: TimelineEntry[] = state.events
    .filter((event) => event.at >= incident.reportedAt - 1000)
    .map((event) => {
      const mapped = timelineLabel(event);
      return mapped ? { at: event.at, label: mapped.label, detail: event.summary, kind: mapped.kind } : null;
    })
    .filter((entry): entry is TimelineEntry => entry !== null);

  return {
    rows,
    independentSources: assessment.independentSources,
    freshness,
    severityTier: severityTier(severity.D),
    severityFactors,
    synthesis,
    rail,
    notifications,
    timeline,
    verificationState,
  };
}
