"use client";

import { useSyncExternalStore } from "react";

const demoModeKey = "nirnyay.demoMode";
const changeEvent = "nirnyay:demo-mode";

function read(): boolean {
  try {
    return window.sessionStorage.getItem(demoModeKey) === "1";
  } catch {
    return false;
  }
}

function write(enabled: boolean) {
  try {
    if (enabled) window.sessionStorage.setItem(demoModeKey, "1");
    else window.sessionStorage.removeItem(demoModeKey);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(changeEvent, onChange);
  return () => window.removeEventListener(changeEvent, onChange);
}

export function useDemoMode(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

export const enableDemoMode = () => write(true);
export const disableDemoMode = () => write(false);
