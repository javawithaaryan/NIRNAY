import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata: Metadata = {
  title: { default: "Officer / Control Portal", template: "%s · NIRNYAY Operations" },
};

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
