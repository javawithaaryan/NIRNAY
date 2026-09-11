import { describe, expect, it } from "vitest";
import { synthesizeResponse } from "@/lib/ai/responseSynthesis";
import {
  addContextEvidence,
  attachNearbyReports,
  changeSegmentState,
  primaryIncidentSeed,
  rejectIncident,
  reportIncident,
  startScenario,
  verifyIncident,
} from "@/lib/scenario/commands";
import { reduceEvents } from "@/lib/scenario/events";
import { buildIncidentIntelligence } from "@/lib/scenario/intelligence";
import { buildReportHtml } from "@/lib/scenario/report";
import type { Actor } from "@/lib/scenario/types";
import { buildView } from "@/lib/scenario/view";

const operator: Actor = { name: "Test operator", role: "OPERATOR" };
const t0 = Date.parse("2026-09-11T09:00:00+05:30");
const primaryReport = { reportId: "r-1", reference: "FR-1", submittedAt: t0 + 60_000, latitude: 25.6751, longitude: 94.1086, accuracyM: 18, category: "landslide" as const, note: "Boulders across both lanes" };

function seeded() {
  const events = [...startScenario(operator, t0)];
  events.push(...reportIncident(reduceEvents(events), operator, t0 + 60_000, primaryIncidentSeed, primaryReport));
  return events;
}

describe("multi-source corroboration", () => {
  it("attaches nearby field reports within 5 km and 6 h, ignoring far or old ones", () => {
    const events = seeded();
    const state = reduceEvents(events);
    const incidentId = state.incidentOrder[0];
    const attached = attachNearbyReports(state, operator, t0 + 120_000, incidentId, [
      { ...primaryReport, reportId: "r-1" },
      { reportId: "r-2", reference: "FR-2", submittedAt: t0 + 5 * 60_000, latitude: 25.681, longitude: 94.112, accuracyM: 25, category: null, note: "Traffic halted" },
      { reportId: "r-3", reference: "FR-3", submittedAt: t0 + 5 * 60_000, latitude: 25.9, longitude: 93.7, accuracyM: 25, category: null, note: "far away" },
      { reportId: "r-4", reference: "FR-4", submittedAt: t0 - 10 * 3_600_000, latitude: 25.676, longitude: 94.109, accuracyM: 25, category: null, note: "too old" },
    ]);
    expect(attached).toHaveLength(1);
    const nearby = attached[0].payload.type === "evidence.added" ? attached[0].payload.evidence : null;
    expect(nearby?.kind).toBe("NEARBY_REPORT");
    expect(nearby?.distanceKm).toBeLessThan(1);
    const view = buildView(reduceEvents([...events, ...attached]), t0 + 130_000);
    const intel = buildIncidentIntelligence(view, view.incidents[0], reduceEvents([...events, ...attached]));
    expect(intel.rows.map((row) => row.status)).toEqual(["RECEIVED", "CORROBORATES"]);
  });

  it("marks freshness CURRENT and severity CRITICAL for the seeded landslide", () => {
    const events = seeded();
    const incidentId = reduceEvents(events).incidentOrder[0];
    events.push(...addContextEvidence(reduceEvents(events), operator, t0 + 120_000, incidentId, ["SECOND_REPORT", "WEATHER", "INSTITUTIONAL", "HISTORICAL", "LOGISTICS", "NETWORK_RECORD"]));
    const state = reduceEvents(events);
    const view = buildView(state, t0 + 130_000);
    const intel = buildIncidentIntelligence(view, view.incidents[0], state);
    expect(intel.freshness).toBe("CURRENT");
    expect(intel.severityTier).toBe("CRITICAL");
    expect(intel.rows).toHaveLength(7);
    expect(intel.verificationState).toBe("READY");
    expect(intel.rail.find((stage) => stage.key === "verification")?.state).toBe("active");
  });
});

describe("officer decisions", () => {
  it("rejecting an incident blocks later verification and is visible in the rail", () => {
    const events = seeded();
    const incidentId = reduceEvents(events).incidentOrder[0];
    events.push(...rejectIncident(reduceEvents(events), operator, t0 + 120_000, incidentId, "duplicate"));
    const state = reduceEvents(events);
    expect(verifyIncident(state, operator, t0 + 130_000, incidentId)).toEqual([]);
    const view = buildView(state, t0 + 130_000);
    expect(view.incidents[0].assessment.status).toBe("REJECTED");
    expect(buildIncidentIntelligence(view, view.incidents[0], state).rail.find((stage) => stage.key === "verification")?.state).toBe("rejected");
  });
});

describe("response synthesis and report", () => {
  it("explains the engine's decision without changing it and renders a report", () => {
    const events = seeded();
    const incidentId = reduceEvents(events).incidentOrder[0];
    events.push(...verifyIncident(reduceEvents(events), operator, t0 + 120_000, incidentId));
    events.push(...changeSegmentState(reduceEvents(events), operator, t0 + 180_000, "S3", "BLOCKED", "verified", incidentId));
    const state = reduceEvents(events);
    const view = buildView(state, t0 + 200_000);
    const m101 = synthesizeResponse(view.missions.find((mission) => mission.mission.id === "M-101")!);
    const m103 = synthesizeResponse(view.missions.find((mission) => mission.mission.id === "M-103")!);
    expect(m101.recommendation).toContain("HOLD");
    expect(m101.narrative).toContain("hard restriction");
    expect(m103.recommendation).toContain("REROUTE via Route C");
    expect(m103.recommendation).not.toContain("AI chose");
    const html = buildReportHtml(view, state, incidentId, "tester", t0 + 200_000);
    expect(html).toContain("DEMO / SIMULATION");
    expect(html).toContain("VERIFIED BY AUTHORIZED OFFICER");
    expect(html).toContain("M-103");
    expect(html).toContain("REROUTE via Route C");
    expect(html).toContain("Audit events");
  });
});
