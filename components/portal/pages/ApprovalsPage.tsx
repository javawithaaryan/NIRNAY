"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { DecisionCard } from "@/components/portal/DecisionCard";
import { decisionLabel } from "@/components/portal/MissionStory";
import { PageHeader, portalDangerButton, portalPrimaryButton, portalSecondaryButton } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { canApprove, sessionActor, useSession } from "@/lib/auth/session";
import { portalActions } from "@/lib/scenario/actions";
import { getPlace } from "@/lib/scenario/seed/nh29";
import { usePortalState } from "@/lib/scenario/store";
import type { DecisionRecord, DecisionStatus } from "@/lib/scenario/types";

type ActedStatus = Exclude<DecisionStatus, "RECOMMENDED" | "SUPERSEDED">;

export function ApprovalsPage() {
  const view = usePortalView();
  const state = usePortalState();
  const session = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  if (!view || !state || !session) return <p className="text-sm text-on-surface-variant">Loading approvals…</p>;
  const pending = [...view.decisions].reverse().filter((decision) => decision.status === "RECOMMENDED");
  const acted = [...view.decisions].reverse().filter((decision) => decision.status !== "RECOMMENDED" && decision.status !== "SUPERSEDED");
  const allowed = canApprove(session);
  const missionFor = (id: string) => view.missions.find((mission) => mission.mission.id === id) ?? null;

  const approveLabel = (decision: DecisionRecord) => (decision.recommendation.action === "REROUTE" ? `Approve reroute via Route ${decision.recommendation.routeId}` : `Approve ${decision.recommendation.action}`);

  const act = async (decision: DecisionRecord, status: ActedStatus) => {
    setBusy(decision.id);
    try {
      await portalActions.actOnDecision(sessionActor(session), decision.id, status, null);
      const mission = missionFor(decision.missionId);
      setLastAction(
        `${decision.missionId} · ${mission?.mission.cargo ?? ""}: ${decisionLabel(decision)} → ${status.replace("_", " ")}${status === "APPROVED" ? " · driver instruction issued" : ""}`,
      );
    } finally {
      setBusy(null);
    }
  };

  const actionBar = (decision: DecisionRecord, afterVerification = false) => {
    const mission = missionFor(decision.missionId);
    const rec = decision.recommendation;
    return (
      <div data-approval-actions={decision.id} className="sticky bottom-0 z-20 -mx-4 -mb-4 border-t-2 border-primary-container bg-surface-container-lowest/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,16,38,0.08)] backdrop-blur sm:-mx-5 sm:-mb-5 sm:px-5">
        <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">Authority action</p>
        <p className="text-sm font-bold text-primary-container">
          Approving {decision.missionId} · {mission?.mission.cargo ?? ""} ({mission?.vehicle.vehicleClass}) — {decisionLabel(decision)}
          {rec.action === "HOLD" && rec.stagingPlaceId ? ` at ${getPlace(rec.stagingPlaceId).name}` : ""}
          {rec.action === "REROUTE" && rec.divertPlaceId ? ` · divert at ${getPlace(rec.divertPlaceId).name}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={!allowed || busy !== null} onClick={() => void act(decision, "APPROVED")} className={portalPrimaryButton}>
            {afterVerification ? "Approve after verification" : approveLabel(decision)}
          </button>
          {!afterVerification && (
            <button type="button" disabled={!allowed || busy !== null} onClick={() => void act(decision, "VERIFICATION_REQUESTED")} className={portalSecondaryButton}>
              Request verification
            </button>
          )}
          <button type="button" disabled={!allowed || busy !== null} onClick={() => void act(decision, "REJECTED")} className={portalDangerButton}>
            Reject
          </button>
        </div>
      </div>
    );
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
      {lastAction && (
        <p data-approval-feedback role="status" className="flex items-center gap-2 rounded-xs border border-success-outline bg-success-container px-4 py-2.5 text-sm font-bold text-success">
          <CircleCheck aria-hidden="true" className="size-5" />
          {lastAction}
        </p>
      )}
      <section className="space-y-4" aria-label="Pending approvals">
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary-container">Awaiting authority ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-on-surface-variant">Nothing awaits authority.</p>}
        {pending.map((decision) => (
          <DecisionCard key={decision.id} decision={decision} mission={missionFor(decision.missionId)} state={state}>
            {actionBar(decision)}
          </DecisionCard>
        ))}
      </section>
      {acted.length > 0 && (
        <section className="space-y-4" aria-label="Acted decisions">
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary-container">Acted on ({acted.length})</h2>
          {acted.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} mission={missionFor(decision.missionId)} state={state}>
              {decision.status === "VERIFICATION_REQUESTED" && actionBar(decision, true)}
            </DecisionCard>
          ))}
        </section>
      )}
    </>
  );
}
