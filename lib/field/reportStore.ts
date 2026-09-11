import { fieldDb } from "@/lib/field/db";
import { createReportIdentity } from "@/lib/field/ids";
import type { FieldReportRecord, IncidentCategory, LocationFix, PreparedPhoto } from "@/lib/field/types";

export type NewReportInput = {
  category: IncidentCategory | null;
  note: string;
  location: LocationFix;
  photo: PreparedPhoto;
};

async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch (error) {
    console.warn("Persistent storage request failed", error);
  }
}

export async function saveReport(input: NewReportInput): Promise<FieldReportRecord> {
  const submittedAt = new Date();
  const { id, reference } = createReportIdentity(submittedAt);
  const record: FieldReportRecord = {
    id,
    reference,
    submittedAt: submittedAt.toISOString(),
    category: input.category,
    note: input.note.trim() || null,
    location: input.location,
    photo: input.photo,
    status: "queued",
    attempts: 0,
    lastAttemptAt: null,
    nextAttemptAt: 0,
    lastError: null,
    syncedAt: null,
    receipt: null,
  };
  await fieldDb.reports.add(record);
  void requestPersistentStorage();
  return record;
}

export async function markForRetry(id: string): Promise<void> {
  await fieldDb.reports.update(id, { status: "queued", nextAttemptAt: 0, lastError: null });
}

export async function makePendingDueNow(): Promise<void> {
  await fieldDb.reports
    .where("status")
    .anyOf("queued", "failed")
    .filter((report) => report.status === "queued" || report.lastError?.retryable !== false)
    .modify({ nextAttemptAt: 0 });
}

export async function recoverInterruptedSyncs(staleAfterMs = 60000): Promise<void> {
  const cutoff = Date.now() - staleAfterMs;
  await fieldDb.reports
    .where("status")
    .equals("syncing")
    .filter((report) => !report.lastAttemptAt || Date.parse(report.lastAttemptAt) < cutoff)
    .modify({ status: "queued", nextAttemptAt: 0 });
}
