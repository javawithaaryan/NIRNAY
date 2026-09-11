import { useSyncExternalStore } from "react";

export type ConnectivityState = "checking" | "online" | "weak" | "offline";

type NetworkInformationLike = EventTarget & { effectiveType?: string };

function getConnection(): NetworkInformationLike | undefined {
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

function readConnectivity(): ConnectivityState {
  if (!navigator.onLine) return "offline";
  const effectiveType = getConnection()?.effectiveType;
  return effectiveType === "slow-2g" || effectiveType === "2g" ? "weak" : "online";
}

function subscribe(onChange: () => void): () => void {
  const connection = getConnection();
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  connection?.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
    connection?.removeEventListener("change", onChange);
  };
}

export function useConnectivity(): ConnectivityState {
  return useSyncExternalStore(subscribe, readConnectivity, () => "checking");
}
