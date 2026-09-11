export const incidentCategories = ["landslide", "flooding", "road-damage", "bridge", "blockage", "other"] as const;

export type IncidentCategory = (typeof incidentCategories)[number];

export type LocationFix = {
  latitude: number;
  longitude: number;
  accuracyM: number;
  fixedAt: string;
};

export type PreparedPhoto = {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  originalByteSize: number;
  fileModifiedAt: string | null;
};

export type ReportStatus = "queued" | "syncing" | "synced" | "failed";

export type SyncErrorKind = "not-configured" | "network" | "timeout" | "server" | "rejected";

export type SyncErrorInfo = {
  kind: SyncErrorKind;
  httpStatus: number | null;
  message: string;
  retryable: boolean;
  occurredAt: string;
};

export type ServerReceipt = {
  serverId: string | null;
  receivedAt: string | null;
};

export type FieldReportRecord = {
  id: string;
  reference: string;
  submittedAt: string;
  category: IncidentCategory | null;
  note: string | null;
  location: LocationFix;
  photo: PreparedPhoto;
  status: ReportStatus;
  attempts: number;
  lastAttemptAt: string | null;
  nextAttemptAt: number;
  lastError: SyncErrorInfo | null;
  syncedAt: string | null;
  receipt: ServerReceipt | null;
};
