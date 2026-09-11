import type { Metadata } from "next";
import { IncidentReport } from "@/components/portal/pages/IncidentReport";

export const metadata: Metadata = { title: "Incident report" };

export default async function IncidentReportPage(props: PageProps<"/incidents/[id]/report">) {
  const { id } = await props.params;
  return <IncidentReport id={id} />;
}
