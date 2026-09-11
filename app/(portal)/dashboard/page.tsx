import type { Metadata } from "next";
import { Dashboard } from "@/components/portal/pages/Dashboard";

export const metadata: Metadata = { title: "Command Center" };

export default function DashboardPage() {
  return <Dashboard />;
}
