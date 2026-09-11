"use client";

import { DecisionCard } from "@/components/portal/DecisionCard";
import { PageHeader } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { formatStamp } from "@/lib/scenario/format";
import { usePortalState } from "@/lib/scenario/store";

export function DecisionsPage() {
  const view = usePortalView();
  const state = usePortalState();
  if (!view || !state) return <p className="text-sm text-on-surface-variant">Loading decisions…</p>;

  const decisions = [...view.decisions].reverse();
  const reassessments = [...state.reassessments].reverse();

  return (
    <>
      <PageHeader
        title="Decisions"
        subtitle="Every recommendation records what changed, which routes were evaluated, which constraints rejected alternatives, and why. Superseded decisions are kept, never deleted."
      />
      {reassessments.length > 0 && (
        <section className="space-y-2" aria-label="Reassessments">
          {reassessments.map((item) => (
            <p key={item.at} className="rounded-xs border border-secondary/40 bg-secondary-container/30 px-4 py-2.5 text-sm text-on-secondary-container">
              <span className="font-bold uppercase tracking-wide">Reassessment triggered</span> · {formatStamp(item.at)} · {item.reason} · affected: {item.missionIds.join(", ")}
            </p>
          ))}
        </section>
      )}
      {decisions.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No decisions yet. Decisions are prepared automatically when a verified network change affects a mission.</p>
      ) : (
        <div className="space-y-4">
          {decisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} />
          ))}
        </div>
      )}
    </>
  );
}
