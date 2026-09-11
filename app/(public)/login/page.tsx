import type { Metadata } from "next";
import { Suspense } from "react";
import { OfficerLoginForm } from "@/components/site/OfficerLoginForm";

export const metadata: Metadata = {
  title: "Officer / Control Portal",
};

export default function OfficerLoginPage() {
  return (
    <Suspense fallback={null}>
      <OfficerLoginForm />
    </Suspense>
  );
}
