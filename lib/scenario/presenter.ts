import { interpretStaleIncidents } from "@/lib/ai/interpret";
import { latestQueuedFieldReport, portalActions } from "@/lib/scenario/actions";
import { primaryIncidentSeed } from "@/lib/scenario/commands";
import { loadState, setMeta } from "@/lib/scenario/store";
import type { Actor } from "@/lib/scenario/types";

export const presenterStepKey = "presenterStep";

export type PresenterStep = {
  n: number;
  label: string;
  description: string;
  href: string;
  anchor?: string;
  apply?: (actor: Actor) => Promise<void>;
};

export type PresenterStage = { key: string; title: string; subtitle: string; steps: number[] };

export const presenterStages: PresenterStage[] = [
  { key: "detect", title: "Detect", subtitle: "Field report arrives", steps: [2] },
  { key: "understand", title: "Understand", subtitle: "AI analysis + multi-source corroboration", steps: [3] },
  { key: "verify", title: "Verify", subtitle: "Officer verification", steps: [4] },
  { key: "respond", title: "Respond", subtitle: "Network change · mission impact · route feasibility · decision", steps: [5, 6, 7, 8] },
  { key: "authorize", title: "Authorize", subtitle: "Authority + driver action", steps: [9, 10, 11] },
  { key: "reassess", title: "Reassess", subtitle: "Second disruption · superseded decision · reassessment", steps: [12, 13, 14] },
];

export function stageIndexForStep(n: number): number {
  return presenterStages.findIndex((stage) => stage.steps.includes(n));
}

async function primaryIncidentId(): Promise<string | null> {
  const state = await loadState();
  return state.incidentOrder.find((id) => state.incidents[id].reference === primaryIncidentSeed.reference) ?? null;
}

export const presenterSteps: PresenterStep[] = [
  {
    n: 1,
    label: "Normal",
    description: "NH-29 OPEN, three missions on time.",
    href: "/dashboard",
    apply: async (actor) => portalActions.reset(actor),
  },
  {
    n: 2,
    label: "Incident received",
    anchor: "story",
    description: "A field report arrives: photo + GPS + timestamp received, status PENDING AI ANALYSIS. Uses the most recent report saved by /field/report on this browser if one exists, otherwise a seeded demo report.",
    href: "/dashboard",
    apply: async (actor) => {
      await portalActions.ensureStarted(actor);
      await portalActions.reportPrimaryIncident(actor, await latestQueuedFieldReport());
    },
  },
  {
    n: 3,
    label: "AI analysis + corroboration",
    anchor: "incident-analysis",
    description: "The AI decodes the evidence; nearby field reports on this device (real) plus second report, weather, institutional, historical, logistics and network-record context (simulated / seeded) are attached and synthesized. AI does not verify.",
    href: "/dashboard",
    apply: async (actor) => {
      const id = await primaryIncidentId();
      if (!id) return;
      await portalActions.attachNearbyFieldReports(actor, id);
      await portalActions.addAllContextEvidence(actor, id);
      await interpretStaleIncidents();
    },
  },
  {
    n: 4,
    label: "Human verification",
    anchor: "incident-analysis",
    description: "An authorized officer verifies the incident. AI analysis is not verification.",
    href: "/dashboard",
    apply: async (actor) => {
      const id = await primaryIncidentId();
      if (id) await portalActions.verifyIncident(actor, id);
    },
  },
  {
    n: 5,
    label: "NH-29 blocked",
    anchor: "operational-map",
    description: "Network state applied: Pherima – Pagala Pahar OPEN → BLOCKED. The engine prepares mission assessments in priority order.",
    href: "/dashboard",
    apply: async (actor) => {
      const id = await primaryIncidentId();
      await portalActions.changeSegmentState(
        actor,
        primaryIncidentSeed.segmentId,
        "BLOCKED",
        `Verified incident ${primaryIncidentSeed.reference}: ${primaryIncidentSeed.note}`,
        id,
      );
    },
  },
  { n: 6, label: "Missions affected", description: "One network event fans out to three missions with different impact.", href: "/dashboard", anchor: "situation" },
  { n: 7, label: "Route analysis", description: "Routes A, B and C compared per mission with vehicle-aware feasibility.", href: "/dashboard", anchor: "response-synthesis" },
  { n: 8, label: "Decision", description: "Same disruption, different decisions — each with a WHY, plus the AI-assisted response synthesis.", href: "/dashboard", anchor: "situation" },
  {
    n: 9,
    label: "Authority",
    description: "Approving authority approves the recommendations. Recommendation is not authorization.",
    href: "/approvals",
    apply: async (actor) => {
      const state = await loadState();
      const pending = state.decisionOrder.map((id) => state.decisions[id]).filter((decision) => decision.status === "RECOMMENDED");
      for (const decision of pending) {
        await portalActions.actOnDecision({ ...actor, role: "AUTHORITY" }, decision.id, "APPROVED", "Approved during presenter walkthrough");
      }
    },
  },
  {
    n: 10,
    label: "Driver",
    description: "Driver instruction issued and acknowledged (acknowledgement simulated in the portal).",
    href: "/monitoring",
    apply: async () => {
      const state = await loadState();
      for (const id of state.instructionOrder) {
        const instruction = state.instructions[id];
        if (!instruction.acknowledgedAt && state.decisions[instruction.decisionId]?.status === "APPROVED") {
          await portalActions.acknowledgeInstruction(id);
        }
      }
    },
  },
  {
    n: 11,
    label: "Offline",
    description: "Open /field/report on the reporting device (or another tab), switch it offline and submit — the report is saved on the device and queued. No network is simulated here.",
    href: "/monitoring",
  },
  {
    n: 12,
    label: "Second disruption",
    anchor: "reassessment-alert",
    description: "Landslide on the Niuland bypass (Route C): reported, corroborated, verified and applied — Route C OPEN → BLOCKED.",
    href: "/dashboard",
    apply: async (actor) => {
      await portalActions.secondDisruption(actor);
      await interpretStaleIncidents();
    },
  },
  { n: 13, label: "Reassessment", description: "Previous approved M-103 reroute is SUPERSEDED; the engine re-evaluates.", href: "/dashboard", anchor: "reassessment-alert" },
  {
    n: 14,
    label: "No verified feasible route",
    description: "A BLOCKED · B HIGH RISK / STALE · C BLOCKED → HOLD + VERIFY / ESCALATE. Abstaining is a valid outcome.",
    href: "/dashboard",
    anchor: "situation",
  },
];

export async function goToPresenterStep(step: PresenterStep, actor: Actor): Promise<void> {
  if (step.apply) await step.apply(actor);
  await setMeta(presenterStepKey, String(step.n));
}
