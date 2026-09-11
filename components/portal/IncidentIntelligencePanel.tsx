"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bot, Check, CircleAlert, Hourglass, MapPinned, Radar, ShieldCheck, UserCheck } from "lucide-react";
import { AiInterpretationPanel } from "@/components/portal/AiInterpretationPanel";
import { EvidencePhoto } from "@/components/portal/EvidencePhoto";
import { Badge, SimulatedTag, evidenceStatusTone, labelize, portalDangerButton, portalPrimaryButton, portalSecondaryButton, roadStateTone, type Tone } from "@/components/portal/ui";
import { sessionActor, type PortalSession } from "@/lib/auth/session";
import { portalActions } from "@/lib/scenario/actions";
import { evidenceWeights } from "@/lib/scenario/engine/evidence";
import type { PortalState } from "@/lib/scenario/events";
import { formatStamp } from "@/lib/scenario/format";
import { TimelineList } from "@/components/portal/MissionStory";
import { buildIncidentIntelligence, corroborationPipeline, evidenceClassLabels, evidenceRole, evidenceRoleCounts, type EvidenceRowStatus, type RailStageState } from "@/lib/scenario/intelligence";
import { evidenceTimeline } from "@/lib/scenario/storyline";
import { getPlace, getSegment } from "@/lib/scenario/seed/nh29";
import type { IncidentView, PortalView } from "@/lib/scenario/view";

const rowStatusTone: Record<EvidenceRowStatus, Tone> = { RECEIVED: "navy", CORROBORATES: "success", SUPPORTS: "info", CONTEXT: "muted" };
const railTone: Record<RailStageState, string> = {
  done: "border-success bg-success text-on-primary",
  active: "border-warning bg-warning-container text-warning",
  pending: "border-outline-variant bg-surface-container-lowest text-outline",
  rejected: "border-error bg-error text-on-primary",
};
const severityTone: Record<string, Tone> = { CRITICAL: "danger", HIGH: "warning", MODERATE: "info", LOW: "neutral" };

type Props = {
  view: PortalView;
  state: PortalState;
  incidentView: IncidentView;
  session: PortalSession;
  showPhoto?: boolean;
};

function Stage({ number, title, icon, badge, children, id }: { number: number; title: string; icon: ReactNode; badge?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section data-intel-stage={id} className="border-t border-outline-variant/40 px-4 py-4 first:border-t-0 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary-container font-mono text-[0.6875rem] font-bold text-on-primary">{number}</span>
        <span className="text-primary-container">{icon}</span>
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary-container">{title}</h3>
        {badge}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function IncidentIntelligencePanel({ view, state, incidentView, session, showPhoto = true }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const { incident, assessment, severity, evidence, interpretation, segment, networkApplied } = incidentView;
  const intel = buildIncidentIntelligence(view, incidentView, state);
  const seg = getSegment(incident.segmentId);
  const placeName = getPlace(seg.fromPlaceId).name;
  const pipeline = corroborationPipeline(evidence);
  const roles = evidenceRoleCounts(evidence);
  const photoCue = interpretation?.cues.find((cue) => cue.source === "photo");
  const aiFindings: { label: string; text: string; state: "ok" | "warn" | "pending" }[] = [
    {
      label: "Image interpretation",
      text: !interpretation ? "pending" : photoCue ? `visual pattern consistent with debris / slope obstruction (${interpretation.provider.kind === "llm-backend" ? "model" : "colour-statistics heuristic"})` : interpretation.inputsUsed.photo ? "photo analysed; no strong visual cue" : "no photo attached (seeded report)",
      state: !interpretation ? "pending" : photoCue ? "ok" : "warn",
    },
    {
      label: "Location consistency",
      text: assessment.L >= 0.7 ? `reported location falls within ${seg.name} (${seg.corridor})` : "location uncertain or relocated onto the corridor for the demo",
      state: assessment.L >= 0.7 ? "ok" : "warn",
    },
    { label: "Temporal consistency", text: assessment.T >= 0.8 ? "observation is recent" : "observation is ageing", state: assessment.T >= 0.8 ? "ok" : "warn" },
    {
      label: "Cross-source consistency",
      text: roles.independent > 0 ? "an independent field observation supports the same incident" : "awaiting an independent observation",
      state: roles.independent > 0 ? "ok" : "pending",
    },
    {
      label: "Context consistency",
      text: !interpretation || interpretation.consistency.assessment === "NO_CONTEXT" ? "context not yet checked" : interpretation.consistency.assessment === "CONSISTENT" ? "weather / institutional context is consistent with the reported disruption" : "context only partly consistent",
      state: !interpretation || interpretation.consistency.assessment === "NO_CONTEXT" ? "pending" : interpretation.consistency.assessment === "CONSISTENT" ? "ok" : "warn",
    },
  ];
  const actor = sessionActor(session);
  const fieldEvidence = evidence.find((item) => item.kind === "FIELD_REPORT");
  const missingContext = ["SECOND_REPORT", "WEATHER", "INSTITUTIONAL", "HISTORICAL", "LOGISTICS", "NETWORK_RECORD"].filter((kind) => !evidence.some((item) => item.kind === kind));
  const canApplyNetwork = Boolean(incident.verifiedAt) && segment && segment.recordedState !== "BLOCKED";

  const act = async (key: string, task: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-intel-panel className="overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
      <div className="border-b border-outline-variant/40 bg-primary-container px-4 py-3 text-on-primary sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-primary-fixed">Incident intelligence · field report → AI → corroboration → officer</p>
            <h2 className="text-base font-bold">
              {incident.reference} · {incident.ai.label} · {seg.name} ({seg.corridor})
            </h2>
          </div>
          <Badge tone={evidenceStatusTone(assessment.status)}>{labelize(assessment.status)}</Badge>
        </div>
        <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Incident progress">
          {intel.rail.map((stage, index) => (
            <li key={stage.key} data-rail={stage.key} data-rail-state={stage.state} className={`flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider ${railTone[stage.state]}`} title={stage.detail}>
              {stage.state === "done" ? <Check aria-hidden="true" className="size-3" /> : stage.state === "rejected" ? <CircleAlert aria-hidden="true" className="size-3" /> : <span className="font-mono">{index + 1}</span>}
              {stage.label}
            </li>
          ))}
        </ol>
      </div>

      <Stage id="report" number={1} title="Field report received" icon={<MapPinned aria-hidden="true" className="size-4" />} badge={<Badge tone={interpretation ? "success" : "warning"}>{interpretation ? "AI analysed" : "Pending AI analysis"}</Badge>}>
        <div className={`grid grid-cols-1 gap-4 ${showPhoto ? "md:grid-cols-[10rem_minmax(0,1fr)]" : ""}`}>
          {showPhoto && (
            <div className="aspect-[4/3] overflow-hidden rounded-xs border border-outline-variant/60 bg-surface-container-high">
              {fieldEvidence?.photo?.kind === "field-db" ? <EvidencePhoto reportId={fieldEvidence.photo.reportId} /> : <div className="flex h-full items-center justify-center p-3 text-center text-[0.6875rem] text-on-surface-variant">Seeded demo report — no photo</div>}
            </div>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div><dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Report</dt><dd className="font-mono font-semibold">{fieldEvidence?.fieldReportReference ?? "seeded"}</dd></div>
            <div><dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Location</dt><dd>{placeName} / {seg.corridor}</dd></div>
            <div><dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Received</dt><dd>{formatStamp(incident.reportedAt)}</dd></div>
            <div><dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Payload</dt><dd>{fieldEvidence?.photo?.kind === "field-db" ? "Photo + GPS + timestamp" : "GPS + timestamp (seeded)"}{fieldEvidence?.accuracyM ? ` · ±${Math.round(fieldEvidence.accuracyM)} m` : ""}</dd></div>
            <div><dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Reported type</dt><dd>{incident.category}</dd></div>
            <div><dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Source</dt><dd>{fieldEvidence?.source ?? "—"}</dd></div>
            {incident.note && <div className="col-span-2 sm:col-span-3"><dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Observation note</dt><dd>“{incident.note}”</dd></div>}
          </dl>
        </div>
      </Stage>

      <Stage id="ai" number={2} title="AI decodes the reported incident" icon={<Bot aria-hidden="true" className="size-4" />} badge={<Badge tone="warning">Assistive · Not authoritative</Badge>}>
        <p className="mb-3 text-xs text-on-surface-variant">
          Sources used: {interpretation ? [interpretation.inputsUsed.photo ? "field photograph" : null, interpretation.inputsUsed.note ? "observation note" : null, interpretation.inputsUsed.category ? "reported type" : null, "GPS / segment context", ...interpretation.inputsUsed.contextKinds.map((kind) => kind.toLowerCase().replace("_", " "))].filter(Boolean).join(" + ") : "awaiting analysis"}
        </p>
        <AiInterpretationPanel incidentId={incident.id} interpretation={interpretation} evidenceCount={evidence.length} verified={Boolean(incident.verifiedAt)} />
      </Stage>

      <Stage id="corroboration" number={3} title="Multi-source evidence corroboration" icon={<Radar aria-hidden="true" className="size-4" />} badge={<Badge tone={assessment.corroborated ? "success" : "info"}>{assessment.corroborated ? "Corroborated" : "Corroboration in progress"}</Badge>}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="space-y-3">
            {assessment.corroborated ? (
              <p data-corroboration-status="corroborated" className="text-sm font-bold uppercase tracking-wide text-success">
                {roles.supporting} supporting sources assessed · {roles.independent} independent observation{roles.independent === 1 ? "" : "s"} · {roles.contextual} contextual
              </p>
            ) : (
              <p data-corroboration-status="in-progress" className="text-sm font-bold uppercase tracking-wide text-secondary">
                Evidence being assembled · {pipeline.received} / {pipeline.total} source classes received
              </p>
            )}
            <ul className="space-y-1.5" aria-label="Evidence sources">
              {intel.rows.map((row) => {
                const role = evidenceRole(row.item.kind);
                return (
                  <li key={row.item.id} data-evidence-row={row.item.kind} className="arrive grid grid-cols-1 gap-x-3 gap-y-1 rounded-xs border border-outline-variant/50 bg-surface-container-lowest px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5">
                        <Check aria-hidden="true" className="size-4 shrink-0 text-success" />
                        <span className="text-sm font-bold text-primary-container">{row.kindLabel}</span>
                        <span className="rounded-xs border border-outline-variant/60 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-on-surface-variant">{evidenceClassLabels[row.item.kind]}</span>
                        <SimulatedTag origin={row.item.origin} />
                      </p>
                      <p className="mt-0.5 text-on-surface-variant">
                        {row.contribution} · {row.relevance} · {formatStamp(row.item.capturedAt)}
                        <span className="block truncate">{row.item.source}</span>
                      </p>
                    </div>
                    <div className="flex items-start gap-1.5 sm:flex-col sm:items-end">
                      <Badge tone={rowStatusTone[row.status]}>{row.status}</Badge>
                      <span className="text-[0.625rem] font-bold uppercase tracking-wider text-on-surface-variant">{role === "PRIMARY" ? "Primary evidence" : role === "INDEPENDENT" ? "Independent corroboration" : "Contextual support"}</span>
                    </div>
                  </li>
                );
              })}
              {pipeline.channels
                .filter((channel) => !channel.item)
                .map((channel) => (
                  <li key={channel.key} data-channel={channel.key} data-channel-state="pending" className="flex items-center gap-2 rounded-xs border border-dashed border-outline-variant/70 px-3 py-2 text-xs text-on-surface-variant">
                    <Hourglass aria-hidden="true" className="size-4 shrink-0 text-secondary" />
                    <span className="font-semibold">{channel.label}</span>
                    <span className="ml-auto font-bold uppercase tracking-wide text-secondary">{channel.pendingStatus}</span>
                  </li>
                ))}
            </ul>

            <div data-evidence-synthesis className="rounded-xs border border-outline-variant/60 bg-surface-container-low p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-primary-container">Evidence synthesis</p>
              <p className="mt-1 text-sm font-medium text-on-surface">
                {assessment.corroborated
                  ? "Multiple sources converge on the same disruption location and incident type."
                  : "A single field observation so far — corroborating sources are still being assembled."}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div><dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Evidence quality</dt><dd className="font-mono text-base font-bold text-primary-container">E = {assessment.E.toFixed(2)}</dd></div>
                <div><dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Corroboration</dt><dd className="font-semibold">{roles.independent} independent + {roles.contextual} contextual</dd></div>
                <div><dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Freshness</dt><dd><Badge tone={intel.freshness === "CURRENT" ? "success" : intel.freshness === "AGEING" ? "warning" : "danger"}>{intel.freshness === "AGEING" ? "MIXED" : intel.freshness}</Badge></dd></div>
                <div><dt className="font-semibold uppercase tracking-wider text-on-surface-variant">Assessment</dt><dd><Badge tone={assessment.corroborated ? "success" : "info"}>{assessment.corroborated ? "CORROBORATED" : "IN PROGRESS"}</Badge></dd></div>
              </dl>
              <details className="mt-2 text-[0.6875rem] text-on-surface-variant">
                <summary className="cursor-pointer font-semibold text-secondary">How was E calculated?</summary>
                <p className="mt-1">E = {evidenceWeights.L}·L + {evidenceWeights.T}·T + {evidenceWeights.C}·C + {evidenceWeights.S}·S + {evidenceWeights.K}·K (L {assessment.L.toFixed(2)} · T {assessment.T.toFixed(2)} · C {assessment.C.toFixed(2)} · S {assessment.S.toFixed(2)} · K {assessment.K.toFixed(2)}) — how much to trust the evidence; not incident severity and not an AI probability.</p>
              </details>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-on-surface-variant">
              <span>Simulated and seeded sources are mocked feeds — no government, weather or logistics API is connected. Nearby reports are read from the field-report store on this device.</span>
              {!incident.verifiedAt && !incident.rejectedAt && (
                <span className="ml-auto flex flex-wrap gap-1.5">
                  <button type="button" disabled={busy !== null} onClick={() => void act("nearby", () => portalActions.attachNearbyFieldReports(actor, incident.id))} className={portalSecondaryButton}>Scan nearby reports</button>
                  {missingContext.length > 0 && (
                    <button type="button" disabled={busy !== null} onClick={() => void act("context", () => portalActions.addAllContextEvidence(actor, incident.id))} className={portalSecondaryButton}>+ Attach simulated context ({missingContext.length})</button>
                  )}
                </span>
              )}
            </div>
          </div>
          <TimelineList steps={evidenceTimeline(state, incident.id)} title="Evidence processing timeline" emptyText="Waiting for the field report." />
        </div>
      </Stage>

      <Stage id="synthesis" number={4} title="AI-assisted evidence synthesis" icon={<Bot aria-hidden="true" className="size-4" />} badge={<Badge tone="warning">Assistive</Badge>}>
        <div data-ai-triage className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">AI interpretation</p>
                <p className="text-2xl font-black uppercase text-primary-container">{interpretation ? interpretation.hazard.label : "Pending"}</p>
              </div>
              {interpretation && (
                <div>
                  <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">Classification confidence</p>
                  <p data-classification-confidence className="text-2xl font-black text-primary-container">{Math.round(interpretation.confidence * 100)}%</p>
                </div>
              )}
            </div>
            {interpretation && <p className="text-[0.6875rem] text-on-surface-variant">Model classification confidence ({interpretation.provider.kind === "llm-backend" ? "LLM adapter" : "deterministic fallback"}) — not a validated probability that the incident is true.</p>}
            <ul className="space-y-1 text-xs" aria-label="AI findings">
              {aiFindings.map((finding) => (
                <li key={finding.label} data-ai-finding={finding.state} className="arrive flex gap-2">
                  <span aria-hidden="true" className={`mt-0.5 font-bold ${finding.state === "ok" ? "text-success" : finding.state === "warn" ? "text-warning" : "text-outline"}`}>{finding.state === "ok" ? "✓" : finding.state === "warn" ? "⚠" : "⏳"}</span>
                  <span><span className="font-bold text-primary-container">{finding.label}</span> — {finding.text}</span>
                </li>
              ))}
            </ul>
            <p data-ai-synthesis className="rounded-xs border border-secondary/30 bg-secondary-container/20 px-3 py-2 text-sm font-medium text-on-surface">
              <span className="font-bold uppercase tracking-wide text-secondary">AI synthesis: </span>
              {interpretation ? `Evidence is consistent with a ${interpretation.hazard.label.toLowerCase()} near ${placeName} (${seg.corridor}).` : "Awaiting AI interpretation of the field report."}
            </p>
            <p className="text-xs text-on-surface-variant">AI reduces manual evidence-checking time by bringing relevant signals together for the verifying officer.</p>
          </div>
          <dl className="space-y-3 rounded-xs border border-outline-variant/60 bg-surface-container-low p-3 text-xs">
            <div><dt className="font-bold uppercase tracking-wider text-on-surface-variant">Evidence quality</dt><dd className="font-mono text-xl font-black text-primary-container">E = {assessment.E.toFixed(2)}</dd><dd className="text-[0.6875rem] text-on-surface-variant">Deterministic evidence score</dd></div>
            <div><dt className="font-bold uppercase tracking-wider text-on-surface-variant">Recommended next step</dt><dd className="text-sm font-bold text-primary-container">{incident.verifiedAt ? "Verified — network update" : assessment.corroborated && interpretation ? "Verification package ready" : "Gather corroboration"}</dd></div>
            <div><dt className="font-bold uppercase tracking-wider text-on-surface-variant">Official status</dt><dd className={`font-bold ${incident.verifiedAt ? "text-success" : incident.rejectedAt ? "text-on-error-container" : "text-warning"}`}>{incident.verifiedAt ? "Verified by authorized officer" : incident.rejectedAt ? "Rejected by officer" : "Pending officer verification"}</dd></div>
          </dl>
        </div>
      </Stage>

      <Stage id="severity" number={5} title="Incident assessment — severity" icon={<CircleAlert aria-hidden="true" className="size-4" />} badge={<Badge tone={severityTone[intel.severityTier]}>{intel.severityTier}</Badge>}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[12rem_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-3xl font-bold text-primary-container">D = {severity.D.toFixed(2)}</p>
            <p className="text-[0.6875rem] text-on-surface-variant">D = 0.35 H + 0.20 A + 0.20 R + 0.25 X — NIRNYAY severity policy. Severity is operational seriousness; evidence quality (E) is verification support. They are never mixed.</p>
          </div>
          <ul className="space-y-1.5 text-xs">
            {intel.severityFactors.map((factor) => (
              <li key={factor.key} className="flex items-center gap-2">
                <span className="w-32 shrink-0 font-semibold text-primary-container">{factor.key} · {factor.label}</span>
                <span className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-surface-container-high"><span className="block h-full bg-secondary" style={{ width: `${Math.round(factor.value * 100)}%` }} /></span>
                <span className="font-mono">{factor.value.toFixed(2)} × {factor.weight}</span>
                <span className="text-on-surface-variant">— {factor.why}</span>
              </li>
            ))}
          </ul>
        </div>
      </Stage>

      <Stage id="verification" number={6} title="Human officer verification" icon={<UserCheck aria-hidden="true" className="size-4" />} badge={<Badge tone={intel.verificationState === "VERIFIED" ? "success" : intel.verificationState === "REJECTED" ? "danger" : intel.verificationState === "READY" ? "info" : "warning"}>{intel.verificationState === "READY" ? "Ready for officer verification" : labelize(intel.verificationState)}</Badge>}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xs border border-warning-outline bg-warning-container/60 p-3 text-xs text-warning">
            <p className="font-bold uppercase tracking-wider">AI = analysis & corroboration</p>
            <p className="mt-1">AI recommendation: {assessment.corroborated ? "CORROBORATED INCIDENT — likely" : interpretation ? "LIKELY INCIDENT — corroboration pending" : "analysis pending"}. This is a signal for the officer, not a verification.</p>
          </div>
          <div className="rounded-xs border border-success-outline bg-success-container/60 p-3 text-xs text-success">
            <p className="font-bold uppercase tracking-wider">Officer = official verification</p>
            {incident.verifiedAt ? (
              <p data-verified-line className="mt-1 font-semibold">VERIFIED BY AUTHORIZED OFFICER · {formatStamp(incident.verifiedAt)} · {incident.verifiedBy?.name} ({incident.verifiedBy?.role.toLowerCase()}) · {incident.reference}</p>
            ) : incident.rejectedAt ? (
              <p className="mt-1 font-semibold text-on-error-container">REJECTED · {formatStamp(incident.rejectedAt)} · {incident.rejectedBy?.name}</p>
            ) : (
              <p className="mt-1">Signed in as {session.name} ({session.role.toLowerCase()}). Verification is recorded in the audit trail.</p>
            )}
          </div>
        </div>
        {!incident.verifiedAt && !incident.rejectedAt && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy !== null} onClick={() => void act("verify", () => portalActions.verifyIncident(actor, incident.id))} className={portalPrimaryButton}><ShieldCheck aria-hidden="true" className="size-4" />Verify incident</button>
            <button type="button" disabled={busy !== null} onClick={() => void act("more", () => portalActions.requestMoreEvidence(actor, incident.id))} className={portalSecondaryButton}>Request more evidence</button>
            <button type="button" disabled={busy !== null} onClick={() => void act("reject", () => portalActions.rejectIncident(actor, incident.id, "Rejected by officer during review"))} className={portalDangerButton}>Reject</button>
          </div>
        )}
        {incident.moreEvidenceRequestedAt && !incident.verifiedAt && <p className="mt-2 text-xs text-on-surface-variant">More evidence requested {formatStamp(incident.moreEvidenceRequestedAt)}.</p>}
      </Stage>

      <Stage id="network" number={7} title="Network state change" icon={<Radar aria-hidden="true" className="size-4" />} badge={segment && <Badge tone={roadStateTone(segment.effectiveState)}>{segment.effectiveState.replace("_", " ")}</Badge>}>
        {segment && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm">
              <p className="font-semibold text-primary-container">{segment.segment.name} ({segment.segment.corridor})</p>
              <p className="mt-1 flex items-center gap-2 font-mono text-lg font-bold">
                <span className={networkApplied ? "text-on-surface-variant line-through" : "text-success"}>OPEN</span>
                <span aria-hidden="true">→</span>
                <span className={networkApplied ? "text-error" : "text-outline"}>BLOCKED</span>
              </p>
              <p className="text-xs text-on-surface-variant">{networkApplied ? `Reason: ${segment.runtime.reason}` : incident.verifiedAt ? "Verified — apply the state change to trigger deterministic mission assessment." : "Applied only after officer verification."}</p>
            </div>
            {canApplyNetwork && (
              <button type="button" disabled={busy !== null} onClick={() => void act("block", () => portalActions.changeSegmentState(actor, incident.segmentId, "BLOCKED", `Verified incident ${incident.reference}: ${incident.ai.label.toLowerCase()}`, incident.id))} className={portalDangerButton}>Mark segment BLOCKED and assess missions</button>
            )}
            {networkApplied && <Link href="/missions" className="text-xs font-bold text-secondary hover:underline">Affected missions →</Link>}
          </div>
        )}
      </Stage>
    </div>
  );
}
