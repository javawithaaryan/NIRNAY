import Link from "next/link";
import type { ReactNode } from "react";
import type {
  DecisionAction,
  DecisionStatus,
  EvidenceStatus,
  Feasibility,
  ImpactLevel,
  Priority,
  RoadState,
} from "@/lib/scenario/types";

export type Tone = "neutral" | "navy" | "info" | "success" | "warning" | "danger" | "muted";

const toneClasses: Record<Tone, string> = {
  neutral: "border-outline-variant/60 bg-surface-container-low text-on-surface",
  navy: "border-primary-container bg-primary-container text-on-primary",
  info: "border-secondary/40 bg-secondary-container/40 text-on-secondary-container",
  success: "border-success-outline bg-success-container text-success",
  warning: "border-warning-outline bg-warning-container text-warning",
  danger: "border-error/40 bg-error-container text-on-error-container",
  muted: "border-outline-variant/40 bg-surface-container text-on-surface-variant",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function roadStateTone(state: RoadState): Tone {
  switch (state) {
    case "OPEN":
      return "success";
    case "RESTRICTED":
      return "info";
    case "HIGH_RISK":
      return "warning";
    case "BLOCKED":
      return "danger";
    case "STALE":
    case "UNKNOWN":
      return "muted";
  }
}

export function feasibilityTone(value: Feasibility): Tone {
  return value === "FEASIBLE" ? "success" : value === "INFEASIBLE" ? "danger" : "warning";
}

export function priorityTone(value: Priority): Tone {
  return value === "CRITICAL" ? "danger" : value === "HIGH" ? "warning" : "neutral";
}

export function impactTone(level: ImpactLevel): Tone {
  switch (level) {
    case "SEVERE":
      return "danger";
    case "HIGH":
      return "warning";
    case "MODERATE":
      return "info";
    case "LOW":
      return "neutral";
    case "NONE":
      return "success";
  }
}

export function actionTone(action: DecisionAction): Tone {
  return action === "HOLD" ? "danger" : action === "REROUTE" ? "info" : "success";
}

export function decisionStatusTone(status: DecisionStatus): Tone {
  switch (status) {
    case "APPROVED":
      return "success";
    case "RECOMMENDED":
      return "warning";
    case "VERIFICATION_REQUESTED":
      return "info";
    case "REJECTED":
      return "danger";
    case "SUPERSEDED":
      return "muted";
  }
}

export function evidenceStatusTone(status: EvidenceStatus): Tone {
  return status === "VERIFIED" ? "success" : status === "CORROBORATED" ? "info" : status === "REJECTED" ? "danger" : "warning";
}

export function labelize(value: string): string {
  return value.replace(/_/g, " ");
}

export function Card({ children, className = "", as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={`rounded-lg border border-outline-variant/60 bg-surface-container-lowest ${className}`}>{children}</Tag>;
}

export function CardHeader({ title, subtitle, actions, icon }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-low px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 text-primary-container">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary-container">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary-container sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KeyValue({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</dt>
      <dd className={`mt-0.5 break-words text-sm text-on-surface ${mono ? "font-mono" : ""}`}>{children}</dd>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-on-surface-variant">{children}</p>;
}

export function WhyList({ items, title = "Why this decision?" }: { items: string[]; title?: string }) {
  return (
    <div className="rounded-xs border border-outline-variant/40 bg-surface-container-low p-3.5">
      <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-primary-container">{title}</p>
      <ol className="mt-2 space-y-1.5 text-sm text-on-surface">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="flex gap-2">
            <span className="shrink-0 font-mono text-xs text-secondary">{String(index + 1).padStart(2, "0")}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SimulatedTag({ origin }: { origin: "FIELD" | "SIMULATED" | "SEEDED" }) {
  if (origin === "FIELD") return <Badge tone="success">Field data</Badge>;
  return <Badge tone="muted">{origin === "SIMULATED" ? "Simulated" : "Demo data"}</Badge>;
}

export function GeometryTag({ source }: { source: "REAL_OSM_DERIVED" | "DEMO_ONLY_SIMULATED" }) {
  return <Badge tone={source === "REAL_OSM_DERIVED" ? "success" : "muted"}>{source === "REAL_OSM_DERIVED" ? "Real OSM-derived" : "Demo-only simulated"}</Badge>;
}

export function LinkButton({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex items-center gap-1.5 rounded-xs bg-primary-container px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-on-primary transition-colors hover:bg-primary-container-hover"
          : "inline-flex items-center gap-1.5 rounded-xs border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-primary-container transition-colors hover:bg-surface-container-low"
      }
    >
      {children}
    </Link>
  );
}

export const portalPrimaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xs bg-primary-container px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-on-primary shadow-xs transition-colors hover:bg-primary-container-hover active:bg-primary-container-active disabled:cursor-not-allowed disabled:bg-outline-variant disabled:text-on-surface-variant disabled:shadow-none";

export const portalSecondaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xs border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-xs font-semibold text-primary-container transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60";

export const portalDangerButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xs border border-error/40 bg-error-container px-3.5 py-2 text-xs font-bold text-on-error-container transition-colors hover:bg-error hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-60";
