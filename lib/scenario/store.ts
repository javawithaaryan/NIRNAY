import Dexie, { type EntityTable } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { reduceEvents, type PortalEvent, type PortalState } from "@/lib/scenario/events";

type MetaRow = { key: string; value: string };

export const portalDb = new Dexie("nirnyay-portal") as Dexie & {
  events: EntityTable<PortalEvent, "seq">;
  meta: EntityTable<MetaRow, "key">;
};

portalDb.version(1).stores({
  events: "++seq, id, at",
  meta: "key",
});

export async function loadState(): Promise<PortalState> {
  const events = await portalDb.events.orderBy("seq").toArray();
  return reduceEvents(events);
}

export async function appendEvents(events: PortalEvent[]): Promise<void> {
  if (events.length === 0) return;
  await portalDb.events.bulkAdd(
    events.map((event) => {
      const copy = { ...event };
      delete copy.seq;
      return copy;
    }),
  );
}

export async function resetPortal(): Promise<void> {
  await portalDb.transaction("rw", portalDb.events, portalDb.meta, async () => {
    await portalDb.events.clear();
    await portalDb.meta.clear();
  });
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await portalDb.meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await portalDb.meta.put({ key, value });
}

export function usePortalEvents(): PortalEvent[] | undefined {
  return useLiveQuery(() => portalDb.events.orderBy("seq").toArray(), []);
}

export function usePortalState(): PortalState | undefined {
  const events = usePortalEvents();
  return useMemo(() => (events ? reduceEvents(events) : undefined), [events]);
}

export function useMeta(key: string): string | null | undefined {
  return useLiveQuery(async () => (await portalDb.meta.get(key))?.value ?? null, [key]);
}
