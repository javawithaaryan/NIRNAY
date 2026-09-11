import { clamp01, distanceKm, round2 } from "@/lib/scenario/engine/geo";
import type { EvidenceItem, EvidenceStatus, Incident } from "@/lib/scenario/types";

export type EvidenceAssessment = {
  L: number;
  T: number;
  C: number;
  S: number;
  K: number;
  E: number;
  independentSources: number;
  status: EvidenceStatus;
  corroborated: boolean;
};

export const evidenceWeights = { L: 0.2, T: 0.2, C: 0.25, S: 0.2, K: 0.15 } as const;
const corroborationThresholdE = 0.65;
const corroborationMinSources = 2;

function locationConsistency(incident: Incident, item: EvidenceItem): number {
  if (item.lat === undefined || item.lon === undefined) return 0.7;
  const km = distanceKm(incident.lat, incident.lon, item.lat, item.lon);
  if (km <= 1.5) return 1;
  if (km <= 5) return 0.6;
  return 0.2;
}

function freshness(item: EvidenceItem, now: number): number {
  const ageHours = Math.max(0, now - item.capturedAt) / 3_600_000;
  if (ageHours <= 1) return 1;
  if (ageHours <= 6) return 0.8;
  if (ageHours <= 24) return 0.5;
  return 0.2;
}

function corroboration(independentSources: number): number {
  if (independentSources <= 0) return 0.2;
  if (independentSources === 1) return 0.6;
  if (independentSources === 2) return 0.85;
  return 1;
}

function average(values: number[], fallback: number): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
}

export function assessEvidence(incident: Incident, items: EvidenceItem[], now: number): EvidenceAssessment {
  const L = average(items.map((item) => locationConsistency(incident, item)), 0.5);
  const T = average(items.map((item) => freshness(item, now)), 0.5);
  const S = average(items.map((item) => item.reliability), 0.5);
  const contextual = items.filter((item) => item.contextualConsistency !== undefined);
  const K = average(contextual.map((item) => item.contextualConsistency ?? 0), 0.3);
  const independentSources = new Set(items.filter((item) => item.kind !== "FIELD_REPORT").map((item) => item.kind)).size;
  const C = corroboration(independentSources);
  const E = clamp01(
    evidenceWeights.L * L + evidenceWeights.T * T + evidenceWeights.C * C + evidenceWeights.S * S + evidenceWeights.K * K,
  );
  const corroborated = E >= corroborationThresholdE && independentSources >= corroborationMinSources;
  const status: EvidenceStatus = incident.rejectedAt
    ? "REJECTED"
    : incident.verifiedAt
      ? "VERIFIED"
      : corroborated
      ? "CORROBORATED"
      : "PENDING_VERIFICATION";
  return {
    L: round2(L),
    T: round2(T),
    C: round2(C),
    S: round2(S),
    K: round2(K),
    E: round2(E),
    independentSources,
    status,
    corroborated,
  };
}
