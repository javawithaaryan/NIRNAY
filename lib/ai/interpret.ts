import { analyzePhoto } from "@/lib/ai/photoStats";
import { aiProvider, deterministicProvider, fingerprintInputs } from "@/lib/ai/provider";
import type { AiInterpretation, InterpretationInputs } from "@/lib/ai/types";
import { fieldDb } from "@/lib/field/db";
import { recordInterpretation } from "@/lib/scenario/commands";
import type { PortalState } from "@/lib/scenario/events";
import { getSegment } from "@/lib/scenario/seed/nh29";
import { appendEvents, loadState } from "@/lib/scenario/store";

export async function buildInterpretationInputs(
  state: PortalState,
  incidentId: string,
): Promise<{ inputs: InterpretationInputs; photoBlob: Blob | null } | null> {
  const incident = state.incidents[incidentId];
  if (!incident) return null;
  const evidence = state.evidence.filter((item) => item.incidentId === incidentId);
  const fieldEvidence = evidence.find((item) => item.kind === "FIELD_REPORT");
  const segment = getSegment(incident.segmentId);

  let photo: InterpretationInputs["photo"] = { present: false };
  let photoBlob: Blob | null = null;
  if (fieldEvidence?.photo?.kind === "field-db") {
    try {
      const report = await fieldDb.reports.get(fieldEvidence.photo.reportId);
      if (report) {
        photoBlob = report.photo.blob;
        photo = {
          present: true,
          source: "field-db",
          reportId: report.id,
          width: report.photo.width,
          height: report.photo.height,
          byteSize: report.photo.byteSize,
          stats: await analyzePhoto(report.photo.blob),
        };
      }
    } catch (error) {
      console.warn("Field photo could not be read for interpretation", error);
    }
  }

  const inputs: InterpretationInputs = {
    incidentId,
    reference: incident.reference,
    segmentName: segment.name,
    corridor: segment.corridor,
    category: incident.category,
    note: incident.note,
    photo,
    context: evidence
      .filter((item) => item.kind !== "FIELD_REPORT")
      .map((item) => ({ kind: item.kind, origin: item.origin, source: item.source, summary: item.summary })),
  };
  return { inputs, photoBlob };
}

export async function interpretIncident(incidentId: string, force = false): Promise<AiInterpretation | null> {
  const state = await loadState();
  const prepared = await buildInterpretationInputs(state, incidentId);
  if (!prepared) return null;
  const fingerprint = fingerprintInputs(prepared.inputs);
  const existing = state.interpretations[incidentId];
  if (!force && existing && existing.inputFingerprint === fingerprint) return existing;

  const now = Date.now();
  let interpretation: Omit<AiInterpretation, "id">;
  try {
    interpretation = await aiProvider.interpret(prepared.inputs, prepared.photoBlob, now);
  } catch (error) {
    const fallback = await deterministicProvider.interpret(prepared.inputs, null, now);
    interpretation = {
      ...fallback,
      limitations: [
        `Configured AI adapter failed (${error instanceof Error ? error.message : String(error)}); deterministic fallback used instead.`,
        ...fallback.limitations,
      ],
    };
  }
  const record = { ...interpretation, inputFingerprint: fingerprint };
  if (force && existing && existing.inputFingerprint === fingerprint) {
    record.inputFingerprint = `${fingerprint}#rerun-${now}`;
  }
  const events = recordInterpretation(await loadState(), now, record);
  await appendEvents(events);
  return (await loadState()).interpretations[incidentId] ?? null;
}

export async function interpretStaleIncidents(): Promise<void> {
  const state = await loadState();
  for (const incidentId of state.incidentOrder) {
    await interpretIncident(incidentId);
  }
}
