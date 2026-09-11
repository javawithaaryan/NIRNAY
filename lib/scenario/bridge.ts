import { interpretIncident, interpretStaleIncidents } from "@/lib/ai/interpret";
import { fieldDb } from "@/lib/field/db";
import type { FieldReportRecord } from "@/lib/field/types";
import { portalActions } from "@/lib/scenario/actions";
import { allContextEvidenceKinds, primaryIncidentSeed } from "@/lib/scenario/commands";
import type { PortalState } from "@/lib/scenario/events";
import { presenterStepKey } from "@/lib/scenario/presenter";
import { getMeta, loadState, setMeta } from "@/lib/scenario/store";
import type { Actor } from "@/lib/scenario/types";

export const bridgeActor: Actor = { name: "Control room event bridge (demo)", role: "SYSTEM" };

const lockName = "nirnyay-field-bridge";
const aiStageDelayMs = 1500;
const corroborationStageDelayMs = 2000;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks?.request) return locks.request(lockName, task);
  return task();
}

function primaryIncidentId(state: PortalState): string | null {
  return state.incidentOrder.find((id) => state.incidents[id].reference === primaryIncidentSeed.reference) ?? null;
}

function ingestedReportIds(state: PortalState): Set<string> {
  return new Set(state.evidence.flatMap((item) => (item.photo?.kind === "field-db" ? [item.photo.reportId] : [])));
}

export function isEligibleForBridge(report: Pick<FieldReportRecord, "submittedAt">, state: Pick<PortalState, "startedAt">): boolean {
  return Boolean(state.startedAt) && Date.parse(report.submittedAt) >= (state.startedAt ?? Infinity);
}

export async function ingestPendingFieldReports(): Promise<number> {
  return withLock(async () => {
    const state = await loadState();
    if (!state.startedAt) return 0;
    let reports: FieldReportRecord[] = [];
    try {
      reports = await fieldDb.reports.orderBy("submittedAt").toArray();
    } catch {
      return 0;
    }
    const eligible = reports.filter((report) => isEligibleForBridge(report, state));
    const used = ingestedReportIds(state);
    const fresh = eligible.filter((report) => !used.has(report.id));

    let incidentId = primaryIncidentId(state);
    if (!incidentId) {
      if (fresh.length === 0) return 0;
      await portalActions.reportPrimaryIncident(bridgeActor, fresh[0]);
      incidentId = primaryIncidentId(await loadState());
      if (!incidentId) return 0;
    }

    const current = await loadState();
    const incident = current.incidents[incidentId];
    const primaryEvidence = current.evidence.find((item) => item.incidentId === incidentId && item.kind === "FIELD_REPORT");
    const bridgeOwned =
      primaryEvidence?.photo?.kind === "field-db" && eligible.some((report) => primaryEvidence.photo?.kind === "field-db" && report.id === primaryEvidence.photo.reportId);
    const open = !incident.verifiedAt && !incident.rejectedAt;

    if (!bridgeOwned || !open) {
      if (fresh.length > 0) {
        await portalActions.attachNearbyFieldReports(bridgeActor, incidentId);
        await interpretStaleIncidents();
      }
      return fresh.length;
    }

    if (!current.interpretations[incidentId]) {
      await pause(aiStageDelayMs);
      await interpretIncident(incidentId);
    }

    const present = new Set(current.evidence.filter((item) => item.incidentId === incidentId).map((item) => item.kind));
    const contextMissing = allContextEvidenceKinds.some((kind) => !present.has(kind));
    if (contextMissing || fresh.length > 0) {
      await pause(corroborationStageDelayMs);
      await portalActions.attachNearbyFieldReports(bridgeActor, incidentId);
      await portalActions.addAllContextEvidence(bridgeActor, incidentId);
      await interpretStaleIncidents();
    }

    const step = Number((await getMeta(presenterStepKey)) ?? "0");
    if (step >= 1 && step < 3) await setMeta(presenterStepKey, "3");
    return fresh.length;
  });
}
