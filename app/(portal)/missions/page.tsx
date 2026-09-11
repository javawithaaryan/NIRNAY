import type { Metadata } from "next";
import { MissionsList } from "@/components/portal/pages/MissionsList";

export const metadata: Metadata = { title: "Missions" };

export default function MissionsPage() {
  return <MissionsList />;
}
