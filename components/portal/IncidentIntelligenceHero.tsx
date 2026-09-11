"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowRight, Bot, Check, Hourglass, Play, ShieldCheck } from "lucide-react";
import { EvidencePhoto } from "@/components/portal/EvidencePhoto";
import { Badge, SimulatedTag, portalDangerButton, portalPrimaryButton, portalSecondaryButton, type Tone } from "@/components/portal/ui";
import { interpretIncident } from "@/lib/ai/interpret";
import { sessionActor, type PortalSession } from "@/lib/auth/session";
import { portalActions } from "@/lib/scenario/actions";
import type { PortalState } from "@/lib/scenario/events";
import { formatClock, formatCoordinates, formatStamp } from "@/lib/scenario/format";
import { buildIncidentIntelligence, corroborationPipeline, evidenceClassLabels, evidenceTier, type EvidenceTier, type SeverityTier } from "@/lib/scenario/intelligence";
import { getPlace, getRoute } from "@/lib/scenario/seed/nh29";
import type { IncidentView, PortalView } from "@/lib/scenario/view";

type Props = { view: PortalView; state: PortalState; incidentView: IncidentView | null; session: PortalSession };

const tierTone: Record<EvidenceTier, Tone> = { PRIMARY: "navy", CORROBORATING: "success", SUPPORTING: "info", CONTEXTUAL: "muted" };
const severityTone: Record<SeverityTier, Tone> = { CRITICAL: "danger", HIGH: "danger", MODERATE: "warning", LOW: "muted" };

export function IncidentIntelligenceHero({ view, state, incidentView, session }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!incidentView) return null;

  const act = async (key: string, task: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  };

  const { incident, assessment, interpretation, evidence, segment, severity } = incidentView;
  const intel = buildIncidentIntelligence(view, incidentView, state);
  const pipeline = corroborationPipeline(evidence);
  const field = evidence.find((item) => item.kind === "FIELD_REPORT");
  const place = segment ? getPlace(segment.segment.fromPlaceId).name : "";
  const corridor = segment?.segment.corridor ?? "";
  const hazard = interpretation?.hazard.label ?? incident.ai.label;
  const tiers = evidence.map((item) => evidenceTier(item.kind));
  const count = (tier: EvidenceTier) => tiers.filter((value) => value === tier).length;
  const cues = interpretation?.cues.filter((cue) => cue.source !== "context").slice(0, 4) ?? [];
  const has = (...kinds: string[]) => evidence.some((item) => kinds.includes(item.kind));
  const contextNames = [has("WEATHER") ? "weather" : null, has("INSTITUTIONAL") ? "institutional" : null, has("LOGISTICS") ? "operational" : null].filter(Boolean);
  const hasIndependent = has("NEARBY_REPORT", "SECOND_REPORT");
  const supportParts = [hasIndependent ? "a nearby independent observation" : null, contextNames.length ? `contextual ${contextNames.join(" / ")} signals` : null].filter(Boolean) as string[];
  const supportText = supportParts.join(" and ");
  const synthesis = interpretation
    ? `Field evidence indicates a probable ${hazard.toLowerCase()}-related roadway obstruction near ${place} (${corridor}). ${
        supportText ? `${supportText.charAt(0).toUpperCase()}${supportText.slice(1)} ${contextNames.length ? "are" : "is"} consistent with the reported disruption.` : "Corroborating signals are still being assembled."
      }`
    : null;
  const exposed = view.missions.filter((mission) =>
    [mission.mission.plannedRouteId, mission.currentRouteId, ...mission.decisions.map((decision) => decision.recommendation.routeId)].some(
      (routeId) => routeId && getRoute(routeId).segmentIds.includes(incident.segmentId),
    ),
  );
  const essential = exposed.filter((mission) => mission.mission.priority !== "NORMAL");
  const whySeverity = [
    `${severity.H >= 0.8 ? "High" : "Moderate"} hazard severity — ${incident.category.replace("-", " ")}`,
    corridor === "NH-29" ? "Important NH-29 corridor (Dimapur–Kohima artery)" : `${corridor} — secondary corridor`,
    incident.fullBlockage ? "Full carriageway blockage" : "Partial restriction",
    `${severity.X >= 0.6 ? "Significant" : "Limited"} network disruption extent`,
  ];
  const exposureNote = exposed.length ? `${essential.length ? "Essential missions" : "Missions"} exposed: ${exposed.map((mission) => `${mission.mission.id} ${mission.mission.cargo.toLowerCase()}`).join(", ")}` : null;
  const packageReady = Boolean(interpretation) && assessment.corroborated;
  const evidenceAt = (...kinds: string[]) => evidence.filter((item) => kinds.includes(item.kind)).map((item) => item.capturedAt).sort((a, b) => b - a)[0] ?? null;
  const aiTimes = state.events.filter((event) => event.payload.type === "ai.interpreted" && event.payload.interpretation.incidentId === incident.id).map((event) => event.at);
  const nearby = evidence.find((item) => item.kind === "NEARBY_REPORT" || item.kind === "SECOND_REPORT");
  const stages = [
    { key: "ingest", title: "Ingest", detail: `Field report received · ${field?.fieldReportReference ?? "seeded report"}`, pending: "", done: true, at: incident.reportedAt },
    { key: "classify", title: "Classify", detail: interpretation ? `Likely hazard: ${interpretation.hazard.label.toUpperCase()} · classification confidence ${Math.round(interpretation.confidence * 100)}%` : "", pending: "Awaiting AI classification", done: Boolean(interpretation), at: aiTimes[0] ?? null },
    { key: "extract", title: "Extract", detail: "Visual / reported cues:", pending: "Cues not yet extracted", done: Boolean(interpretation), at: aiTimes[0] ?? null },
    { key: "locate", title: "Locate", detail: assessment.L >= 0.7 ? `GPS matched to ${place} / ${corridor}` : "Location relocated onto the corridor for the demo", pending: "", done: Boolean(interpretation), at: aiTimes[0] ?? null },
    { key: "crosscheck", title: "Cross-check", detail: nearby ? `Nearby report found · ${nearby.distanceKm ?? 0.5} km` : "", pending: "Searching nearby reports…", done: Boolean(nearby), at: evidenceAt("NEARBY_REPORT", "SECOND_REPORT") },
    { key: "context", title: "Context check", detail: "Weather conditions assessed (simulated feed)", pending: "Weather context pending", done: has("WEATHER"), at: evidenceAt("WEATHER") },
    { key: "institutional", title: "Institutional check", detail: "Disaster-alert context assessed (simulated feed)", pending: "Institutional context pending", done: has("INSTITUTIONAL"), at: evidenceAt("INSTITUTIONAL") },
    { key: "operational", title: "Operational check", detail: "Logistics signal assessed (simulated feed)", pending: "Operational signal pending", done: has("LOGISTICS"), at: evidenceAt("LOGISTICS") },
    { key: "synthesize", title: "Synthesize", detail: "Evidence converges on one incident", pending: "Waiting for converging evidence", done: assessment.corroborated, at: assessment.corroborated ? (aiTimes.at(-1) ?? null) : null },
    { key: "assess", title: "Assess", detail: `Incident severity calculated · ${intel.severityTier}`, pending: "Severity pending", done: Boolean(interpretation), at: aiTimes.at(-1) ?? null },
    { key: "prepare", title: "Prepare", detail: "Verification package ready", pending: "Package not ready", done: packageReady, at: packageReady ? (aiTimes.at(-1) ?? null) : null },
  ];
  const supportingSignals = count("CORROBORATING") + count("SUPPORTING");
  const crossSource = [
    { label: "Nearby report agrees", ok: has("NEARBY_REPORT", "SECOND_REPORT") },
    { label: "Weather context is consistent", ok: has("WEATHER") },
    { label: "Institutional context supports", ok: has("INSTITUTIONAL") },
    { label: "Logistics signal indicates operational impact", ok: has("LOGISTICS") },
    { label: "Historical context is relevant", ok: has("HISTORICAL", "NETWORK_RECORD") },
  ];
  const applyNetwork = () =>
    act("network", async () => {
      if (!segment || segment.recordedState === "BLOCKED") return;
      await portalActions.changeSegmentState(sessionActor(session), incident.segmentId, "BLOCKED", `Verified incident ${incident.reference}: ${incident.note ?? incident.ai.label}`, incident.id);
    });
  const networkChanged = segment ? segment.effectiveState === "BLOCKED" : false;

  return (
    <section id="incident-analysis" data-ai-card data-ai-hero className="scroll-mt-20 overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-primary-container px-4 py-3 text-on-primary sm:px-5">
        <div>
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
            <Bot aria-hidden="true" className="size-5" />
            AI-assisted incident intelligence
          </p>
          <p className="text-xs text-on-primary/80">Turning an unstructured field observation into a verification-ready intelligence package.</p>
        </div>
        <p className="text-right text-[0.6875rem] text-on-primary/80">
          <span className="font-mono font-bold text-on-primary">{incident.reference}</span> · {segment?.segment.name} ({corridor})
          <span className="block">Provider: {interpretation?.provider.kind === "llm-backend" ? interpretation.provider.name : "deterministic demo fallback"} · assistive</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 xl:grid-cols-[15rem_minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-container">Inputs received</p>
          <div className="aspect-[4/3] overflow-hidden rounded-xs border border-outline-variant/60 bg-surface-container-high">
            {field?.photo?.kind === "field-db" ? (
              <EvidencePhoto reportId={field.photo.reportId} />
            ) : (
              <div className="flex h-full items-center justify-center p-3 text-center text-[0.6875rem] text-on-surface-variant">Seeded demo report — no photo</div>
            )}
          </div>
          <ul className="space-y-0.5 text-xs">
            <li>📷 {field?.photo?.kind === "field-db" ? "Photo attached" : "No photo (seeded)"}</li>
            <li>📍 {formatCoordinates(field?.originalLat ?? incident.lat, field?.originalLon ?? incident.lon)}{field?.accuracyM ? ` · ±${Math.round(field.accuracyM)} m` : ""}</li>
            <li>🕒 {formatStamp(incident.reportedAt)}</li>
            <li>📝 “{incident.note ?? "no note"}”</li>
            <li className="font-bold uppercase">Type: {incident.category}</li>
          </ul>
          <p className="text-[0.6875rem] text-on-surface-variant">
            {field?.fieldReportReference ?? "Seeded"} · {field?.origin === "FIELD" ? "field data" : "demo data"} · reporter identity not verified
          </p>
        </div>

        <div className="rounded-xs border border-outline-variant/50 bg-surface-container-low p-3" data-ai-decode>
          <p className="text-xs font-bold uppercase tracking-wider text-primary-container">AI analysis stages</p>
          <ol className="mt-2 space-y-1.5">
            {stages.map((stage, index) => (
              <li key={stage.key} data-ai-stage={stage.key} data-ai-stage-done={stage.done} className="arrive grid grid-cols-[1.75rem_minmax(0,1fr)] gap-1.5 text-xs">
                <span className={`flex size-6 items-center justify-center rounded-full font-mono text-[0.625rem] font-bold ${stage.done ? "bg-success text-on-primary" : "border border-outline-variant text-outline"}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className={`font-bold uppercase tracking-wide ${stage.done ? "text-primary-container" : "text-outline"}`}>{stage.title}</span>
                    {stage.at && <span className="font-mono text-[0.625rem] text-on-surface-variant">{formatClock(stage.at, true)}</span>}
                  </span>
                  <span className={`block ${stage.done ? "text-on-surface" : "text-outline"}`}>{stage.done ? stage.detail : stage.pending}</span>
                  {stage.key === "extract" && stage.done && cues.length > 0 && (
                    <ul className="text-[0.6875rem] text-on-surface-variant">
                      {cues.map((cue) => (
                        <li key={cue.text}>✓ {cue.text}</li>
                      ))}
                      {interpretation?.laneObstruction.assessment === "FULL" && <li>✓ possible full carriageway blockage</li>}
                    </ul>
                  )}
                  {stage.key === "classify" && !interpretation && (
                    <button type="button" data-ai-run disabled={busy !== null} onClick={() => void act("ai", () => interpretIncident(incident.id))} className={`${portalPrimaryButton} mt-1`}>
                      <Play aria-hidden="true" className="size-4" />
                      {busy === "ai" ? "Analysing…" : "Run AI analysis"}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-container">AI evidence cross-check</p>
            <p className="text-[0.6875rem] text-on-surface-variant">
              {count("PRIMARY")} primary · {count("CORROBORATING")} corroborating · {count("SUPPORTING")} supporting · {count("CONTEXTUAL")} contextual
            </p>
            <ul className="mt-1.5 space-y-1" aria-label="Evidence cross-check">
              {intel.rows.map((row) => (
                <li key={row.item.id} data-evidence-row={row.item.kind} className="arrive flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xs border border-outline-variant/50 px-2 py-1 text-xs">
                  <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" />
                  <span className="font-bold text-primary-container">{row.kindLabel}</span>
                  <SimulatedTag origin={row.item.origin} />
                  <span className="text-on-surface-variant">
                    {evidenceClassLabels[row.item.kind].toLowerCase()} · {row.relevance} · {formatClock(row.item.capturedAt)}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    <Badge tone={tierTone[evidenceTier(row.item.kind)]}>{evidenceTier(row.item.kind)}</Badge>
                    <span className="text-[0.625rem] font-bold uppercase tracking-wide text-on-surface-variant">{row.status}</span>
                  </span>
                </li>
              ))}
              {pipeline.channels
                .filter((channel) => !channel.item)
                .map((channel) => (
                  <li key={channel.key} data-channel={channel.key} className="flex items-center gap-2 rounded-xs border border-dashed border-outline-variant/70 px-2 py-1 text-xs text-on-surface-variant">
                    <Hourglass aria-hidden="true" className="size-3.5 shrink-0 text-secondary" />
                    {channel.label}
                    <span className="ml-auto font-bold uppercase text-secondary">{channel.pendingStatus}</span>
                  </li>
                ))}
            </ul>
          </div>
          <div data-cross-source className="rounded-xs border border-outline-variant/50 bg-surface-container-low p-2 text-xs">
            <p className="font-bold uppercase tracking-wider text-primary-container">Cross-source consistency</p>
            <ul className="mt-0.5 space-y-0.5">
              {crossSource.map((item) => (
                <li key={item.label} className={item.ok ? "text-on-surface" : "text-outline"}>
                  {item.ok ? "✓" : "⏳"} {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-outline-variant/40 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div data-convergence className="flex items-stretch gap-0 rounded-xs border border-outline-variant/50 bg-surface-container-low p-3">
          <ul className="flex flex-col justify-around gap-1 text-[0.6875rem] font-bold uppercase tracking-wide">
            {intel.rows.map((row) => (
              <li key={row.item.id} className="arrive whitespace-nowrap rounded-xs border border-outline-variant/60 bg-surface-container-lowest px-2 py-0.5 text-primary-container">
                {row.kindLabel}
              </li>
            ))}
          </ul>
          <svg aria-hidden="true" viewBox={`0 0 60 ${Math.max(intel.rows.length, 1) * 10}`} preserveAspectRatio="none" className="converge w-12 shrink-0 self-stretch sm:w-16">
            {intel.rows.map((row, index) => {
              const total = intel.rows.length;
              const y = (index + 0.5) * 10;
              const mid = (total * 10) / 2;
              return <path key={row.item.id} d={`M0 ${y} C 30 ${y}, 30 ${mid}, 60 ${mid}`} fill="none" stroke={assessment.corroborated ? "#15803d" : "#74777f"} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />;
            })}
          </svg>
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">Evidence convergence</p>
            <p data-convergence-count className="text-xs font-bold text-primary-container">
              {supportingSignals} of {evidence.length - 1} signals corroborate or support · {count("CONTEXTUAL")} contextual
            </p>
            <p className={`text-sm font-black uppercase ${assessment.corroborated ? "text-success" : "text-secondary"}`}>{assessment.corroborated ? "Multiple signals agree" : "Signals arriving…"}</p>
            <ArrowDown aria-hidden="true" className="size-4 text-outline" />
            <p className="text-sm font-black uppercase text-primary-container">{hazard} / road obstruction</p>
            <ArrowDown aria-hidden="true" className="size-4 text-outline" />
            <Badge tone={assessment.corroborated ? "success" : "info"}>{assessment.corroborated ? "Corroborated" : "Corroboration in progress"}</Badge>
          </div>
        </div>

        <div className="space-y-3">
          <p data-ai-synthesis className="rounded-xs border border-secondary/30 bg-secondary-container/20 px-3 py-2 text-sm text-on-surface">
            <span className="font-bold uppercase tracking-wide text-secondary">AI synthesis: </span>
            {synthesis ?? "Awaiting AI interpretation of the field report."}
          </p>
          <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="font-bold uppercase tracking-wider text-on-surface-variant">AI classification confidence</dt>
              <dd className="text-lg font-black text-primary-container">{interpretation ? <span data-ai-confidence>{Math.round(interpretation.confidence * 100)}%</span> : "—"}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-on-surface-variant">Evidence quality</dt>
              <dd data-evidence-quality className="font-mono text-lg font-black text-primary-container">E = {assessment.E.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-on-surface-variant">Corroboration</dt>
              <dd className="font-semibold">
                {count("CORROBORATING")} corroborating · {count("SUPPORTING") + count("CONTEXTUAL")} supporting / contextual
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-on-surface-variant">Freshness</dt>
              <dd>
                <Badge tone={intel.freshness === "CURRENT" ? "success" : intel.freshness === "AGEING" ? "warning" : "danger"}>{intel.freshness === "AGEING" ? "MIXED" : intel.freshness}</Badge>
              </dd>
            </div>
          </dl>
          <p className="text-[0.6875rem] text-on-surface-variant">AI classification confidence ≠ evidence quality ≠ incident severity. AI reduces evidence-gathering work; the officer remains the authority.</p>

          <div data-severity className="rounded-xs border border-outline-variant/60 bg-surface-container-low p-3">
            <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-container">
              AI-assisted incident assessment <Badge tone={severityTone[intel.severityTier]}>{intel.severityTier}</Badge>
            </p>
            <p className="mt-1 text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">Why {intel.severityTier.toLowerCase()}?</p>
            <ul className="mt-0.5 space-y-0.5 text-xs">
              {whySeverity.map((line) => (
                <li key={line}>✓ {line}</li>
              ))}
            </ul>
            {exposureNote && <p className="mt-1 text-[0.6875rem] text-on-surface-variant">{exposureNote}. Severity is operational seriousness — evidence strength is scored separately (E).</p>}
            <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.6875rem]">
              {intel.severityFactors.map((factor) => (
                <li key={factor.key}>
                  <span className="flex justify-between gap-1">
                    <span className="font-semibold text-on-surface">{factor.label}</span>
                    <span className="font-mono font-bold text-primary-container">{Math.round(factor.value * 100)}%</span>
                  </span>
                  <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-surface-container-high">
                    <span className="block h-full rounded-full bg-error" style={{ width: `${Math.round(factor.value * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
            <details className="mt-1 text-[0.6875rem] text-on-surface-variant">
              <summary className="cursor-pointer font-semibold text-secondary">View calculation</summary>
              {intel.severityFactors.map((factor) => (
                <p key={factor.key}>
                  {factor.key}: {factor.label.toLowerCase()} {factor.value.toFixed(2)} × {factor.weight} — {factor.why}
                </p>
              ))}
              <p>D = {severity.D.toFixed(2)}</p>
            </details>
          </div>
        </div>
      </div>

      <div className="border-t border-outline-variant/40 p-4 sm:p-5">
        {incident.verifiedAt ? (
          <div data-handoff className="space-y-2">
            <ol className="grid grid-cols-1 gap-2 text-xs md:grid-cols-4">
              <li className="rounded-xs border border-outline-variant/60 bg-surface-container-low p-2.5">
                <p className="font-bold uppercase tracking-wider text-primary-container">✓ AI analysis complete</p>
                <p className="text-on-surface-variant">{interpretation ? `${interpretation.hazard.label.toLowerCase()} · ${Math.round(interpretation.confidence * 100)}%` : "—"}</p>
              </li>
              <li className="rounded-xs border border-outline-variant/60 bg-surface-container-low p-2.5">
                <p className="font-bold uppercase tracking-wider text-primary-container">✓ Evidence package ready</p>
                <p className="text-on-surface-variant">
                  {evidence.length} items · E = {assessment.E.toFixed(2)}
                </p>
              </li>
              <li className="rounded-xs border border-success-outline bg-success-container/60 p-2.5 text-success">
                <p className="font-bold uppercase tracking-wider">Official incident status · ✓ verified</p>
                <p data-verified-line className="font-bold">
                  <ShieldCheck aria-hidden="true" className="mr-1 inline size-4 align-text-bottom" />
                  VERIFIED BY AUTHORIZED OFFICER · {formatStamp(incident.verifiedAt)} · {incident.verifiedBy?.name}
                </p>
              </li>
              <li className={`rounded-xs border p-2.5 ${networkChanged ? "border-error/40 bg-error-container/40" : "border-outline-variant/60 bg-surface-container-low"}`}>
                <p className="font-bold uppercase tracking-wider text-primary-container">{networkChanged ? "✓ Network response activated" : "Network response next"}</p>
                {networkChanged ? (
                  <p className="font-semibold">{`${corridor} · ${segment?.segment.name}: OPEN → BLOCKED`}</p>
                ) : (
                  <button type="button" data-apply-network disabled={busy !== null} onClick={() => void applyNetwork()} className={`${portalPrimaryButton} mt-1`}>
                    {busy === "network" ? "Applying…" : `Apply network change · ${corridor} → BLOCKED`}
                  </button>
                )}
              </li>
            </ol>
            <p className="text-[0.6875rem] text-on-surface-variant">AI prepared the evidence. The authorized officer made the official verification.</p>
          </div>
        ) : incident.rejectedAt ? (
          <p className="rounded-xs border border-error/30 bg-error-container px-3 py-2 text-xs font-bold text-on-error-container">Rejected by officer · {formatStamp(incident.rejectedAt)}</p>
        ) : (
          <div data-verification-package className={`rounded-xs border p-3 ${packageReady ? "border-success-outline bg-success-container/30" : "border-outline-variant/60 bg-surface-container-low"}`}>
            <p className={`text-sm font-black uppercase tracking-wide ${packageReady ? "text-success" : "text-secondary"}`}>
              {packageReady ? "✓ AI analysis complete · ✓ evidence package ready · officer verification required" : "Preparing verification package…"}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-xs md:grid-cols-5">
              <div><dt className="font-bold uppercase tracking-wider text-on-surface-variant">Incident</dt><dd className="font-semibold">{hazard} — {place} / {corridor}</dd></div>
              <div><dt className="font-bold uppercase tracking-wider text-on-surface-variant">Evidence</dt><dd className="font-semibold">{evidence.length} items · {supportingSignals} corroborating / supporting signals</dd></div>
              <div><dt className="font-bold uppercase tracking-wider text-on-surface-variant">AI assessment</dt><dd className="font-semibold">{interpretation ? `${interpretation.hazard.label} · ${Math.round(interpretation.confidence * 100)}% classification confidence` : "pending"}</dd></div>
              <div><dt className="font-bold uppercase tracking-wider text-on-surface-variant">Severity</dt><dd className="font-semibold">{intel.severityTier}</dd></div>
              <div><dt className="font-bold uppercase tracking-wider text-on-surface-variant">Network impact</dt><dd className="font-semibold">{corridor} segment affected</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" data-verify disabled={busy !== null || !interpretation} onClick={() => void act("verify", () => portalActions.verifyIncident(sessionActor(session), incident.id))} className={portalPrimaryButton}>
                <ShieldCheck aria-hidden="true" className="size-4" />
                {busy === "verify" ? "Verifying…" : "Verify incident"}
              </button>
              <button type="button" disabled={busy !== null} onClick={() => void act("more", () => portalActions.requestMoreEvidence(sessionActor(session), incident.id))} className={portalSecondaryButton}>
                Request more evidence
              </button>
              <button type="button" disabled={busy !== null} onClick={() => void act("reject", () => portalActions.rejectIncident(sessionActor(session), incident.id, "Rejected by officer during review"))} className={portalDangerButton}>
                Reject
              </button>
              <span className="text-xs text-on-surface-variant">Official status: pending officer verification · signed in as {session.name}</span>
            </div>
          </div>
        )}
        <Link href={`/incidents/${incident.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-secondary hover:underline">
          View detailed analysis <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
