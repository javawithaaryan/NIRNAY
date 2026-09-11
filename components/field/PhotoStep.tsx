"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, CircleCheck, ImagePlus, LoaderCircle, Trash } from "lucide-react";
import { FieldNotice } from "@/components/field/FieldNotice";
import { fillTemplate, formatBytes } from "@/lib/field/format";
import {
  detectCamera,
  maxPhotoMegabytes,
  PhotoError,
  preparePhoto,
  type CameraAvailability,
  type PhotoErrorCode,
} from "@/lib/field/photo";
import type { PreparedPhoto } from "@/lib/field/types";
import { useFieldReportCopy } from "@/lib/i18n/fieldReportCopy";
import { dangerTextButtonClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/buttonStyles";

type PhotoStepProps = {
  photo: PreparedPhoto | null;
  previewUrl: string | null;
  onPhotoChange: (photo: PreparedPhoto | null, previewUrl: string | null) => void;
};

export function PhotoStep({ photo, previewUrl, onPhotoChange }: PhotoStepProps) {
  const copy = useFieldReportCopy();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [errorCode, setErrorCode] = useState<PhotoErrorCode | null>(null);
  const [camera, setCamera] = useState<CameraAvailability>("unknown");

  useEffect(() => {
    let active = true;
    const probe = async () => {
      const availability = await detectCamera();
      if (active) setCamera(availability);
    };
    void probe();
    return () => {
      active = false;
    };
  }, []);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setIsPreparing(true);
    setErrorCode(null);
    try {
      const prepared = await preparePhoto(file);
      onPhotoChange(prepared, URL.createObjectURL(prepared.blob));
    } catch (error) {
      setErrorCode(error instanceof PhotoError ? error.code : "unreadable");
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-on-surface-variant">{copy.photo.intro}</p>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-photo-source="camera"
        onChange={(event) => void handleFile(event)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        hidden
        data-photo-source="device"
        onChange={(event) => void handleFile(event)}
      />

      {photo && previewUrl && (
        <figure className="overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-low">
          <div className="flex aspect-[4/3] items-center justify-center bg-surface-container-high">
            <Image
              src={previewUrl}
              alt={copy.photo.alt}
              width={photo.width}
              height={photo.height}
              className="h-full w-full object-contain"
            />
          </div>
          <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/40 bg-surface-container-lowest p-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
              <CircleCheck aria-hidden="true" className="size-4" />
              {copy.photo.attached}
            </span>
            <span className="text-xs text-on-surface-variant">
              {fillTemplate(copy.photo.details, {
                width: photo.width,
                height: photo.height,
                size: formatBytes(photo.byteSize, copy.locale),
              })}
            </span>
          </figcaption>
        </figure>
      )}

      {isPreparing && (
        <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-container">
          <LoaderCircle aria-hidden="true" className="size-5 motion-safe:animate-spin" />
          {copy.photo.preparing}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          disabled={isPreparing}
          onClick={() => cameraInputRef.current?.click()}
          className={`${photo ? secondaryButtonClass : `${primaryButtonClass} py-3.5`} sm:flex-1`}
        >
          <Camera aria-hidden="true" className="size-5" />
          {photo ? copy.photo.retake : copy.photo.take}
        </button>
        <button
          type="button"
          disabled={isPreparing}
          onClick={() => galleryInputRef.current?.click()}
          className={`${secondaryButtonClass} sm:flex-1 ${photo ? "" : "py-3.5"}`}
        >
          <ImagePlus aria-hidden="true" className="size-5" />
          {copy.photo.choose}
        </button>
        {photo && (
          <button type="button" onClick={() => onPhotoChange(null, null)} className={`${dangerTextButtonClass} self-start`}>
            <Trash aria-hidden="true" className="size-4" />
            {copy.photo.remove}
          </button>
        )}
      </div>

      {camera === "none" && !photo && <FieldNotice tone="info">{copy.photo.noCamera}</FieldNotice>}

      {errorCode && (
        <FieldNotice tone="error" title={copy.photo.errorTitle}>
          {fillTemplate(copy.photo.errors[errorCode], { max: maxPhotoMegabytes })}
        </FieldNotice>
      )}

      <p className="text-xs leading-relaxed text-on-surface-variant">{copy.photo.privacy}</p>
    </div>
  );
}
