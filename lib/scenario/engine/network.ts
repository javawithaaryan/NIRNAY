import { scenarioMeta, segments } from "@/lib/scenario/seed/nh29";
import type { RoadSegment, RoadState, SegmentRuntime } from "@/lib/scenario/types";

export type NetworkState = Record<string, SegmentRuntime>;

export type EffectiveSegment = {
  segment: RoadSegment;
  runtime: SegmentRuntime;
  recordedState: RoadState;
  effectiveState: RoadState;
  stale: boolean;
  verifiedAgeHours: number;
  usable: boolean;
};

export function initialNetwork(startedAt: number): NetworkState {
  const network: NetworkState = {};
  for (const segment of segments) {
    network[segment.id] = {
      state: segment.initialState,
      lastVerifiedAt: startedAt - segment.initialVerifiedHoursAgo * 3_600_000,
      incidentIds: [],
      reason: segment.riskNote ?? null,
    };
  }
  return network;
}

export function isStale(runtime: SegmentRuntime, now: number): boolean {
  return now - runtime.lastVerifiedAt > scenarioMeta.stalenessHours * 3_600_000;
}

export function effectiveSegment(segment: RoadSegment, runtime: SegmentRuntime, now: number): EffectiveSegment {
  const stale = isStale(runtime, now);
  const recordedState = runtime.state;
  let effectiveState: RoadState = recordedState;
  if (recordedState === "OPEN" && stale) effectiveState = "STALE";
  const usable = effectiveState === "OPEN" || effectiveState === "RESTRICTED";
  return {
    segment,
    runtime,
    recordedState,
    effectiveState,
    stale,
    verifiedAgeHours: Math.max(0, now - runtime.lastVerifiedAt) / 3_600_000,
    usable,
  };
}

export function effectiveNetwork(network: NetworkState, now: number): Record<string, EffectiveSegment> {
  const result: Record<string, EffectiveSegment> = {};
  for (const segment of segments) {
    const runtime = network[segment.id];
    if (runtime) result[segment.id] = effectiveSegment(segment, runtime, now);
  }
  return result;
}

export function describeState(state: RoadState, stale: boolean): string {
  if (state === "OPEN") return "OPEN";
  if (state === "STALE") return "STALE (last verification too old)";
  const label = state.replace("_", " ");
  return stale && state !== "BLOCKED" ? `${label} · evidence stale` : label;
}
