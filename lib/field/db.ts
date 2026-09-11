import Dexie, { type EntityTable } from "dexie";
import type { FieldReportRecord } from "@/lib/field/types";

export const fieldDb = new Dexie("nirnyay-field") as Dexie & {
  reports: EntityTable<FieldReportRecord, "id">;
};

fieldDb.version(1).stores({
  reports: "id, status, submittedAt",
});
