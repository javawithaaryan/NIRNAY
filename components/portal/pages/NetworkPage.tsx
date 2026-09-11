"use client";

import { useState } from "react";
import { CorridorMapLibre } from "@/components/portal/CorridorMapLibre";
import { Badge, Card, CardHeader, GeometryTag, PageHeader, portalDangerButton, portalSecondaryButton, roadStateTone } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { sessionActor, useSession } from "@/lib/auth/session";
import { portalActions } from "@/lib/scenario/actions";
import { formatAge } from "@/lib/scenario/format";
import { scenarioMeta } from "@/lib/scenario/seed/nh29";

export function NetworkPage() {
  const view = usePortalView();
  const session = useSession();
  const [busy, setBusy] = useState<string | null>(null);

  if (!view || !session) return <p className="text-sm text-on-surface-variant">Loading network…</p>;

  const setState = async (segmentId: string, to: "OPEN" | "BLOCKED", reason: string) => {
    setBusy(segmentId);
    try {
      await portalActions.changeSegmentState(sessionActor(session), segmentId, to, reason, null);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Network"
        subtitle={`Road segments with recorded state, evidence freshness (stale after ${scenarioMeta.stalenessHours} h) and vehicle restrictions. UNKNOWN is never treated as OPEN; STALE is never presented as current.`}
      />
      <CorridorMapLibre segments={view.segments} incidents={view.incidents} missions={view.missions} heightClass="h-[380px]" />
      <Card>
        <CardHeader title="Segments" subtitle="Changing a state re-runs mission assessment; changed recommendations supersede earlier ones." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface-container text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Corridor</th>
                <th className="px-4 py-3">Recorded</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Last verified</th>
                <th className="px-4 py-3">Restriction</th>
                <th className="px-4 py-3">Geometry</th>
                <th className="px-4 py-3 text-right">Officer control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {view.segments.map((segment) => (
                <tr key={segment.segment.id} data-segment-row={segment.segment.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-primary-container">
                      <span className="mr-1.5 font-mono text-xs text-on-surface-variant">{segment.segment.id}</span>
                      {segment.segment.name}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {segment.segment.roadClass} · {segment.segment.distanceKm} km · {segment.segment.travelMin} min
                    </div>
                    {segment.runtime.reason && <div className="mt-0.5 text-xs text-on-surface-variant">{segment.runtime.reason}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">{segment.segment.corridor}</td>
                  <td className="px-4 py-3">
                    <Badge tone={roadStateTone(segment.recordedState)}>{segment.recordedState.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={roadStateTone(segment.effectiveState)}>{segment.effectiveState.replace("_", " ")}</Badge>
                    {segment.stale && segment.effectiveState !== "STALE" && <div className="mt-1 text-[0.6875rem] font-semibold text-warning">evidence stale</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">{formatAge(segment.runtime.lastVerifiedAt, view.now)}</td>
                  <td className="px-4 py-3 text-xs">
                    {segment.segment.restriction ? (
                      <>
                        <Badge tone="info">{segment.segment.restriction.maxVehicleClass ? `${segment.segment.restriction.maxVehicleClass} only` : `≤ ${segment.segment.restriction.maxGrossTonnes} t`}</Badge>
                        <div className="mt-1 text-on-surface-variant">{segment.segment.restriction.note}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <GeometryTag source={segment.segment.geometrySource} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {segment.recordedState === "BLOCKED" ? (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void setState(segment.segment.id, "OPEN", `Cleared and verified by ${session.name}`)}
                        className={portalSecondaryButton}
                      >
                        Mark OPEN (verified now)
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void setState(segment.segment.id, "BLOCKED", `Marked blocked by ${session.name}`)}
                        className={portalDangerButton}
                      >
                        Mark BLOCKED
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
