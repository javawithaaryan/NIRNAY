import type { Metadata } from "next";
import { MissionDetail } from "@/components/portal/pages/MissionDetail";

export const metadata: Metadata = { title: "Mission" };

export default async function MissionPage(props: PageProps<"/missions/[id]">) {
  const { id } = await props.params;
  return <MissionDetail id={id} />;
}
