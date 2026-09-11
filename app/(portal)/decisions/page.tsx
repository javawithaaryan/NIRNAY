import type { Metadata } from "next";
import { DecisionsPage } from "@/components/portal/pages/DecisionsPage";

export const metadata: Metadata = { title: "Decisions" };

export default function Page() {
  return <DecisionsPage />;
}
