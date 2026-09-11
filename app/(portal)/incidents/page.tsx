import type { Metadata } from "next";
import { IncidentsList } from "@/components/portal/pages/IncidentsList";

export const metadata: Metadata = { title: "Incidents & evidence" };

export default function IncidentsPage() {
  return <IncidentsList />;
}
