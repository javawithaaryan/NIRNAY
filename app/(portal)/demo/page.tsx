"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { enableDemoMode } from "@/lib/demoMode";

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    enableDemoMode();
    router.replace("/dashboard");
  }, [router]);

  return <p className="text-sm text-on-surface-variant">Opening presentation mode…</p>;
}
