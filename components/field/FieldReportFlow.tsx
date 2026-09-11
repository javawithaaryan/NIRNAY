"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { DeviceReportsPanel } from "@/components/field/DeviceReportsPanel";
import { FieldConnectivityNotice } from "@/components/field/FieldConnectivityNotice";
import { FieldNotice } from "@/components/field/FieldNotice";
import { LocationStep } from "@/components/field/LocationStep";
import { ObservationStep } from "@/components/field/ObservationStep";
import { PhotoStep } from "@/components/field/PhotoStep";
import { ReportStepper } from "@/components/field/ReportStepper";
import { SubmissionResult } from "@/components/field/SubmissionResult";
import { saveReport } from "@/lib/field/reportStore";
import { ingestPendingFieldReports } from "@/lib/scenario/bridge";
import { syncPendingReports } from "@/lib/field/syncEngine";
import type { IncidentCategory, LocationFix, PreparedPhoto } from "@/lib/field/types";
import { useFieldSync } from "@/lib/field/useFieldSync";
import { useFieldReportCopy } from "@/lib/i18n/fieldReportCopy";
import { routes } from "@/lib/routes";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/buttonStyles";

type StepNumber = 1 | 2 | 3;

const finalStep: StepNumber = 3;

export function FieldReportFlow() {
  const copy = useFieldReportCopy();
  useFieldSync();

  const [step, setStep] = useState<StepNumber>(1);
  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [note, setNote] = useState("");
  const [location, setLocation] = useState<LocationFix | null>(null);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeadingRef = useRef(false);

  useEffect(() => {
    if (focusHeadingRef.current) {
      focusHeadingRef.current = false;
      headingRef.current?.focus();
    }
  }, [step, submittedId]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const goToStep = (nextStep: StepNumber) => {
    focusHeadingRef.current = true;
    setStep(nextStep);
    window.scrollTo({ top: 0 });
  };

  const handlePhotoChange = (nextPhoto: PreparedPhoto | null, previewUrl: string | null) => {
    setPhoto(nextPhoto);
    setPhotoPreviewUrl(previewUrl);
  };

  const handleSubmit = async () => {
    if (!location || !photo || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const record = await saveReport({ category, note, location, photo });
      setCategory(null);
      setNote("");
      setLocation(null);
      handlePhotoChange(null, null);
      setStep(1);
      setSubmittedId(record.id);
      window.scrollTo({ top: 0 });
      void syncPendingReports();
      ingestPendingFieldReports().catch((error) => console.error("Control room bridge could not ingest the report", error));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const startNewReport = () => {
    focusHeadingRef.current = true;
    setSubmittedId(null);
    setStep(1);
    window.scrollTo({ top: 0 });
  };

  const blockedReason =
    step === 2 && !location ? copy.nav.needLocation : step === 3 && !photo ? copy.nav.needPhoto : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-8 sm:px-6 md:pt-12">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{copy.page.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-primary-container sm:text-3xl">
          {copy.page.title}
        </h1>
        {!submittedId && <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{copy.page.intro}</p>}
      </div>

      <FieldConnectivityNotice />

      {submittedId ? (
        <SubmissionResult reportId={submittedId} onReportAnother={startNewReport} />
      ) : (
        <section
          aria-labelledby="report-step-heading"
          className="mt-4 rounded-lg border border-outline-variant/60 bg-surface-container-lowest"
        >
          <div className="border-b border-outline-variant/40 px-5 py-4 sm:px-7">
            <ReportStepper current={step} />
          </div>

          <div className="px-5 py-6 sm:px-7">
            <h2
              id="report-step-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-bold text-primary-container focus-visible:outline-none sm:text-xl"
            >
              {copy.steps.names[step - 1]}
            </h2>
            <div className="mt-5">
              {step === 1 && (
                <ObservationStep
                  category={category}
                  note={note}
                  onCategoryChange={setCategory}
                  onNoteChange={setNote}
                />
              )}
              {step === 2 && <LocationStep location={location} onLocationChange={setLocation} />}
              {step === 3 && (
                <>
                  <PhotoStep photo={photo} previewUrl={photoPreviewUrl} onPhotoChange={handlePhotoChange} />
                  <p className="mt-5 border-t border-outline-variant/40 pt-4 text-xs leading-relaxed text-on-surface-variant">
                    {copy.nav.submitNote}
                  </p>
                  {saveError && (
                    <div className="mt-4">
                      <FieldNotice tone="error" title={copy.nav.saveErrorTitle}>
                        {saveError}
                      </FieldNotice>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="border-t border-outline-variant/40 bg-surface-container-low px-5 py-4 sm:px-7">
            {blockedReason && (
              <p id="continue-blocked" className="mb-3 text-xs text-on-surface-variant sm:text-right">
                {blockedReason}
              </p>
            )}
            <div className="flex items-center gap-3">
              {step === 1 ? (
                <Link href={routes.home} className={secondaryButtonClass}>
                  {copy.nav.cancel}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => goToStep((step - 1) as StepNumber)}
                  className={secondaryButtonClass}
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  {copy.nav.back}
                </button>
              )}
              {step < finalStep ? (
                <button
                  type="button"
                  disabled={blockedReason !== null}
                  aria-describedby={blockedReason ? "continue-blocked" : undefined}
                  onClick={() => goToStep((step + 1) as StepNumber)}
                  className={`${primaryButtonClass} flex-1 sm:ml-auto sm:flex-none`}
                >
                  {copy.nav.continue}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={blockedReason !== null || isSaving}
                  aria-describedby={blockedReason ? "continue-blocked" : undefined}
                  onClick={() => void handleSubmit()}
                  className={`${primaryButtonClass} flex-1 sm:ml-auto sm:flex-none`}
                >
                  <Send aria-hidden="true" className="size-4" />
                  {isSaving ? copy.nav.saving : copy.nav.submit}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <DeviceReportsPanel highlightId={submittedId} />
    </div>
  );
}
