import type { Metadata } from "next";
import { RoutesPage } from "@/components/portal/pages/RoutesPage";

export const metadata: Metadata = { title: "Routes" };

export default function Page() {
  return <RoutesPage />;
}
