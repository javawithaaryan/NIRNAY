"use client";

import { useMemo, useSyncExternalStore } from "react";
import { usePortalState } from "@/lib/scenario/store";
import { buildView, type PortalView } from "@/lib/scenario/view";

const tickMs = 30_000;
let currentTick = Date.now();
const listeners = new Set<() => void>();
let timer: number | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    timer = window.setInterval(() => {
      currentTick = Date.now();
      listeners.forEach((item) => item());
    }, tickMs);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

function readTick(): number {
  return currentTick;
}

export function usePortalView(): PortalView | undefined {
  const state = usePortalState();
  const now = useSyncExternalStore(subscribe, readTick, readTick);
  return useMemo(() => (state ? buildView(state, Math.max(now, state.events.at(-1)?.at ?? 0)) : undefined), [state, now]);
}
