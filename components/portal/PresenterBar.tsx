"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Minimize2, Presentation, RotateCcw, SkipForward } from "lucide-react";
import { sessionActor, useSession } from "@/lib/auth/session";
import { disableDemoMode, useDemoMode } from "@/lib/demoMode";
import { portalActions } from "@/lib/scenario/actions";
import { goToPresenterStep, presenterStages, presenterStepKey, presenterSteps, stageIndexForStep, type PresenterStep } from "@/lib/scenario/presenter";
import { setMeta, useMeta } from "@/lib/scenario/store";

function scrollToAnchor(anchor: string | undefined) {
  window.setTimeout(() => {
    if (!anchor) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const target = document.getElementById(anchor);
    if (target instanceof HTMLDetailsElement) target.open = true;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 450);
}

export function PresenterBar() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const stored = useMeta(presenterStepKey);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demoMode = useDemoMode();

  if (!session || !demoMode) return null;
  const current = stored ? Number(stored) : 0;
  const currentStep = presenterSteps.find((step) => step.n === current) ?? null;
  const nextStep = presenterSteps.find((step) => step.n === current + 1) ?? null;
  const currentStage = stageIndexForStep(current);
  const actor = { ...sessionActor(session), role: "PRESENTER" as const };

  const navigate = (step: PresenterStep) => {
    if (pathname !== step.href) router.push(step.href);
    scrollToAnchor(step.anchor);
  };

  const runSteps = async (targets: PresenterStep[]) => {
    if (busy || targets.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const step of targets) await goToPresenterStep(step, actor);
      navigate(targets[targets.length - 1]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  const advanceToStage = (index: number) => {
    const last = Math.max(...presenterStages[index].steps);
    if (last <= current) return;
    const from = current === 0 ? 1 : current + 1;
    void runSteps(presenterSteps.filter((step) => step.n >= from && step.n <= last));
  };

  const reset = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await portalActions.reset(actor);
      await setMeta(presenterStepKey, "1");
      if (pathname !== "/dashboard") router.push("/dashboard");
      scrollToAnchor(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed bottom-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container-lowest/95 px-3 py-1.5 text-xs font-bold text-primary-container shadow-md backdrop-blur hover:bg-surface-container-low"
      >
        <Presentation aria-hidden="true" className="size-4" />
        Presenter
      </button>
    );
  }

  const stageLabel = current <= 1 ? (current === 1 ? "Ready · NH-29 normal" : "Not started") : `${currentStage + 1}/${presenterStages.length} · ${presenterStages[currentStage]?.title}`;

  return (
    <div data-presenter className="fixed bottom-3 right-3 z-30 w-[min(24rem,calc(100vw-1.5rem))] text-xs">
      {expanded && (
        <div className="mb-2 overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest shadow-xl">
          <div className="border-b border-outline-variant/40 px-3 py-2">
            <p className="font-bold uppercase tracking-wider text-on-surface-variant">Demo storyline</p>
            {currentStep && <p className="mt-0.5 leading-snug text-on-surface">{currentStep.description}</p>}
          </div>
          <ol className="divide-y divide-outline-variant/30">
            {presenterStages.map((stage, index) => {
              const done = current >= Math.max(...stage.steps);
              const active = index === currentStage && !done;
              return (
                <li key={stage.key}>
                  <button
                    type="button"
                    disabled={busy || done}
                    onClick={() => advanceToStage(index)}
                    className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors ${active ? "bg-warning-container/40" : done ? "" : "hover:bg-surface-container-low"}`}
                  >
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold ${
                        done ? "bg-success text-on-primary" : active ? "bg-warning text-on-primary" : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {done ? <Check aria-hidden="true" className="size-3" /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold uppercase tracking-wide text-primary-container">{stage.title}</span>
                      <span className="block text-on-surface-variant">{stage.subtitle}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between gap-2 border-t border-outline-variant/40 px-3 py-2">
            <button type="button" onClick={() => void reset()} disabled={busy} className="inline-flex items-center gap-1 font-semibold text-secondary hover:underline disabled:opacity-50">
              <RotateCcw aria-hidden="true" className="size-3.5" />
              Reset demo
            </button>
            <span className="text-on-surface-variant">Step {current}/{presenterSteps.length}</span>
            <button type="button" onClick={disableDemoMode} className="font-semibold text-on-surface-variant hover:underline">
              Exit presentation mode
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container-lowest/95 p-1 pl-3 shadow-lg backdrop-blur">
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          <Presentation aria-hidden="true" className="size-4 shrink-0 text-primary-container" />
          <span className="min-w-0">
            <span className="block text-[0.625rem] font-bold uppercase tracking-wider text-on-surface-variant">Presenter</span>
            <span className="block truncate font-bold text-primary-container">{stageLabel}</span>
          </span>
          {expanded ? <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-on-surface-variant" /> : <ChevronUp aria-hidden="true" className="size-4 shrink-0 text-on-surface-variant" />}
        </button>
        <button
          type="button"
          data-presenter-next
          title={nextStep ? nextStep.description : "Demo complete"}
          onClick={() => (current === 0 ? void runSteps(presenterSteps.slice(0, 1)) : nextStep && void runSteps([nextStep]))}
          disabled={busy || (current !== 0 && !nextStep)}
          className="inline-flex max-w-[13rem] shrink-0 items-center gap-1 rounded-full bg-primary-container px-3 py-1.5 font-bold text-on-primary transition-colors hover:bg-primary disabled:opacity-50"
        >
          <SkipForward aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{current === 0 ? "Start demo" : nextStep ? `Next: ${nextStep.label}` : "Complete"}</span>
        </button>
        <button type="button" onClick={() => setMinimized(true)} aria-label="Minimize presenter control" className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-low">
          <Minimize2 aria-hidden="true" className="size-3.5" />
        </button>
      </div>
      {error && <p className="mt-1 rounded-xs bg-error-container px-2 py-1 text-on-error-container">{error}</p>}
    </div>
  );
}
