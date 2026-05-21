"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

type ProjectAutoRefreshProps = {
  active: boolean;
  intervalMs?: number;
};

export function ProjectAutoRefresh({ active, intervalMs = 3000 }: ProjectAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      // startTransition keeps the refresh non-blocking so it doesn't clobber
      // in-flight Link navigations (e.g. "All projects" / sidebar clicks).
      startTransition(() => {
        router.refresh();
      });
    };

    const interval = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(interval);
  }, [active, intervalMs, router]);

  return null;
}
