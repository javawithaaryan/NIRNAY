import { useSyncExternalStore } from "react";

export type DeviceStorageState = "checking" | "available" | "unavailable";

const probeDatabaseName = "nirnyay-storage-probe";
const listeners = new Set<() => void>();
let storageState: DeviceStorageState = "checking";
let probeStarted = false;

function publish(nextState: DeviceStorageState): void {
  storageState = nextState;
  listeners.forEach((listener) => listener());
}

function openProbeDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(probeDatabaseName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

async function probeDeviceStorage(): Promise<void> {
  try {
    if (typeof indexedDB === "undefined") {
      publish("unavailable");
      return;
    }
    const database = await openProbeDatabase();
    database.close();
    indexedDB.deleteDatabase(probeDatabaseName);
    publish("available");
  } catch (error) {
    console.warn("On-device storage is unavailable", error);
    publish("unavailable");
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!probeStarted) {
    probeStarted = true;
    void probeDeviceStorage();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useDeviceStorage(): DeviceStorageState {
  return useSyncExternalStore(subscribe, () => storageState, () => "checking");
}
