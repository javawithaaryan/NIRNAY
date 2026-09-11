"use client";

import { useState } from "react";
import { Bot, Play, RefreshCw, ShieldAlert } from "lucide-react";
import { Badge, Card, CardHeader, portalPrimaryButton, portalSecondaryButton, type Tone } from "@/components/portal/ui";
import { interpretIncident } from "@/lib/ai/interpret";
import { aiAssistiveLabel, aiGuardrails, type AiInterpretation } from "@/lib/ai/types";
import { formatStamp } from "@/lib/scenario/format";

const relevanceTone: Record<AiInterpretation["imageQuality"]["relevance"], Tone> = {
  HIGH: "success",
  MEDIUM: "info",
  LOW: "warning",
  NOT_ASSESSED: "muted",
};

const laneTone: Record<AiInterpretation["laneObstruction"]["assessment"], Tone> = {
  FULL: "danger",
  PARTIAL: "warning",
  NONE: "success",
  UNDETERMINED: "muted",
};

const consistencyTone: Record<AiInterpretation["consistency"]["assessment"], Tone> = {
  CONSISTENT: "success",
  PARTIAL: "info",
  INCONSISTENT: "danger",
  NO_CONTEXT: "muted",
};

const cueSourceLabel: Record<AiInterpretation["cues"][number]["source"], string> = {
  photo: "photo",
  note: "note",
  category: "type",
  context: "context",
};

type Props = {
  incidentId: string;
  interpretation: AiInterpretation | null;
  evidenceCount: number;
  verified: boolean;
};

export function AiInterpretationPanel({ incidentId, interpretation, evidenceCount, verified }: Props) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stale = interpretation ? interpretation.inputsUsed.contextKinds.length + 1 < evidenceCount : false;

  const rerun = async (force = true) => {
    setRunning(true);
    setError(null);
    try {
      await interpretIncident(incidentId, force);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div data-ai-panel>
    <Card>
      <CardHeader
        icon={<Bot aria-hidden="true" className="size-5" />}
        title="AI-assisted evidence interpretation"
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone="warning">Assistive · Not authoritative</Badge>
            {interpretation && (
              <Badge tone={interpretation.provider.kind === "llm-backend" ? "info" : "muted"}>
                {interpretation.provider.kind === "llm-backend" ? "LLM via backend adapter" : "Deterministic fallback"}
              </Badge>
            )}
          </span>
        }
        actions={
          <button type="button" data-ai-run onClick={() => void rerun(!interpretation ? false : true)} disabled={running} className={interpretation ? portalSecondaryButton : portalPrimaryButton}>
            {interpretation ? <RefreshCw aria-hidden="true" className={`size-4 ${running ? "motion-safe:animate-spin" : ""}`} /> : <Play aria-hidden="true" className="size-4" />}
            {running ? "Interpreting…" : interpretation ? (stale ? "Re-run on new evidence" : "Re-run") : "Run AI analysis"}
          </button>
        }
      />
      <div className="space-y-4 p-4 sm:p-5">
        <p data-ai-indicator className="inline-flex items-center gap-1.5 rounded-xs border border-warning-outline bg-warning-container px-2.5 py-1 text-xs font-bold text-warning">
          <ShieldAlert aria-hidden="true" className="size-4" />
          {verified ? "AI assistance used · Verified by an officer" : aiAssistiveLabel}
        </p>

        {error && <p className="text-xs text-on-error-container">{error}</p>}

        {!interpretation ? (
          <p className="text-sm text-on-surface-variant">{running ? "Interpreting the submitted evidence…" : "Pending AI analysis — run it to decode the submitted evidence. Nothing is verified by this step."}</p>
        ) : (
          <>
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Likely hazard type</p>
              <p className="mt-0.5 text-xl font-bold text-primary-container">{interpretation.hazard.label}</p>
              <LikelihoodBar value={interpretation.hazard.likelihood} label="likelihood" />
              {interpretation.hazard.alternatives.length > 0 && (
                <p className="mt-1 text-xs text-on-surface-variant">
                  Alternatives: {interpretation.hazard.alternatives.map((item) => `${item.label.toLowerCase()} (${item.likelihood.toFixed(2)})`).join(", ")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Metric label="Lane obstruction" tone={laneTone[interpretation.laneObstruction.assessment]} value={interpretation.laneObstruction.assessment} note={interpretation.laneObstruction.basis} />
              <Metric label="Image relevance / quality" tone={relevanceTone[interpretation.imageQuality.relevance]} value={interpretation.imageQuality.relevance.replace("_", " ")} note={interpretation.imageQuality.notes.join(" · ")} />
              <Metric label="Consistency with context" tone={consistencyTone[interpretation.consistency.assessment]} value={interpretation.consistency.assessment.replace("_", " ")} note={interpretation.consistency.notes.join(" · ")} />
            </div>

            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">Visible / reported cues</p>
              <ul className="mt-1 space-y-1 text-sm">
                {interpretation.cues.length === 0 && <li className="text-on-surface-variant">No structured cues extracted.</li>}
                {interpretation.cues.map((item, index) => (
                  <li key={`${index}-${item.text}`} className="flex items-start gap-2">
                    <Badge tone={item.strength === "strong" ? "navy" : item.strength === "moderate" ? "info" : "muted"} className="mt-0.5 shrink-0">
                      {cueSourceLabel[item.source]} · {item.strength}
                    </Badge>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">
                <span>Confidence</span>
                <span data-ai-confidence className="font-mono text-sm text-primary-container">
                  {interpretation.confidence.toFixed(2)}
                </span>
              </div>
              <LikelihoodBar value={interpretation.confidence} label="confidence" />
            </div>

            <div className="rounded-xs border border-outline-variant/40 bg-surface-container-low p-3">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-primary-container">Evidence summary</p>
              <p className="mt-1 text-sm text-on-surface">{interpretation.summary}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div>
                <p className="font-semibold uppercase tracking-wider text-on-surface-variant">Inputs used</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  <li>
                    <Badge tone={interpretation.inputsUsed.photo ? "success" : "muted"}>photo {interpretation.inputsUsed.photo ? "✓" : "—"}</Badge>
                  </li>
                  <li>
                    <Badge tone={interpretation.inputsUsed.note ? "success" : "muted"}>note {interpretation.inputsUsed.note ? "✓" : "—"}</Badge>
                  </li>
                  <li>
                    <Badge tone={interpretation.inputsUsed.category ? "success" : "muted"}>type {interpretation.inputsUsed.category ?? "—"}</Badge>
                  </li>
                  {interpretation.inputsUsed.contextKinds.map((kind) => (
                    <li key={kind}>
                      <Badge tone="info">{kind.toLowerCase().replace("_", " ")}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-on-surface-variant">
                  {interpretation.id} · {interpretation.provider.name}
                  {interpretation.provider.model ? ` · ${interpretation.provider.model}` : ""} · {formatStamp(interpretation.producedAt)}
                </p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-on-surface-variant">Limitations</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-on-surface-variant">
                  {interpretation.limitations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}

        <div className="rounded-xs border border-outline-variant/60 bg-surface-container-low p-3 text-xs text-on-surface-variant">
          <p className="font-bold uppercase tracking-wider text-primary-container">Scope of this interpretation</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {aiGuardrails.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p className="mt-1.5">Flow: field evidence → AI-assisted interpretation → corroboration → officer verification → network state → deterministic feasibility → recommendation → authority approval.</p>
        </div>
      </div>
    </Card>
    </div>
  );
}

function LikelihoodBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high" role="img" aria-label={`${label} ${Math.round(value * 100)}%`}>
      <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

function Metric({ label, value, tone, note }: { label: string; value: string; tone: Tone; note: string }) {
  return (
    <div className="rounded-xs border border-outline-variant/40 p-3">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="mt-1">
        <Badge tone={tone}>{value}</Badge>
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">{note}</p>
    </div>
  );
}
