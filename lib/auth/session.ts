import { useSyncExternalStore } from "react";
import type { Actor, ActorRole } from "@/lib/scenario/types";

export type PortalRole = Extract<ActorRole, "OPERATOR" | "AUTHORITY">;

export type PortalSession = { name: string; role: PortalRole; signedInAt: number };

const storageKey = "nirnyay.portalSession";
const changeEvent = "nirnyay:portal-session";
let cached: { raw: string | null; session: PortalSession | null } = { raw: null, session: null };

export const roleLabels: Record<PortalRole, string> = {
  OPERATOR: "Control-room operator",
  AUTHORITY: "Approving authority",
};

export const roleDescriptions: Record<PortalRole, string> = {
  OPERATOR: "Reviews evidence, verifies incidents, applies network state and prepares recommendations.",
  AUTHORITY: "Everything an operator can do, plus approve, reject or send back recommendations.",
};

function parse(raw: string | null): PortalSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PortalSession>;
    if (typeof value.name !== "string" || (value.role !== "OPERATOR" && value.role !== "AUTHORITY")) return null;
    return { name: value.name, role: value.role, signedInAt: typeof value.signedInAt === "number" ? value.signedInAt : 0 };
  } catch {
    return null;
  }
}

export function readSession(): PortalSession | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(storageKey);
  } catch {
    raw = null;
  }
  if (raw !== cached.raw) cached = { raw, session: parse(raw) };
  return cached.session;
}

export function signIn(name: string, role: PortalRole): void {
  const session: PortalSession = { name: name.trim(), role, signedInAt: Date.now() };
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(session));
  } catch (error) {
    console.warn("Session could not be stored", error);
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function signOut(): void {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {}
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const loading = Symbol("loading");

export function useSession(): PortalSession | null | undefined {
  const value = useSyncExternalStore<PortalSession | null | typeof loading>(subscribe, readSession, () => loading);
  return value === loading ? undefined : value;
}

export function sessionActor(session: PortalSession): Actor {
  return { name: session.name, role: session.role };
}

export function canApprove(session: PortalSession | null | undefined): boolean {
  return session?.role === "AUTHORITY";
}
