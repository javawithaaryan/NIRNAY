"use client";

import { DecisionCard } from "@/components/portal/DecisionCard";
import { MissionImpactCards, ReassessmentAlert, TimelineList } from "@/components/portal/MissionStory";
import { PageHeader } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { usePortalState } from "@/lib/scenario/store";
import { responseTimeline } from "@/lib/scenario/storyline";

export function DecisionsPage() {
  const view = usePortalView();
  const state = usePortalState();
  if (!view || !state) return <p className="text-sm text-on-surface-variant">Loading decisions…</p>;

  const decisions = [...view.decisions].reverse();
  const active = decisions.filter((decision) => decision.status !== "SUPERSEDED");
  const superseded = decisions.filter((decision) => decision.status === "SUPERSEDED");
  const affected = view.missions.filter((mission) => mission.impact.affectedSegmentIds.length > 0).length;
  const missionFor = (id: string) => view.missions.find((mission) => mission.mission.id === id) ?? null;

  return (
    <>
      <PageHeader
        title="Decisions"
        subtitle="One disruption, three missions, different decisions. Every recommendation shows the routes evaluated, the hard constraints checked and why — and superseded decisions are kept, never deleted."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <TimelineList steps={responseTimeline(state)} title="Live response timeline" emptyText="Waiting for a field incident. The timeline fills as evidence, verification, network changes and decisions happen." />
        <div className="space-y-4">
          <ReassessmentAlert state={state} missions={view.missions} />
          <section aria-label="Mission impact summary" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-black uppercase tracking-wide text-primary-container">Mission impact summary</h2>
              <p className="text-sm font-black uppercase text-error">{affected ? `${affected} missions affected` : "No mission affected"}</p>
            </div>
            <MissionImpactCards missions={view.missions} />
          </section>
        </div>
      </div>

      {decisions.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No decisions yet. Decisions are prepared automatically when a verified network change affects a mission.</p>
      ) : (
        <section aria-label="Mission decisions" className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-primary-container">Mission decisions ({active.length})</h2>
          {active.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} mission={missionFor(decision.missionId)} />
          ))}
          {superseded.length > 0 && (
            <>
              <h2 className="pt-2 text-sm font-black uppercase tracking-wide text-on-surface-variant">Superseded decisions ({superseded.length}) — kept for the record</h2>
              {superseded.map((decision) => (
                <DecisionCard key={decision.id} decision={decision} mission={missionFor(decision.missionId)} />
              ))}
            </>
          )}
        </section>
      )}
    </>
  );
}
