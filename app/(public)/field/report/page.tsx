import type { Metadata } from "next";
import { FieldReportFlow } from "@/components/field/FieldReportFlow";

export const metadata: Metadata = {
  title: "Report an Incident",
};

export default function FieldReportPage() {
  return <FieldReportFlow />;
}
