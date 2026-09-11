import type { Metadata } from "next";
import { MonitoringPage } from "@/components/portal/pages/MonitoringPage";

export const metadata: Metadata = { title: "Monitoring" };

export default function Page() {
  return <MonitoringPage />;
}
