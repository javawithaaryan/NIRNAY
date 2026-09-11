import type { FieldReportRecord, ServerReceipt, SyncErrorKind } from "@/lib/field/types";

export class SyncError extends Error {
  readonly kind: SyncErrorKind;
  readonly httpStatus: number | null;
  readonly retryable: boolean;

  constructor(kind: SyncErrorKind, options: { retryable: boolean; httpStatus?: number | null; message?: string }) {
    super(options.message ?? kind);
    this.name = "SyncError";
    this.kind = kind;
    this.retryable = options.retryable;
    this.httpStatus = options.httpStatus ?? null;
  }
}

export type FieldReportTransport = {
  readonly configured: boolean;
  readonly endpoint: string | null;
  submit(report: FieldReportRecord): Promise<ServerReceipt>;
};

const requestTimeoutMs = 30000;

function buildFormData(report: FieldReportRecord): FormData {
  const form = new FormData();
  form.append("client_event_id", report.id);
  form.append("reference", report.reference);
  form.append("reported_at", report.submittedAt);
  form.append("latitude", String(report.location.latitude));
  form.append("longitude", String(report.location.longitude));
  form.append("accuracy_m", String(report.location.accuracyM));
  form.append("location_fixed_at", report.location.fixedAt);
  if (report.category) form.append("incident_type", report.category);
  if (report.note) form.append("note", report.note);
  if (report.photo.fileModifiedAt) form.append("photo_file_modified_at", report.photo.fileModifiedAt);
  form.append("photo", report.photo.blob, `${report.reference}.jpg`);
  return form;
}

function errorForStatus(status: number): SyncError {
  if (status === 408 || status === 429 || status >= 500) {
    return new SyncError("server", { httpStatus: status, retryable: true });
  }
  return new SyncError("rejected", { httpStatus: status, retryable: false });
}

async function readReceipt(response: Response): Promise<ServerReceipt> {
  try {
    const body = (await response.json()) as { id?: unknown; received_at?: unknown };
    const serverId = typeof body.id === "string" || typeof body.id === "number" ? String(body.id) : null;
    const receivedAt = typeof body.received_at === "string" ? body.received_at : null;
    return { serverId, receivedAt };
  } catch {
    return { serverId: null, receivedAt: null };
  }
}

export function createHttpTransport(endpoint: string): FieldReportTransport {
  return {
    configured: true,
    endpoint,
    async submit(report) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: buildFormData(report),
          headers: { "Idempotency-Key": report.id },
          signal: controller.signal,
        });
        if (!response.ok) throw errorForStatus(response.status);
        return await readReceipt(response);
      } catch (error) {
        if (error instanceof SyncError) throw error;
        if (controller.signal.aborted) throw new SyncError("timeout", { retryable: true });
        throw new SyncError("network", {
          retryable: true,
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        window.clearTimeout(timer);
      }
    },
  };
}

const notConfiguredTransport: FieldReportTransport = {
  configured: false,
  endpoint: null,
  async submit() {
    throw new SyncError("not-configured", { retryable: false });
  },
};

function resolveTransport(): FieldReportTransport {
  const endpoint = process.env.NEXT_PUBLIC_FIELD_REPORT_ENDPOINT?.trim();
  return endpoint ? createHttpTransport(endpoint) : notConfiguredTransport;
}

export const reportTransport = resolveTransport();
