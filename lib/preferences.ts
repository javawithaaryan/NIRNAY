import { useSyncExternalStore } from "react";
import { languageStorageKey, textScaleStorageKey } from "@/lib/preferenceKeys";

export type Language = "en" | "hi";
export type TextScale = "small" | "default" | "large";

const changeEvent = "nirnyay:preferences";
const memoryStore = new Map<string, string>();

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function writePreference(key: string, value: string): void {
  memoryStore.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn("Preference could not be persisted", error);
  }
  applyPreferencesToDocument();
  window.dispatchEvent(new Event(changeEvent));
}

export function getLanguage(): Language {
  return readPreference(languageStorageKey) === "hi" ? "hi" : "en";
}

export function getTextScale(): TextScale {
  const stored = readPreference(textScaleStorageKey);
  return stored === "small" || stored === "large" ? stored : "default";
}

export function setLanguage(language: Language): void {
  writePreference(languageStorageKey, language);
}

export function setTextScale(textScale: TextScale): void {
  writePreference(textScaleStorageKey, textScale);
}

function applyPreferencesToDocument(): void {
  const root = document.documentElement;
  root.lang = getLanguage();
  root.dataset.textScale = getTextScale();
}

function subscribe(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === languageStorageKey || event.key === textScaleStorageKey) {
      applyPreferencesToDocument();
      onChange();
    }
  };
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, () => "en");
}

export function useTextScale(): TextScale {
  return useSyncExternalStore(subscribe, getTextScale, () => "default");
}
