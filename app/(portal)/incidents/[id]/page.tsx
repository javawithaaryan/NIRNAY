import type { Metadata } from "next";
import { IncidentDetail } from "@/components/portal/pages/IncidentDetail";

export const metadata: Metadata = { title: "Incident" };

export default async function IncidentPage(props: PageProps<"/incidents/[id]">) {
  const { id } = await props.params;
  return <IncidentDetail id={id} />;
}
