"use client";

import { useState } from "react";
import { ExternalLink, LoaderCircle, LocateFixed, MapPin, RotateCcw } from "lucide-react";
import { FieldNotice } from "@/components/field/FieldNotice";
import { fillTemplate, formatCoordinate, formatDateTime, formatWholeNumber } from "@/lib/field/format";
import { captureLocation, LocationError, lowAccuracyThresholdM, type LocationErrorCode } from "@/lib/field/geolocation";
import type { LocationFix } from "@/lib/field/types";
import { useFieldReportCopy } from "@/lib/i18n/fieldReportCopy";
import { primaryButtonClass, secondaryButtonClass, textButtonClass } from "@/lib/ui/buttonStyles";

type LocationStepProps = {
  location: LocationFix | null;
  onLocationChange: (location: LocationFix) => void;
};

export function LocationStep({ location, onLocationChange }: LocationStepProps) {
  const copy = useFieldReportCopy();
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorCode, setErrorCode] = useState<LocationErrorCode | null>(null);

  const capture = async () => {
    setIsCapturing(true);
    setErrorCode(null);
    try {
      onLocationChange(await captureLocation());
    } catch (error) {
      setErrorCode(error instanceof LocationError ? error.code : "position-unavailable");
    } finally {
      setIsCapturing(false);
    }
  };

  const canRetry = errorCode !== "unsupported" && errorCode !== "insecure-context";
  const mapUrl = location
    ? `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=17/${location.latitude}/${location.longitude}`
    : null;

  return (
    <div className="space-y-5">
      <FieldNotice tone="info">{copy.location.intro}</FieldNotice>

      {location && (
        <div className="rounded-lg border border-success-outline bg-success-container/60 p-4">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-success">
            <MapPin aria-hidden="true" className="size-4" />
            {copy.location.captured}
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 text-sm min-[420px]:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{copy.location.latitude}</dt>
              <dd className="font-mono font-semibold text-on-surface">
                {formatCoordinate(location.latitude, copy.location.north, copy.location.south)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{copy.location.longitude}</dt>
              <dd className="font-mono font-semibold text-on-surface">
                {formatCoordinate(location.longitude, copy.location.east, copy.location.west)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{copy.location.accuracy}</dt>
              <dd className="font-semibold text-on-surface">
                {fillTemplate(copy.location.accuracyValue, { meters: formatWholeNumber(location.accuracyM, copy.locale) })}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{copy.location.fixTime}</dt>
              <dd className="text-on-surface">{formatDateTime(location.fixedAt, copy.locale)}</dd>
            </div>
          </dl>
          {location.accuracyM > lowAccuracyThresholdM && (
            <p className="mt-3 text-xs font-medium text-warning">{copy.location.lowAccuracy}</p>
          )}
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={`${textButtonClass} mt-2 -ml-1.5`}>
              <ExternalLink aria-hidden="true" className="size-4" />
              {copy.location.viewOnMap}
            </a>
          )}
        </div>
      )}

      {isCapturing ? (
        <div role="status" className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary-container">
            <LoaderCircle aria-hidden="true" className="size-5 motion-safe:animate-spin" />
            {copy.location.capturing}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">{copy.location.capturingHint}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void capture()}
          className={location ? secondaryButtonClass : `${primaryButtonClass} w-full py-3.5`}
        >
          <LocateFixed aria-hidden="true" className="size-5" />
          {location ? copy.location.recapture : copy.location.capture}
        </button>
      )}

      {errorCode && (
        <FieldNotice
          tone="error"
          title={copy.location.errors[errorCode].title}
          action={
            canRetry && !isCapturing ? (
              <button type="button" onClick={() => void capture()} className={secondaryButtonClass}>
                <RotateCcw aria-hidden="true" className="size-4" />
                {copy.location.retry}
              </button>
            ) : undefined
          }
        >
          {copy.location.errors[errorCode].body}
        </FieldNotice>
      )}
    </div>
  );
}
