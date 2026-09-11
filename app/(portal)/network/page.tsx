import type { Metadata } from "next";
import { NetworkPage } from "@/components/portal/pages/NetworkPage";

export const metadata: Metadata = { title: "Network" };

export default function Page() {
  return <NetworkPage />;
}
