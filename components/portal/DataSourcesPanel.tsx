"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Database } from "lucide-react";
import { fieldDb } from "@/lib/field/db";
import type { PortalState } from "@/lib/scenario/events";
import { formatClock, formatStamp } from "@/lib/scenario/format";
import type { EvidenceKind } from "@/lib/scenario/types";

type SachetStatus =
  | { ok: true; fetchedAt: string; total: number; northEast: number; nagaland: number; latest: { title: string; source: string; publishedAt: string }[] }
  | { ok: false; fetchedAt: string; error: string };

const labelTone: Record<string, string> = {
  LIVE: "border-success-outline bg-success-container text-success",
  "OFFICIAL · LIVE": "border-success-outline bg-success-container text-success",
  "FIELD DATA": "border-success-outline bg-success-container text-success",
  "SIMULATED / DEMO DATA": "border-outline-variant bg-surface-container text-on-surface-variant",
  "HISTORICAL CONTEXT": "border-outline-variant bg-surface-container text-on-surface-variant",
  "NIRNYAY STATE": "border-primary-container/30 bg-surface-container-low text-primary-container",
};

function Label({ text }: { text: string }) {
  return <span className={`rounded-xs border px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider ${labelTone[text] ?? labelTone["SIMULATED / DEMO DATA"]}`}>{text}</span>;
}

export function DataSourcesPanel({ state }: { state: PortalState }) {
  const [sachet, setSachet] = useState<SachetStatus | null>(null);
  const fieldStats = useLiveQuery(async () => {
    try {
      const reports = await fieldDb.reports.orderBy("submittedAt").toArray();
      return { count: reports.length, latest: reports.at(-1)?.submittedAt ?? null };
    } catch {
      return { count: 0, latest: null };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/sources/sachet", { cache: "no-store" });
        const data = (await response.json()) as SachetStatus;
        if (!cancelled) setSachet(data);
      } catch (error) {
        if (!cancelled) setSachet({ ok: false, fetchedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const lastEvidence = (kind: EvidenceKind) => state.evidence.filter((item) => item.kind === kind).at(-1)?.capturedAt ?? null;
  const networkChanges = state.events.filter((event) => event.payload.type === "segment.state_changed");
  const rows = [
    {
      name: "Field reports",
      label: "LIVE",
      sub: "local device (IndexedDB)",
      updated: fieldStats?.latest ? Date.parse(fieldStats.latest) : null,
      status: `${fieldStats?.count ?? 0} report${fieldStats?.count === 1 ? "" : "s"} on this device`,
      contribution: "Primary evidence + nearby corroboration",
    },
    {
      name: "Weather",
      label: "SIMULATED / DEMO DATA",
      sub: "IMD",
      updated: lastEvidence("WEATHER"),
      status: "IMD APIs require IP whitelisting — not connected in this prototype",
      contribution: "Context consistency (K)",
    },
    sachet?.ok
      ? {
          name: "Disaster alerts",
          label: "OFFICIAL · LIVE",
          sub: "SACHET (NDMA) CAP feed · live fetch",
          updated: Date.parse(sachet.fetchedAt),
          status: `${sachet.total} active alerts in India · ${sachet.northEast} in the North East · ${sachet.nagaland} for Nagaland${sachet.latest[0] ? ` · latest: ${sachet.latest[0].title.slice(0, 90)}…` : ""}`,
          contribution: "Live regional context. The reconstructed incident's institutional evidence stays SIMULATED — the 2024 event is not in today's feed.",
        }
      : {
          name: "Disaster alerts",
          label: "SIMULATED / DEMO DATA",
          sub: "SACHET (NDMA)",
          updated: lastEvidence("INSTITUTIONAL"),
          status: sachet ? `Official feed unreachable (${sachet.ok ? "" : sachet.error}) — using simulated alert` : "Checking the official SACHET feed…",
          contribution: "Institutional context (C, K)",
        },
    { name: "Logistics signals", label: "SIMULATED / DEMO DATA", sub: "transport operator status", updated: lastEvidence("LOGISTICS"), status: "No operator API connected", contribution: "Operational signal (C, K)" },
    { name: "Historical context", label: "HISTORICAL CONTEXT", sub: "NIRNYAY scenario record", updated: lastEvidence("HISTORICAL"), status: "Seeded corridor vulnerability record", contribution: "Background (K)" },
    {
      name: "Road network",
      label: "NIRNYAY STATE",
      sub: "segment states + verification age",
      updated: networkChanges.at(-1)?.at ?? state.startedAt,
      status: `${networkChanges.length} verified change${networkChanges.length === 1 ? "" : "s"} this run`,
      contribution: "Feasibility input — UNKNOWN ≠ OPEN, STALE ≠ CURRENT",
    },
  ];

  return (
    <details data-sources-panel className="group rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-container">
          <Database aria-hidden="true" className="size-4" />
          Data sources
        </span>
        <span className="text-[0.6875rem] text-on-surface-variant">{sachet?.ok ? "SACHET live · others labelled" : "labelled by origin"} ▾</span>
      </summary>
      <ul className="divide-y divide-outline-variant/40 border-t border-outline-variant/40">
        {rows.map((row) => (
          <li key={row.name} data-source={row.name} data-source-label={row.label} className="space-y-0.5 px-3 py-2 text-[0.6875rem]">
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-primary-container">{row.name}</span>
              <Label text={row.label} />
            </p>
            <p className="text-on-surface-variant">
              {row.sub} · last updated {row.updated ? `${formatStamp(row.updated)}` : "—"}
            </p>
            <p className="text-on-surface">{row.status}</p>
            <p className="text-on-surface-variant">Contribution: {row.contribution}</p>
          </li>
        ))}
      </ul>
      <p className="border-t border-outline-variant/40 px-3 py-2 text-[0.625rem] text-outline">{sachet ? `Official feed checked ${formatClock(Date.parse(sachet.fetchedAt))}. ` : ""}Nothing is labelled live unless it was actually fetched.</p>
    </details>
  );
}
