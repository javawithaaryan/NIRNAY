import { fieldDb } from "@/lib/field/db";
import { reportTransport, SyncError, type FieldReportTransport } from "@/lib/field/transport";
import type { FieldReportRecord, SyncErrorInfo } from "@/lib/field/types";

const lockName = "nirnyay-field-sync";
const maxRetryDelayMs = 5 * 60000;

let activeRun: Promise<void> | null = null;
let rerunRequested = false;

function retryDelayMs(attempts: number): number {
  return Math.min(maxRetryDelayMs, 5000 * 2 ** Math.max(0, attempts - 1));
}

function toSyncError(error: unknown): SyncError {
  if (error instanceof SyncError) return error;
  return new SyncError("network", {
    retryable: true,
    message: error instanceof Error ? error.message : String(error),
  });
}

async function syncReport(report: FieldReportRecord, transport: FieldReportTransport): Promise<SyncError | null> {
  const attempts = report.attempts + 1;
  await fieldDb.reports.update(report.id, {
    status: "syncing",
    attempts,
    lastAttemptAt: new Date().toISOString(),
  });
  try {
    const receipt = await transport.submit(report);
    await fieldDb.reports.update(report.id, {
      status: "synced",
      syncedAt: new Date().toISOString(),
      receipt,
      lastError: null,
      nextAttemptAt: 0,
    });
    return null;
  } catch (error) {
    const syncError = toSyncError(error);
    const errorInfo: SyncErrorInfo = {
      kind: syncError.kind,
      httpStatus: syncError.httpStatus,
      message: syncError.message,
      retryable: syncError.retryable,
      occurredAt: new Date().toISOString(),
    };
    await fieldDb.reports.update(report.id, {
      status: "failed",
      lastError: errorInfo,
      nextAttemptAt: syncError.retryable ? Date.now() + retryDelayMs(attempts) : Number.MAX_SAFE_INTEGER,
    });
    return syncError;
  }
}

async function runSync(transport: FieldReportTransport): Promise<void> {
  const now = Date.now();
  const dueReports = await fieldDb.reports
    .where("status")
    .anyOf("queued", "failed")
    .filter((report) => report.nextAttemptAt <= now)
    .sortBy("submittedAt");
  for (const report of dueReports) {
    if (!navigator.onLine) return;
    const error = await syncReport(report, transport);
    if (error && (error.kind === "network" || error.kind === "timeout")) return;
  }
}

async function runWithLock(transport: FieldReportTransport): Promise<void> {
  if (navigator.locks?.request) {
    await navigator.locks.request(lockName, { ifAvailable: true }, async (lock) => {
      if (lock) await runSync(transport);
    });
    return;
  }
  await runSync(transport);
}

export function syncPendingReports(transport: FieldReportTransport = reportTransport): Promise<void> {
  if (!transport.configured || !navigator.onLine) return Promise.resolve();
  if (activeRun) {
    rerunRequested = true;
    return activeRun;
  }
  const run = async () => {
    try {
      do {
        rerunRequested = false;
        await runWithLock(transport);
      } while (rerunRequested && navigator.onLine);
    } catch (error) {
      console.error("Field report synchronization failed", error);
    } finally {
      activeRun = null;
    }
  };
  activeRun = run();
  return activeRun;
}
