"use client";

import { Check } from "lucide-react";
import type { PortalState } from "@/lib/scenario/events";
import { presenterStages } from "@/lib/scenario/presenter";
import type { PortalView } from "@/lib/scenario/view";

type StageState = "pending" | "active" | "done";
type Stage = { key: string; title: string; subtitle: string; state: StageState; text: string };

export function deriveStages(view: PortalView, state: PortalState): Stage[] {
  const primary = view.incidents[0] ?? null;
  const second = view.incidents[1] ?? null;
  const blocked = view.segments.filter((segment) => segment.effectiveState === "BLOCKED");
  const affected = view.missions.filter((mission) => mission.impact.affectedSegmentIds.length > 0);
  const decided = view.missions.filter((mission) => mission.activeDecision);
  const approved = decided.filter((mission) => mission.activeDecision?.status === "APPROVED");
  const acked = view.instructions.filter((instruction) => instruction.acknowledgedAt);
  const superseded = state.decisionOrder.map((id) => state.decisions[id]).filter((decision) => decision.status === "SUPERSEDED");
  const meta = (key: string) => presenterStages.find((stage) => stage.key === key)!;

  const stages: Omit<Stage, "title" | "subtitle">[] = [
    {
      key: "detect",
      state: primary ? "done" : "pending",
      text: primary ? `${primary.incident.reference} · photo + GPS + time` : "NH-29 normal · no incident",
    },
    {
      key: "understand",
      state: primary ? (primary.interpretation && primary.assessment.corroborated ? "done" : "active") : "pending",
      text: primary?.interpretation
        ? `${primary.interpretation.hazard.label} · ${primary.interpretation.confidence.toFixed(2)} · ${primary.evidence.length} sources`
        : primary
          ? "Pending AI analysis"
          : "AI is assistive",
    },
    {
      key: "verify",
      state: primary?.incident.verifiedAt || primary?.incident.rejectedAt ? "done" : primary?.interpretation ? "active" : "pending",
      text: primary?.incident.verifiedAt ? `Verified by ${primary.incident.verifiedBy?.name}` : primary?.incident.rejectedAt ? "Rejected by officer" : "Officer action · AI does not verify",
    },
    {
      key: "respond",
      state: decided.length ? "done" : blocked.length || primary?.incident.verifiedAt ? "active" : "pending",
      text: decided.length
        ? decided.map((mission) => `${mission.mission.id} ${mission.activeDecision?.recommendation.action}${mission.activeDecision?.recommendation.routeId ? ` ${mission.activeDecision.recommendation.routeId}` : ""}`).join(" · ")
        : affected.length
          ? `Road BLOCKED · ${affected.length} missions affected`
          : "Road · missions · routes · decision",
    },
    {
      key: "authorize",
      state: decided.length && approved.length === decided.length && acked.length === view.instructions.length && view.instructions.length > 0 ? "done" : decided.length ? "active" : "pending",
      text: decided.length ? `${approved.length}/${decided.length} approved · ${acked.length}/${view.instructions.length} driver acks` : "Recommendation ≠ authorization",
    },
    {
      key: "reassess",
      state: superseded.length ? "done" : second ? "active" : "pending",
      text: superseded.length
        ? `${superseded.map((decision) => decision.missionId).join(", ")} superseded → re-evaluated`
        : second
          ? `${second.segment?.segment.name ?? "Second segment"} disrupted`
          : "Second disruption → re-evaluate",
    },
  ];

  return stages.map((stage) => ({ ...stage, title: meta(stage.key).title, subtitle: meta(stage.key).subtitle }));
}

export function StoryStrip({ view, state }: { view: PortalView; state: PortalState }) {
  const stages = deriveStages(view, state);
  return (
    <ol id="story" aria-label="Operational story" className="grid scroll-mt-20 grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
      {stages.map((stage, index) => (
        <li
          key={stage.key}
          data-story-stage={stage.key}
          data-story-state={stage.state}
          className={`relative flex flex-col rounded-lg border px-3 py-2 ${
            stage.state === "active"
              ? "border-warning-outline bg-warning-container/50"
              : stage.state === "done"
                ? "border-success-outline bg-surface-container-lowest"
                : "border-outline-variant/50 bg-surface-container-lowest opacity-70"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold ${
                stage.state === "done" ? "bg-success text-on-primary" : stage.state === "active" ? "bg-warning text-on-primary" : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {stage.state === "done" ? <Check aria-hidden="true" className="size-3" /> : index + 1}
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-primary-container">{stage.title}</span>
          </span>
          <span className="mt-0.5 text-[0.6875rem] leading-snug text-on-surface-variant">{stage.subtitle}</span>
          <span className="mt-1 text-xs font-semibold leading-snug text-on-surface">{stage.text}</span>
        </li>
      ))}
    </ol>
  );
}
