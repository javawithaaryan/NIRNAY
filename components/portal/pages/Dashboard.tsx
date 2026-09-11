"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { ActionDrawer } from "@/components/portal/ActionDrawer";
import { CorridorMapLibre } from "@/components/portal/CorridorMapLibre";
import { DecisionStrip } from "@/components/portal/DecisionStrip";
import { FeasibilityMatrix } from "@/components/portal/FeasibilityMatrix";
import { IncidentIntelligenceHero } from "@/components/portal/IncidentIntelligenceHero";
import { ResponseSynthesisHero } from "@/components/portal/ResponseSynthesisHero";
import { ResponseActionsPanel } from "@/components/portal/ResponseActionsPanel";
import { ResponseSynthesisPanel } from "@/components/portal/ResponseSynthesisPanel";
import { RegionOrientation } from "@/components/portal/RegionOrientation";
import { ReassessmentAlert, TimelineList } from "@/components/portal/MissionStory";
import { SituationSummary } from "@/components/portal/SituationSummary";
import { StoryStrip } from "@/components/portal/StoryStrip";
import { portalPrimaryButton } from "@/components/portal/ui";
import { usePortalView } from "@/components/portal/usePortalView";
import { sessionActor, useSession } from "@/lib/auth/session";
import { portalActions } from "@/lib/scenario/actions";
import type { EffectiveSegment } from "@/lib/scenario/engine/network";
import { formatStamp } from "@/lib/scenario/format";
import { responseTimeline } from "@/lib/scenario/storyline";
import { usePortalState } from "@/lib/scenario/store";

export function Dashboard() {
  const view = usePortalView();
  const state = usePortalState();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  if (!view || !state || !session) return <p className="text-sm text-on-surface-variant">Loading operational state…</p>;

  const selectedMission = view.missions.find((mission) => mission.mission.id === selectedMissionId) ?? null;
  const rerouting = view.missions.find((mission) => mission.activeDecision?.recommendation.action === "REROUTE" && mission.activeDecision.status !== "SUPERSEDED");
  const highlightRouteId =
    selectedRouteId ?? selectedMission?.activeDecision?.recommendation.routeId ?? (selectedMission ? selectedMission.currentRouteId : null) ?? rerouting?.activeDecision?.recommendation.routeId ?? null;
  const latestIncident = view.incidents[view.incidents.length - 1] ?? null;

  const reevaluate = async () => {
    setBusy(true);
    try {
      await portalActions.reassess(sessionActor(session));
    } finally {
      setBusy(false);
    }
  };

  const selectMission = (id: string) => {
    setSelectedMissionId((current) => (current === id ? null : id));
    setSelectedRouteId(null);
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">
            Command Center · North East India › Nagaland › NH-29 Dimapur → Kohima
            {view.startedAt ? ` · scenario started ${formatStamp(view.startedAt)}` : " · scenario not started"}
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-primary-container sm:text-3xl">One landslide. Three missions. Different decisions.</h1>
          <p className="mt-0.5 text-sm font-bold uppercase tracking-wide text-secondary">Same disruption ≠ same decision</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionDrawer items={view.actionItems} />
          <button type="button" onClick={() => void reevaluate()} disabled={busy || !view.startedAt} className={portalPrimaryButton}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Re-evaluate missions
          </button>
        </div>
      </header>

      <StoryStrip view={view} state={state} />

      <IncidentIntelligenceHero view={view} state={state} incidentView={latestIncident} session={session} />

      <SituationSummary view={view} state={state} selectedMissionId={selectedMissionId} onSelectMission={selectMission} />

      <ReassessmentAlert state={state} missions={view.missions} />

      <ResponseSynthesisHero view={view} />

      <section id="operational-map" className="grid scroll-mt-20 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]" aria-label="Operational workspace">
        <div className="flex min-w-0 flex-col gap-3">
          <CorridorMapLibre
            segments={view.segments}
            incidents={view.incidents}
            missions={view.missions}
            highlightRouteId={highlightRouteId}
            selectedMissionId={selectedMissionId}
            onSelectMission={selectMission}
            heightClass="h-[420px] sm:h-[500px] xl:h-[560px]"
            overlay={<NetworkChangeOverlay segments={view.segments} />}
          />
          <TimelineList steps={responseTimeline(state).slice(-8)} title="Live response timeline · latest" emptyText="Waiting for a field incident." />
        </div>
        <div className="flex flex-col gap-3">
          <RegionOrientation />
        </div>
      </section>

      <Disclosure id="feasibility" title="View route comparison" subtitle="Route × mission feasibility with hard constraints, evidence freshness and route state">
        <FeasibilityMatrix
          routes={view.routes}
          missions={view.missions}
          selectedMissionId={selectedMissionId}
          highlightRouteId={highlightRouteId}
          onSelectMission={selectMission}
          onSelectRoute={setSelectedRouteId}
        />
      </Disclosure>

      <Disclosure id="decisions" title="Why? Decision explanations" subtitle="Same disruption ≠ same decision — the reasons behind each recommendation, and the AI-assisted narrative">
        <DecisionStrip missions={view.missions} selectedMissionId={selectedMissionId} onSelectMission={selectMission} />
        <ResponseSynthesisPanel missions={view.missions} />
      </Disclosure>

      {latestIncident && (
        <Disclosure id="response-actions" title="Response actions, notifications & incident report" subtitle="Who was informed, what is pending, and the generated incident report">
          <ResponseActionsPanel view={view} state={state} incidentView={latestIncident} />
        </Disclosure>
      )}

      {view.incidents.length > 1 && (
        <p className="text-xs text-on-surface-variant">
          Earlier incidents:{" "}
          {view.incidents.slice(0, -1).map((item) => (
            <Link key={item.incident.id} href={`/incidents/${item.incident.id}`} className="font-semibold text-secondary hover:underline">
              {item.incident.reference}
            </Link>
          ))}
        </p>
      )}
    </>
  );
}

function NetworkChangeOverlay({ segments }: { segments: EffectiveSegment[] }) {
  const blocked = segments.filter((segment) => segment.effectiveState === "BLOCKED");
  const degraded = segments.filter((segment) => segment.effectiveState !== "OPEN" && segment.effectiveState !== "BLOCKED");
  return (
    <div data-network-overlay className="pointer-events-none absolute bottom-10 left-3 z-10 max-w-[16rem] rounded-xs border border-outline-variant/60 bg-surface-container-lowest/95 px-3 py-2 text-xs shadow-md">
      <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">Road network</p>
      {blocked.length === 0 ? (
        <p className="mt-0.5 font-semibold text-success">NH-29 OPEN · no verified blockage</p>
      ) : (
        blocked.map((segment) => (
          <p key={segment.segment.id} className="mt-0.5 font-semibold text-on-surface">
            {segment.segment.name}: <span className="text-success">OPEN</span> → <span className="font-black text-error">BLOCKED</span>
          </p>
        ))
      )}
      {degraded.length > 0 && (
        <p className="mt-1 text-[0.6875rem] text-on-surface-variant">
          {degraded.map((segment) => `${segment.segment.name} ${segment.effectiveState.replace("_", " ")}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

function Disclosure({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-20 rounded-lg border border-outline-variant/60 bg-surface-container-lowest open:bg-transparent open:border-transparent">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 hover:bg-surface-container-low group-open:mb-3 group-open:border group-open:border-outline-variant/60 group-open:bg-surface-container-lowest">
        <span>
          <span className="block text-sm font-bold uppercase tracking-wide text-primary-container">{title}</span>
          <span className="block text-xs text-on-surface-variant">{subtitle}</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-secondary transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4">{children}</div>
    </details>
  );
}
