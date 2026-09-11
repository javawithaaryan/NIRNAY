"use client";

import { Bot } from "lucide-react";
import { Badge, Card, CardHeader, decisionStatusTone, labelize, priorityTone } from "@/components/portal/ui";
import { synthesizeResponse } from "@/lib/ai/responseSynthesis";
import type { MissionView } from "@/lib/scenario/view";

export function ResponseSynthesisPanel({ missions }: { missions: MissionView[] }) {
  const anyDecision = missions.some((mission) => mission.activeDecision);
  return (
    <Card>
      <CardHeader
        icon={<Bot aria-hidden="true" className="size-5" />}
        title="AI-assisted response synthesis"
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone="warning">Assistive · Not authoritative</Badge>
            <span>AI explains and summarizes the situation. Deterministic NIRNYAY feasibility rules produce the recommendation. The authority authorizes it.</span>
          </span>
        }
      />
      {!anyDecision ? (
        <p className="px-5 py-6 text-sm text-on-surface-variant">No verified network change affects a mission yet, so there is nothing to synthesize.</p>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-outline-variant/40 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {missions.map((mission) => {
            const synthesis = synthesizeResponse(mission);
            const decision = mission.activeDecision;
            return (
              <article key={mission.mission.id} data-synthesis={mission.mission.id} className="space-y-2 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-primary-container">{mission.mission.id}</span>
                  <Badge tone={priorityTone(mission.mission.priority)}>{mission.mission.priority}</Badge>
                  {decision && <Badge tone={decisionStatusTone(decision.status)}>{labelize(decision.status)}</Badge>}
                </div>
                <p className="text-xs text-on-surface-variant">{synthesis.situation}</p>
                <p className="text-on-surface">{synthesis.narrative}</p>
                <p className="rounded-xs border border-primary-container/30 bg-surface-container-low px-3 py-2 text-sm font-bold text-primary-container">{synthesis.recommendation}</p>
              </article>
            );
          })}
        </div>
      )}
      <p className="border-t border-outline-variant/40 px-4 py-2.5 text-[0.6875rem] text-on-surface-variant">
        {missions[0] ? synthesizeResponse(missions[0]).provider : ""}. Final feasibility = network state + vehicle restrictions + route constraints + mission deadline + evidence freshness. AI cannot send a vehicle through a restricted route.
      </p>
    </Card>
  );
}
