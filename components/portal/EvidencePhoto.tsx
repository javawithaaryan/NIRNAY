"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { fieldDb } from "@/lib/field/db";

export function EvidencePhoto({ reportId, className = "" }: { reportId: string; className?: string }) {
  const [state, setState] = useState<{ url: string; width: number; height: number } | "missing" | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let active = true;
    const load = async () => {
      try {
        const report = await fieldDb.reports.get(reportId);
        if (!active) return;
        if (!report) {
          setState("missing");
          return;
        }
        url = URL.createObjectURL(report.photo.blob);
        setState({ url, width: report.photo.width, height: report.photo.height });
      } catch {
        if (active) setState("missing");
      }
    };
    void load();
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [reportId]);

  if (state === "missing") {
    return (
      <div className={`flex items-center justify-center gap-2 bg-surface-container-high p-6 text-xs text-on-surface-variant ${className}`}>
        <ImageOff aria-hidden="true" className="size-4" />
        Photo no longer stored on this device
      </div>
    );
  }
  if (!state) {
    return <div className={`animate-pulse bg-surface-container-high ${className}`} aria-hidden="true" />;
  }
  return (
    <Image
      src={state.url}
      alt="Field photo submitted with this report"
      width={state.width}
      height={state.height}
      unoptimized
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
