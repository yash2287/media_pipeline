"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ProjectAutoRefreshProps = {
  active: boolean;
  intervalMs?: number;
};

export function ProjectAutoRefresh({ active, intervalMs = 3000 }: ProjectAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [active, intervalMs, router]);

  return null;
}
