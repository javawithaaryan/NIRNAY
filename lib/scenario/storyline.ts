import { assessEvidence } from "@/lib/scenario/engine/evidence";
import type { PortalEvent, PortalState } from "@/lib/scenario/events";
import { getSegment } from "@/lib/scenario/seed/nh29";
import type { EvidenceItem, EvidenceKind, RouteEvaluation, Vehicle } from "@/lib/scenario/types";

export type TimelineStep = { key: string; label: string; detail: string | null; at: number | null };

const evidenceStepLabels: Partial<Record<EvidenceKind, string>> = {
  NEARBY_REPORT: "Nearby report matched",
  SECOND_REPORT: "Second report matched",
  WEATHER: "Weather context matched",
  INSTITUTIONAL: "Institutional context assessed",
  LOGISTICS: "Operational signal assessed",
  HISTORICAL: "Historical context loaded",
  NETWORK_RECORD: "Network record loaded",
};

function corroboratedAt(state: PortalState, incidentId: string): number | null {
  const incident = state.incidents[incidentId];
  if (!incident) return null;
  const items: EvidenceItem[] = [];
  for (const event of state.events) {
    const payload = event.payload;
    const item = payload.type === "incident.reported" ? payload.evidence : payload.type === "evidence.added" ? payload.evidence : null;
    if (!item || item.incidentId !== incidentId) continue;
    items.push(item);
    if (assessEvidence({ ...incident, verifiedAt: null, rejectedAt: null }, items, event.at).corroborated) return event.at;
  }
  return null;
}

export function evidenceTimeline(state: PortalState, incidentId: string): TimelineStep[] {
  const incident = state.incidents[incidentId];
  if (!incident) return [];
  const steps: TimelineStep[] = [];
  const aiEvents = state.events.filter((event) => event.payload.type === "ai.interpreted" && event.payload.interpretation.incidentId === incidentId);
  const reported = state.events.find((event) => event.payload.type === "incident.reported" && event.payload.incident.id === incidentId);
  steps.push({ key: "report", label: "Field report received", detail: "photo · GPS · timestamp", at: reported?.at ?? incident.reportedAt });
  steps.push({ key: "ai", label: "AI interpretation complete", detail: aiEvents[0] ? "assistive interpretation recorded" : null, at: aiEvents[0]?.at ?? null });
  for (const event of state.events) {
    if (event.payload.type !== "evidence.added" || event.payload.evidence.incidentId !== incidentId) continue;
    const label = evidenceStepLabels[event.payload.evidence.kind];
    if (label) steps.push({ key: `ev-${event.id}`, label, detail: event.payload.evidence.origin === "FIELD" ? "field data" : "simulated / demo data", at: event.at });
  }
  const corroborated = corroboratedAt(state, incidentId);
  const synthesis = aiEvents.length > 1 ? aiEvents[aiEvents.length - 1] : null;
  steps.push({ key: "synthesis", label: "Evidence synthesis complete", detail: synthesis ? "AI re-assessed with all evidence" : null, at: synthesis?.at ?? null });
  steps.push({ key: "corroborated", label: "Corroborated", detail: null, at: corroborated });
  steps.push({ key: "package", label: "Verification package ready", detail: null, at: corroborated && synthesis ? Math.max(corroborated, synthesis.at) : null });
  steps.push({ key: "verified", label: "Verified by authorized officer", detail: incident.verifiedBy?.name ?? null, at: incident.verifiedAt });
  return steps;
}

export function responseTimeline(state: PortalState): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const events = state.events;
  const firstAi = new Set<string>();
  const corroborationMarked = new Set<string>();
  let index = 0;
  while (index < events.length) {
    const event: PortalEvent = events[index];
    const payload = event.payload;
    if (payload.type === "incident.reported") {
      const isSecond = state.incidentOrder.indexOf(payload.incident.id) > 0;
      steps.push({
        key: event.id,
        label: isSecond ? "New field report · new disruption" : "Field report received",
        detail: `${payload.incident.reference} · ${getSegment(payload.incident.segmentId).name}`,
        at: event.at,
      });
    } else if (payload.type === "ai.interpreted" && !firstAi.has(payload.interpretation.incidentId)) {
      firstAi.add(payload.interpretation.incidentId);
      steps.push({ key: event.id, label: "AI interpretation complete", detail: `${payload.interpretation.hazard.label.toLowerCase()} · classification confidence ${Math.round(payload.interpretation.confidence * 100)}%`, at: event.at });
    } else if (payload.type === "evidence.added") {
      const label = evidenceStepLabels[payload.evidence.kind];
      if (label) steps.push({ key: event.id, label, detail: payload.evidence.origin === "FIELD" ? "field data" : "simulated / demo data", at: event.at });
      const at = corroborationMarked.has(payload.evidence.incidentId) ? null : corroboratedAt(state, payload.evidence.incidentId);
      if (at !== null && at <= event.at) {
        corroborationMarked.add(payload.evidence.incidentId);
        steps.push({ key: `${event.id}-c`, label: "Multi-source corroboration complete · verification package ready", detail: state.incidents[payload.evidence.incidentId]?.reference ?? null, at });
      }
    } else if (payload.type === "incident.verified") {
      steps.push({ key: event.id, label: "Officer verified", detail: `${state.incidents[payload.incidentId]?.reference ?? ""} · by ${event.actor.name}`, at: event.at });
    } else if (payload.type === "segment.state_changed") {
      const segment = getSegment(payload.segmentId);
      steps.push({ key: event.id, label: `${segment.corridor} → ${payload.to}`, detail: `${segment.name}: ${payload.from} → ${payload.to}`, at: event.at });
    } else if (payload.type === "reassessment.triggered" && state.decisionOrder.some((id) => state.decisions[id].status === "SUPERSEDED")) {
      steps.push({ key: event.id, label: "Reassessment triggered", detail: payload.missionIds.join(", "), at: event.at });
    } else if (payload.type === "decision.superseded") {
      const decision = state.decisions[payload.decisionId];
      steps.push({ key: event.id, label: "Previous decision superseded", detail: `${decision?.missionId ?? ""} · ${decision?.id ?? ""}`, at: event.at });
    } else if (payload.type === "decision.recommended") {
      const group: DecisionGroupItem[] = [];
      while (index < events.length && events[index].payload.type === "decision.recommended") {
        const item = events[index].payload as Extract<PortalEvent["payload"], { type: "decision.recommended" }>;
        group.push({ missionId: item.decision.missionId, reassessment: Boolean(item.decision.reassessmentOf) });
        index += 1;
      }
      if (group.some((item) => !item.reassessment)) {
        steps.push({ key: `${event.id}-m`, label: `${group.length} mission${group.length === 1 ? "" : "s"} affected`, detail: group.map((item) => item.missionId).join(" · "), at: event.at });
        steps.push({ key: `${event.id}-r`, label: "Route feasibility complete", detail: "routes + vehicle constraints · hard constraints before ranking", at: event.at });
      }
      steps.push({ key: `${event.id}-d`, label: `${group.length} mission response${group.length === 1 ? "" : "s"} prepared`, detail: group.map((item) => item.missionId).join(" · "), at: event.at });
      continue;
    } else if (payload.type === "decision.acted") {
      const decision = state.decisions[payload.decisionId];
      steps.push({ key: event.id, label: `Authority ${payload.status === "APPROVED" ? "approved" : payload.status.replace("_", " ").toLowerCase()}`, detail: `${decision?.missionId ?? ""} · ${decision?.recommendation.action ?? ""}`, at: event.at });
    } else if (payload.type === "instruction.acknowledged") {
      steps.push({ key: event.id, label: "Driver acknowledged", detail: state.instructions[payload.instructionId]?.missionId ?? null, at: event.at });
    }
    index += 1;
  }
  return steps;
}

type DecisionGroupItem = { missionId: string; reassessment: boolean };

export type RouteCheck = { ok: boolean | null; label: string };

export type RouteVerdict = {
  routeId: string;
  glyph: "✅" | "❌" | "⚠️";
  headline: string;
  reason: string;
  checks: { closure: RouteCheck; vehicle: RouteCheck; evidence: RouteCheck; deadline: RouteCheck };
};

export function routeVerdict(evaluation: RouteEvaluation, vehicle: Vehicle): RouteVerdict {
  const closure = evaluation.reasons.find((reason) => reason.ok === false && reason.text.includes(" is BLOCKED"));
  const vehicleReason = evaluation.reasons.find((reason) => reason.text.startsWith("Vehicle restriction"));
  const uncertain = evaluation.reasons.find((reason) => reason.ok === null && !reason.text.startsWith("Route cannot"));
  const stale = uncertain?.text.match(/last verified ([^—;]+?) ago/)?.[1];
  const deadlineMissed = evaluation.deadlineAchievable === false;

  let glyph: RouteVerdict["glyph"];
  let headline: string;
  let reason: string;
  if (closure) {
    glyph = "❌";
    headline = vehicleReason ? "BLOCKED · also vehicle-restricted" : "BLOCKED";
    reason = closure.text.split(" — ")[0] + (closure.text.includes("Verified incident") ? " · verified incident" : "");
  } else if (vehicleReason) {
    glyph = "❌";
    headline = "INFEASIBLE · VEHICLE RESTRICTED";
    reason = vehicleReason.text.replace("Vehicle restriction: ", "");
  } else if (deadlineMissed) {
    glyph = "❌";
    headline = "INFEASIBLE · DEADLINE";
    reason = evaluation.reasons.find((item) => item.text.includes("misses the mission deadline"))?.text ?? "Deadline cannot be met";
  } else if (evaluation.feasibility === "UNDETERMINED") {
    glyph = "⚠️";
    headline = "UNDETERMINED";
    reason = stale ? `Evidence stale · last verified ${stale} ago` : uncertain?.text ?? "Segment condition unverified";
  } else {
    glyph = "✅";
    headline = `FEASIBLE FOR ${vehicle.vehicleClass}`;
    reason = "Vehicle compatible · evidence current · deadline achievable";
  }

  return {
    routeId: evaluation.routeId,
    glyph,
    headline,
    reason,
    checks: {
      closure: { ok: !closure, label: closure ? "Confirmed closure" : "No confirmed closure" },
      vehicle: { ok: !vehicleReason, label: vehicleReason ? "Vehicle restricted" : "Vehicle compatible" },
      evidence: { ok: evaluation.undeterminedSegmentIds.length === 0 ? true : null, label: evaluation.undeterminedSegmentIds.length === 0 ? "Evidence current" : stale ? `Stale (${stale})` : "Unverified" },
      deadline: { ok: evaluation.deadlineAchievable, label: evaluation.deadlineAchievable ? "Deadline achievable" : evaluation.deadlineAchievable === false ? "Deadline missed" : "Unknown" },
    },
  };
}
