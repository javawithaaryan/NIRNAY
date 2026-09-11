import type { Metadata } from "next";
import { AuditPage } from "@/components/portal/pages/AuditPage";

export const metadata: Metadata = { title: "Audit trail" };

export default function Page() {
  return <AuditPage />;
}
