"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tab = { id: string; label: string; eyebrow: string };

export function WizardTabs({
  tabs,
  panels,
}: {
  tabs: Tab[];
  panels: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div className="grid gap-4">
      <div className="panel-quiet flex flex-wrap items-center gap-1 p-1.5">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                "group inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-xs)]"
                  : "text-[var(--ink-3)] hover:bg-[var(--surface)] hover:text-[var(--ink)]",
              )}
            >
              <span className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                {tab.eyebrow}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          hidden={tab.id !== active}
          className={tab.id === active ? "animate-fade-up" : undefined}
        >
          {panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
