"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  Activity,
  ClipboardCheck,
  FileCheck,
  Gavel,
  LayoutDashboard,
  LogOut,
  Radar,
  Route,
  ScrollText,
  Stamp,
  TriangleAlert,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { AboutDemoDialog } from "@/components/portal/AboutDemoDialog";
import { ControlRoomBridge, NewIncidentBanner } from "@/components/portal/ControlRoomBridge";
import { PresenterBar } from "@/components/portal/PresenterBar";
import { ConnectivityStatus } from "@/components/site/ConnectivityStatus";
import { HelpdeskDialog } from "@/components/site/HelpdeskDialog";
import { TextSizeControls } from "@/components/site/TextSizeControls";
import { roleLabels, signOut, useSession } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { scenarioMeta } from "@/lib/scenario/seed/nh29";
import { usePortalView } from "@/components/portal/usePortalView";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };
type NavGroup = { title: string; items: NavItem[] };

export function PortalShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const view = usePortalView();

  useEffect(() => {
    if (session === null) router.replace(`${routes.officerLogin}?next=${encodeURIComponent(pathname)}`);
  }, [session, router, pathname]);

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-on-surface-variant" role="status">
        {session === undefined ? "Checking prototype session…" : "Redirecting to sign-in…"}
      </div>
    );
  }

  const pendingApprovals = view?.summary.pendingApprovals ?? 0;
  const awaitingVerification = view?.incidents.filter((item) => !item.incident.verifiedAt && !item.incident.rejectedAt).length ?? 0;
  const groups: NavGroup[] = [
    { title: "Overview", items: [{ href: "/dashboard", label: "Command Center", icon: LayoutDashboard }] },
    {
      title: "Operations",
      items: [
        { href: "/incidents", label: "Incidents & evidence", icon: TriangleAlert, badge: awaitingVerification },
        { href: "/missions", label: "Missions", icon: Truck },
        { href: "/network", label: "Network", icon: Radar },
        { href: "/routes", label: "Routes", icon: Route },
      ],
    },
    {
      title: "Decisions",
      items: [
        { href: "/decisions", label: "Decisions", icon: FileCheck },
        { href: "/approvals", label: "Approvals", icon: Stamp, badge: pendingApprovals },
        { href: "/monitoring", label: "Monitoring", icon: Activity },
      ],
    },
    { title: "System", items: [{ href: "/audit", label: "Audit trail", icon: ScrollText }] },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-40 border-b border-outline-variant/40 bg-surface-container-lowest shadow-xs">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5 rounded-xs">
              <span className="flex size-9 items-center justify-center rounded-xs bg-primary-container text-lg font-black text-on-primary">
                N
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-lg font-black tracking-tight text-primary-container">NIRNYAY</span>
                <span className="mt-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-on-surface-variant">
                  Operations · Officer / Control Portal
                </span>
              </span>
            </Link>
            <span className="hidden h-8 w-px bg-outline-variant/60 lg:block" />
            <div className="hidden min-w-0 items-center gap-2 rounded-xs border border-outline-variant/40 bg-surface-container-low px-3 py-1.5 text-xs lg:flex">
              <ClipboardCheck aria-hidden="true" className="size-4 shrink-0 text-secondary" />
              <span className="font-semibold uppercase tracking-wide text-on-surface-variant">Corridor</span>
              <span className="truncate font-bold text-primary-container">{scenarioMeta.corridor}</span>
            </div>
            <AboutDemoDialog />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <TextSizeControls />
            <HelpdeskDialog />
            <ConnectivityStatus />
            <div className="hidden items-center gap-2 border-l border-outline-variant/60 pl-3 md:flex">
              <span className="flex size-8 items-center justify-center rounded-xs bg-primary-container text-xs font-bold text-on-primary">
                {initials(session.name)}
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-xs font-bold text-primary-container">{session.name}</span>
                <span className="text-[0.6875rem] text-on-surface-variant">{roleLabels[session.role]} · prototype sign-in</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                signOut();
                router.push(routes.home);
              }}
              className="inline-flex items-center gap-1 rounded-xs px-2 py-1 text-xs font-medium text-secondary transition-colors hover:bg-surface-container-low hover:text-primary-container"
            >
              <LogOut aria-hidden="true" className="size-4" />
              <span className="sr-only md:not-sr-only">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-outline-variant/40 bg-surface-container-lowest py-5 lg:flex">
          <nav aria-label="Portal sections" className="space-y-5">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="mb-1.5 px-5 text-[0.6875rem] font-bold uppercase tracking-wider text-outline">{group.title}</p>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        className={`flex items-center justify-between gap-3 border-l-4 px-4 py-2 text-sm transition-colors ${
                          isActive(item.href)
                            ? "border-secondary bg-secondary-container/30 font-semibold text-primary-container"
                            : "border-transparent font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <item.icon aria-hidden="true" className="size-5" />
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded-full bg-error px-2 py-0.5 text-[0.6875rem] font-bold text-on-primary">{item.badge}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="mt-auto px-5 pt-5 text-[0.6875rem] leading-relaxed text-on-surface-variant">
            <p className="font-semibold text-primary-container">Decision logic runs in this browser.</p>
            <p>State is stored locally (IndexedDB). No server, identity system or government feed is connected in this Round-1 prototype.</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <nav aria-label="Portal sections" className="border-b border-outline-variant/40 bg-surface-container-lowest lg:hidden">
            <ul className="flex gap-1 overflow-x-auto px-3 py-2">
              {groups.flatMap((group) => group.items).map((item) => (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-xs font-semibold ${
                      isActive(item.href) ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    <item.icon aria-hidden="true" className="size-4" />
                    {item.label}
                    {item.badge ? <span className="rounded-full bg-error px-1.5 text-[0.625rem] text-on-primary">{item.badge}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <main id="main-content" className="flex-1 space-y-6 p-4 pb-20 sm:p-6 sm:pb-20">
            {view && <NewIncidentBanner view={view} />}
            {children}
          </main>
        </div>
      </div>

      <PresenterBar />
      <ControlRoomBridge startedAt={view?.startedAt ?? null} />
      <span className="sr-only">
        <Gavel aria-hidden="true" />
      </span>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
