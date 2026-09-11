import { describe, expect, it } from "vitest";
import {
  acknowledgeInstruction,
  actOnDecision,
  addContextEvidence,
  changeMissionVehicle,
  changeSegmentState,
  primaryIncidentSeed,
  reportIncident,
  secondDisruption,
  startScenario,
  verifyIncident,
} from "@/lib/scenario/commands";
import { evaluateRoute } from "@/lib/scenario/engine/feasibility";
import { effectiveNetwork } from "@/lib/scenario/engine/network";
import { reduceEvents, type PortalEvent, type PortalState } from "@/lib/scenario/events";
import { getMission, getVehicle } from "@/lib/scenario/seed/nh29";
import type { Actor } from "@/lib/scenario/types";
import { buildView } from "@/lib/scenario/view";

const operator: Actor = { name: "Test operator", role: "OPERATOR" };
const authority: Actor = { name: "Test authority", role: "AUTHORITY" };
const t0 = Date.parse("2026-09-11T09:00:00+05:30");

function fold(events: PortalEvent[]): PortalState {
  return reduceEvents(events);
}

function scenarioUpToBlocked(): { events: PortalEvent[]; state: PortalState; incidentId: string } {
  const events = [...startScenario(operator, t0)];
  events.push(...reportIncident(fold(events), operator, t0 + 60_000, primaryIncidentSeed, null));
  const incidentId = fold(events).incidentOrder[0];
  events.push(...addContextEvidence(fold(events), operator, t0 + 120_000, incidentId, ["SECOND_REPORT", "WEATHER", "INSTITUTIONAL", "HISTORICAL"]));
  events.push(...verifyIncident(fold(events), authority, t0 + 180_000, incidentId));
  events.push(...changeSegmentState(fold(events), operator, t0 + 240_000, "S3", "BLOCKED", "Verified landslide", incidentId));
  return { events, state: fold(events), incidentId };
}

describe("network state", () => {
  it("starts with NH-29 OPEN and Route B high risk with stale evidence", () => {
    const state = fold(startScenario(operator, t0));
    const network = effectiveNetwork(state.network, t0);
    expect(network.S3.effectiveState).toBe("OPEN");
    expect(network.B2.effectiveState).toBe("HIGH_RISK");
    expect(network.B2.stale).toBe(true);
  });

  it("never converts UNKNOWN to OPEN and marks old OPEN evidence STALE", () => {
    const state = fold(startScenario(operator, t0));
    const later = effectiveNetwork(state.network, t0 + 20 * 3_600_000);
    expect(later.S3.effectiveState).toBe("STALE");
    expect(later.B2.effectiveState).toBe("HIGH_RISK");
  });

  it("blocks NH-29 after the verified incident", () => {
    const { state } = scenarioUpToBlocked();
    expect(effectiveNetwork(state.network, t0 + 300_000).S3.effectiveState).toBe("BLOCKED");
  });
});

describe("evidence", () => {
  it("is pending with a single field report and corroborated after context evidence", () => {
    const events = [...startScenario(operator, t0)];
    events.push(...reportIncident(fold(events), operator, t0 + 60_000, primaryIncidentSeed, null));
    const pending = buildView(fold(events), t0 + 60_000).incidents[0].assessment;
    expect(pending.status).toBe("PENDING_VERIFICATION");
    const incidentId = fold(events).incidentOrder[0];
    events.push(...addContextEvidence(fold(events), operator, t0 + 120_000, incidentId, ["SECOND_REPORT", "WEATHER", "INSTITUTIONAL"]));
    const corroborated = buildView(fold(events), t0 + 120_000).incidents[0].assessment;
    expect(corroborated.status).toBe("CORROBORATED");
    expect(corroborated.E).toBeGreaterThan(pending.E);
  });

  it("only becomes VERIFIED through an officer action", () => {
    const events = [...startScenario(operator, t0)];
    events.push(...reportIncident(fold(events), operator, t0 + 60_000, primaryIncidentSeed, null));
    const incidentId = fold(events).incidentOrder[0];
    events.push(...addContextEvidence(fold(events), operator, t0 + 120_000, incidentId, ["SECOND_REPORT", "WEATHER", "INSTITUTIONAL", "HISTORICAL"]));
    expect(buildView(fold(events), t0 + 120_000).incidents[0].assessment.status).toBe("CORROBORATED");
    events.push(...verifyIncident(fold(events), authority, t0 + 180_000, incidentId));
    expect(buildView(fold(events), t0 + 180_000).incidents[0].assessment.status).toBe("VERIFIED");
  });
});

describe("vehicle-aware feasibility", () => {
  it("rejects the HCV on the LMV-only Route C and accepts the LMV", () => {
    const { state } = scenarioUpToBlocked();
    const now = t0 + 300_000;
    const network = effectiveNetwork(state.network, now);
    const hcv = evaluateRoute("C", getMission("M-101"), getVehicle("V-HCV-16W"), network, t0 + 8 * 3_600_000, now);
    const lmv = evaluateRoute("C", getMission("M-103"), getVehicle("V-LMV"), network, t0 + 72 * 3_600_000, now);
    expect(hcv.feasibility).toBe("INFEASIBLE");
    expect(hcv.hardConstraintViolation).toBe(true);
    expect(lmv.feasibility).toBe("FEASIBLE");
  });

  it("marks Route B undetermined because of high risk and stale evidence", () => {
    const { state } = scenarioUpToBlocked();
    const now = t0 + 300_000;
    const evaluation = evaluateRoute("B", getMission("M-103"), getVehicle("V-LMV"), effectiveNetwork(state.network, now), t0 + 72 * 3_600_000, now);
    expect(evaluation.feasibility).toBe("UNDETERMINED");
  });
});

describe("decisions", () => {
  it("gives M-101 HOLD, M-102 HOLD and M-103 REROUTE via Route C from the same disruption", () => {
    const { state } = scenarioUpToBlocked();
    const view = buildView(state, t0 + 300_000);
    const byMission = Object.fromEntries(view.missions.map((mission) => [mission.mission.id, mission]));
    expect(byMission["M-101"].activeDecision?.recommendation.action).toBe("HOLD");
    expect(byMission["M-101"].activeDecision?.recommendation.noVerifiedFeasibleRoute).toBe(true);
    expect(byMission["M-101"].activeDecision?.recommendation.followUp).toEqual(["VERIFY", "ESCALATE"]);
    expect(byMission["M-102"].activeDecision?.recommendation.action).toBe("HOLD");
    expect(byMission["M-103"].activeDecision?.recommendation.action).toBe("REROUTE");
    expect(byMission["M-103"].activeDecision?.recommendation.routeId).toBe("C");
    expect(byMission["M-103"].activeDecision?.recommendation.divertPlaceId).toBe("chumoukedima");
  });

  it("prepares the CRITICAL mission first but does not let priority override the vehicle restriction", () => {
    const { state } = scenarioUpToBlocked();
    const order = state.decisionOrder.map((id) => state.decisions[id].missionId);
    expect(order[0]).toBe("M-101");
    expect(state.decisions[state.decisionOrder[0]].recommendation.action).toBe("HOLD");
  });

  it("ranks impact SEVERE / HIGH / LOW across the three missions", () => {
    const { state } = scenarioUpToBlocked();
    const levels = buildView(state, t0 + 300_000).missions.map((mission) => mission.impact.level);
    expect(levels).toEqual(["SEVERE", "HIGH", "LOW"]);
  });

  it("makes Route C infeasible for M-103 when its vehicle changes to the HCV", () => {
    const { events } = scenarioUpToBlocked();
    events.push(...changeMissionVehicle(fold(events), operator, t0 + 400_000, "M-103", "V-HCV-16W"));
    const view = buildView(fold(events), t0 + 400_000);
    const m103 = view.missions.find((mission) => mission.mission.id === "M-103")!;
    expect(m103.activeDecision?.recommendation.action).toBe("HOLD");
    expect(m103.decisions.filter((decision) => decision.status === "SUPERSEDED")).toHaveLength(1);
  });
});

describe("authority, driver and reassessment", () => {
  it("issues an instruction on approval, records acknowledgement, then supersedes on the second disruption", () => {
    const { events } = scenarioUpToBlocked();
    const m103Decision = fold(events).decisionOrder.map((id) => fold(events).decisions[id]).find((decision) => decision.missionId === "M-103")!;
    events.push(...actOnDecision(fold(events), authority, t0 + 500_000, m103Decision.id, "APPROVED", null));
    let state = fold(events);
    expect(state.decisions[m103Decision.id].status).toBe("APPROVED");
    expect(state.instructionOrder).toHaveLength(1);
    const instruction = state.instructions[state.instructionOrder[0]];
    expect(instruction.text).toContain("DIVERT AT");
    events.push(...acknowledgeInstruction(state, t0 + 600_000, instruction.id));
    state = fold(events);
    expect(state.instructions[instruction.id].acknowledgedAt).toBe(t0 + 600_000);

    events.push(...secondDisruption(state, operator, t0 + 700_000));
    state = fold(events);
    const view = buildView(state, t0 + 800_000);
    expect(view.network.C2.effectiveState).toBe("BLOCKED");
    expect(state.decisions[m103Decision.id].status).toBe("SUPERSEDED");
    const m103 = view.missions.find((mission) => mission.mission.id === "M-103")!;
    expect(m103.activeDecision?.recommendation.action).toBe("HOLD");
    expect(m103.activeDecision?.recommendation.noVerifiedFeasibleRoute).toBe(true);
    expect(m103.activeDecision?.recommendation.followUp).toEqual(["VERIFY", "ESCALATE"]);
    expect(m103.activeDecision?.reassessmentOf).toBe(m103Decision.id);
    expect(state.reassessments).toHaveLength(1);
    const feasibilities = m103.evaluations.map((evaluation) => [evaluation.routeId, evaluation.feasibility]);
    expect(feasibilities).toEqual([["A", "INFEASIBLE"], ["B", "UNDETERMINED"], ["C", "INFEASIBLE"]]);
  });

  it("refuses to act on a superseded decision and keeps the audit trail", () => {
    const { events } = scenarioUpToBlocked();
    const before = fold(events);
    const m103Decision = before.decisionOrder.map((id) => before.decisions[id]).find((decision) => decision.missionId === "M-103")!;
    events.push(...secondDisruption(before, operator, t0 + 700_000));
    const after = fold(events);
    expect(actOnDecision(after, authority, t0 + 800_000, m103Decision.id, "APPROVED", null)).toEqual([]);
    expect(after.events.some((event) => event.payload.type === "decision.superseded")).toBe(true);
    expect(after.events.filter((event) => event.payload.type === "incident.reported")).toHaveLength(2);
  });
});
