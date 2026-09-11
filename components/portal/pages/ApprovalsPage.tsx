"use client";

import { useState } from "react";
import { DecisionCard } from "@/components/portal/DecisionCard";
import { PageHeader, portalDangerButton, portalPrimaryButton, portalSecondaryButton } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { canApprove, sessionActor, useSession } from "@/lib/auth/session";
import { portalActions } from "@/lib/scenario/actions";
import type { DecisionStatus } from "@/lib/scenario/types";

export function ApprovalsPage() {
  const view = usePortalView();
  const session = useSession();
  const [busy, setBusy] = useState<string | null>(null);

  if (!view || !session) return <p className="text-sm text-on-surface-variant">Loading approvals…</p>;
  const pending = [...view.decisions].reverse().filter((decision) => decision.status === "RECOMMENDED");
  const acted = [...view.decisions].reverse().filter((decision) => decision.status !== "RECOMMENDED" && decision.status !== "SUPERSEDED");
  const allowed = canApprove(session);
  const missionFor = (id: string) => view.missions.find((mission) => mission.mission.id === id) ?? null;

  const act = async (decisionId: string, status: Exclude<DecisionStatus, "RECOMMENDED" | "SUPERSEDED">) => {
    setBusy(decisionId);
    try {
      await portalActions.actOnDecision(sessionActor(session), decisionId, status, null);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle="The authority approves an operational mission decision — not just a record. The system recommends; approval issues the driver instruction; nothing moves on a recommendation alone."
      />
      {!allowed && (
        <p className="rounded-xs border border-warning-outline bg-warning-container px-4 py-2.5 text-sm text-warning">
          You are signed in as a control-room operator. Only the approving-authority role can approve, reject or send back a recommendation. Sign in again with
          that role to act.
        </p>
      )}
      <section className="space-y-4" aria-label="Pending approvals">
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary-container">Awaiting authority ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-on-surface-variant">Nothing awaits authority.</p>}
        {pending.map((decision) => (
          <DecisionCard key={decision.id} decision={decision} mission={missionFor(decision.missionId)}>
            <p className="border-t border-outline-variant/40 pt-4 text-xs font-bold uppercase tracking-wider text-primary-container">Authority action</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!allowed || busy !== null} onClick={() => void act(decision.id, "APPROVED")} className={portalPrimaryButton}>
                Approve {decision.recommendation.action === "REROUTE" ? `reroute via Route ${decision.recommendation.routeId}` : decision.recommendation.action}
              </button>
              <button type="button" disabled={!allowed || busy !== null} onClick={() => void act(decision.id, "VERIFICATION_REQUESTED")} className={portalSecondaryButton}>
                Request verification
              </button>
              <button type="button" disabled={!allowed || busy !== null} onClick={() => void act(decision.id, "REJECTED")} className={portalDangerButton}>
                Reject
              </button>
            </div>
          </DecisionCard>
        ))}
      </section>
      {acted.length > 0 && (
        <section className="space-y-4" aria-label="Acted decisions">
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary-container">Acted on</h2>
          {acted.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} mission={missionFor(decision.missionId)}>
              {decision.status === "VERIFICATION_REQUESTED" && (
                <div className="flex flex-wrap gap-2 border-t border-outline-variant/40 pt-4">
                  <button type="button" disabled={!allowed || busy !== null} onClick={() => void act(decision.id, "APPROVED")} className={portalPrimaryButton}>
                    Approve after verification
                  </button>
                  <button type="button" disabled={!allowed || busy !== null} onClick={() => void act(decision.id, "REJECTED")} className={portalDangerButton}>
                    Reject
                  </button>
                </div>
              )}
            </DecisionCard>
          ))}
        </section>
      )}
    </>
  );
}
