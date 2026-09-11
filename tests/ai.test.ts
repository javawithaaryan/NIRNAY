import { describe, expect, it } from "vitest";
import { interpretDeterministically, maxFallbackConfidence } from "@/lib/ai/deterministic";
import { statsFromPixels } from "@/lib/ai/photoStats";
import { fingerprintInputs } from "@/lib/ai/provider";
import type { InterpretationInputs } from "@/lib/ai/types";
import { changeSegmentState, primaryIncidentSeed, recordInterpretation, reportIncident, startScenario } from "@/lib/scenario/commands";
import { reduceEvents } from "@/lib/scenario/events";
import type { Actor } from "@/lib/scenario/types";

const operator: Actor = { name: "Test operator", role: "OPERATOR" };
const t0 = Date.parse("2026-09-11T09:00:00+05:30");

function baseInputs(overrides: Partial<InterpretationInputs> = {}): InterpretationInputs {
  return {
    incidentId: "INC-001",
    reference: "I-001",
    segmentName: "Pherima – Pagala Pahar",
    corridor: "NH-29",
    category: "landslide",
    note: "Boulders and mud across both lanes near Pherima, trucks halted.",
    photo: { present: false },
    context: [],
    ...overrides,
  };
}

describe("deterministic AI interpretation", () => {
  it("indicates a landslide with full lane obstruction from note and category", () => {
    const result = interpretDeterministically(baseInputs(), t0);
    expect(result.hazard.category).toBe("landslide");
    expect(result.laneObstruction.assessment).toBe("FULL");
    expect(result.imageQuality.relevance).toBe("NOT_ASSESSED");
    expect(result.consistency.assessment).toBe("NO_CONTEXT");
    expect(result.provider.kind).toBe("deterministic-fallback");
  });

  it("raises confidence with consistent context and a usable photo, but never above the fallback cap", () => {
    const bare = interpretDeterministically(baseInputs(), t0);
    const rich = interpretDeterministically(
      baseInputs({
        photo: {
          present: true,
          source: "field-db",
          reportId: "r1",
          width: 1280,
          height: 960,
          byteSize: 200_000,
          stats: { meanLuminance: 0.45, contrast: 0.2, earthToneShare: 0.42, greyShare: 0.2, greenShare: 0.1, sampledPixels: 9216 },
        },
        context: [
          { kind: "SECOND_REPORT", origin: "SIMULATED", source: "control room", summary: "Caller reports the carriageway obstructed and traffic halted." },
          { kind: "WEATHER", origin: "SIMULATED", source: "IMD", summary: "Very heavy rainfall; landslide advisory in force." },
          { kind: "INSTITUTIONAL", origin: "SIMULATED", source: "SACHET", summary: "Landslide alert issued for the district." },
        ],
      }),
      t0,
    );
    expect(rich.confidence).toBeGreaterThan(bare.confidence);
    expect(rich.confidence).toBeLessThanOrEqual(maxFallbackConfidence);
    expect(rich.consistency.assessment).toBe("CONSISTENT");
    expect(rich.imageQuality.relevance).toBe("HIGH");
    expect(rich.cues.some((cue) => cue.source === "photo")).toBe(true);
  });

  it("abstains when there are no cues", () => {
    const result = interpretDeterministically(baseInputs({ category: null, note: null }), t0);
    expect(result.hazard.category).toBeNull();
    expect(result.confidence).toBeLessThanOrEqual(0.2);
  });

  it("computes photo statistics from pixels", () => {
    const pixels = 4;
    const data = [120, 80, 40, 255, 120, 80, 40, 255, 128, 128, 128, 255, 20, 200, 30, 255];
    const stats = statsFromPixels(data, pixels);
    expect(stats.earthToneShare).toBe(0.5);
    expect(stats.greyShare).toBe(0.25);
    expect(stats.greenShare).toBe(0.25);
  });

  it("fingerprints change when evidence changes", () => {
    const a = fingerprintInputs(baseInputs());
    const b = fingerprintInputs(baseInputs({ context: [{ kind: "WEATHER", origin: "SIMULATED", source: "IMD", summary: "rain" }] }));
    expect(a).not.toBe(b);
  });
});

describe("AI interpretation is assistive only", () => {
  it("recording an interpretation changes no network state, decision or verification", () => {
    const events = [...startScenario(operator, t0)];
    events.push(...reportIncident(reduceEvents(events), operator, t0 + 60_000, primaryIncidentSeed, null));
    const before = reduceEvents(events);
    const incidentId = before.incidentOrder[0];
    const interpretation = { ...interpretDeterministically(baseInputs({ incidentId }), t0 + 90_000), inputFingerprint: "fp-1" };
    events.push(...recordInterpretation(before, t0 + 90_000, interpretation));
    const after = reduceEvents(events);
    expect(after.interpretations[incidentId]?.id).toBe("AI-001");
    expect(after.network).toEqual(before.network);
    expect(after.decisionOrder).toEqual([]);
    expect(after.incidents[incidentId].verifiedAt).toBeNull();
    expect(after.events.at(-1)?.summary).toContain("assistive only");
  });

  it("does not re-record an identical interpretation", () => {
    const events = [...startScenario(operator, t0)];
    events.push(...reportIncident(reduceEvents(events), operator, t0 + 60_000, primaryIncidentSeed, null));
    const incidentId = reduceEvents(events).incidentOrder[0];
    const interpretation = { ...interpretDeterministically(baseInputs({ incidentId }), t0), inputFingerprint: "fp-1" };
    events.push(...recordInterpretation(reduceEvents(events), t0 + 90_000, interpretation));
    expect(recordInterpretation(reduceEvents(events), t0 + 120_000, interpretation)).toEqual([]);
  });

  it("decision outcomes are identical with and without an interpretation", () => {
    const build = (withAi: boolean) => {
      const events = [...startScenario(operator, t0)];
      events.push(...reportIncident(reduceEvents(events), operator, t0 + 60_000, primaryIncidentSeed, null));
      const incidentId = reduceEvents(events).incidentOrder[0];
      if (withAi) {
        const interpretation = { ...interpretDeterministically(baseInputs({ incidentId }), t0), inputFingerprint: "fp" };
        events.push(...recordInterpretation(reduceEvents(events), t0 + 90_000, interpretation));
      }
      events.push(...changeSegmentState(reduceEvents(events), operator, t0 + 120_000, "S3", "BLOCKED", "test", incidentId));
      const state = reduceEvents(events);
      return state.decisionOrder.map((id) => [state.decisions[id].missionId, state.decisions[id].recommendation.action, state.decisions[id].recommendation.routeId]);
    };
    expect(build(true)).toEqual(build(false));
  });
});
