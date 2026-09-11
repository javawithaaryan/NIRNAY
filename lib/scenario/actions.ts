import { fieldDb } from "@/lib/field/db";
import type { FieldReportRecord } from "@/lib/field/types";
import {
  acknowledgeInstruction,
  actOnDecision,
  addContextEvidence,
  allContextEvidenceKinds,
  assessMissions,
  attachNearbyReports,
  rejectIncident,
  changeMissionVehicle,
  changeSegmentState,
  primaryIncidentSeed,
  reportIncident,
  requestMoreEvidence,
  secondDisruption,
  startScenario,
  verifyIncident,
  type ContextEvidenceKind,
  type FieldReportSource,
} from "@/lib/scenario/commands";
import type { PortalEvent, PortalState } from "@/lib/scenario/events";
import { appendEvents, loadState, resetPortal } from "@/lib/scenario/store";
import type { Actor, DecisionStatus, RoadState } from "@/lib/scenario/types";

async function run(command: (state: PortalState, now: number) => PortalEvent[]): Promise<void> {
  const state = await loadState();
  await appendEvents(command(state, Date.now()));
}

export function toFieldReportSource(report: FieldReportRecord): FieldReportSource {
  return {
    reportId: report.id,
    reference: report.reference,
    submittedAt: Date.parse(report.submittedAt),
    latitude: report.location.latitude,
    longitude: report.location.longitude,
    accuracyM: report.location.accuracyM,
    category: report.category,
    note: report.note,
  };
}

export const portalActions = {
  async reset(actor: Actor): Promise<void> {
    await resetPortal();
    await appendEvents(startScenario(actor, Date.now()));
  },
  async ensureStarted(actor: Actor): Promise<void> {
    const state = await loadState();
    if (!state.startedAt) await appendEvents(startScenario(actor, Date.now()));
  },
  async reportPrimaryIncident(actor: Actor, fieldReport: FieldReportRecord | null): Promise<void> {
    await run((state, now) => {
      if (state.incidentOrder.some((id) => state.incidents[id].reference === primaryIncidentSeed.reference)) return [];
      return reportIncident(state, actor, now, primaryIncidentSeed, fieldReport ? toFieldReportSource(fieldReport) : null);
    });
  },
  async reportIncidentFromField(actor: Actor, report: FieldReportRecord): Promise<void> {
    await run((state, now) => {
      const alreadyUsed = state.evidence.some((item) => item.photo?.kind === "field-db" && item.photo.reportId === report.id);
      if (alreadyUsed) return [];
      const isPrimary = !state.incidentOrder.some((id) => state.incidents[id].reference === primaryIncidentSeed.reference);
      const seed = isPrimary
        ? primaryIncidentSeed
        : { ...primaryIncidentSeed, reference: `I-${String(state.incidentOrder.length + 1).padStart(3, "0")}` };
      return reportIncident(state, actor, now, seed, toFieldReportSource(report));
    });
  },
  async addContextEvidence(actor: Actor, incidentId: string, kinds: ContextEvidenceKind[]): Promise<void> {
    await run((state, now) => addContextEvidence(state, actor, now, incidentId, kinds));
  },
  async verifyIncident(actor: Actor, incidentId: string): Promise<void> {
    await run((state, now) => verifyIncident(state, actor, now, incidentId));
  },
  async rejectIncident(actor: Actor, incidentId: string, note: string | null): Promise<void> {
    await run((state, now) => rejectIncident(state, actor, now, incidentId, note));
  },
  async attachNearbyFieldReports(actor: Actor, incidentId: string): Promise<number> {
    let attached = 0;
    let reports: FieldReportRecord[] = [];
    try {
      reports = await fieldDb.reports.toArray();
    } catch {
      reports = [];
    }
    await run((state, now) => {
      const events = attachNearbyReports(state, actor, now, incidentId, reports.map(toFieldReportSource));
      attached = events.length;
      return events;
    });
    return attached;
  },
  async addAllContextEvidence(actor: Actor, incidentId: string): Promise<void> {
    await run((state, now) => addContextEvidence(state, actor, now, incidentId, allContextEvidenceKinds));
  },
  async requestMoreEvidence(actor: Actor, incidentId: string): Promise<void> {
    await run((state, now) => requestMoreEvidence(state, actor, now, incidentId));
  },
  async changeSegmentState(actor: Actor, segmentId: string, to: RoadState, reason: string, incidentId: string | null): Promise<void> {
    await run((state, now) => changeSegmentState(state, actor, now, segmentId, to, reason, incidentId));
  },
  async changeMissionVehicle(actor: Actor, missionId: string, vehicleId: string): Promise<void> {
    await run((state, now) => changeMissionVehicle(state, actor, now, missionId, vehicleId));
  },
  async actOnDecision(
    actor: Actor,
    decisionId: string,
    status: Exclude<DecisionStatus, "RECOMMENDED" | "SUPERSEDED">,
    note: string | null,
  ): Promise<void> {
    await run((state, now) => actOnDecision(state, actor, now, decisionId, status, note));
  },
  async acknowledgeInstruction(instructionId: string): Promise<void> {
    await run((state, now) => acknowledgeInstruction(state, now, instructionId));
  },
  async reassess(actor: Actor): Promise<void> {
    await run((state, now) => assessMissions(state, now, `Manual re-evaluation requested by ${actor.name}`, null));
  },
  async secondDisruption(actor: Actor): Promise<void> {
    await run((state, now) => {
      if (state.incidentOrder.some((id) => state.incidents[id].reference === "I-002")) return [];
      return secondDisruption(state, actor, now);
    });
  },
};

export async function latestQueuedFieldReport(): Promise<FieldReportRecord | null> {
  try {
    const reports = await fieldDb.reports.orderBy("submittedAt").reverse().toArray();
    return reports[0] ?? null;
  } catch {
    return null;
  }
}
