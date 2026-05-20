"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  ImageIcon,
  LayoutTemplate,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  LogOut,
} from "lucide-react";
import { hasSupabaseEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof FolderKanban;
};

const groups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Workspace",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/projects/new", label: "New project", icon: Rocket },
    ],
  },
  {
    label: "Studio",
    items: [
      { href: "/brands", label: "Brands", icon: Palette },
      { href: "/templates", label: "Prompt templates", icon: LayoutTemplate },
      { href: "/library", label: "Asset library", icon: ImageIcon },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/projects") {
    return pathname === "/projects";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFromEmail(email?: string) {
  if (!email) return "OP";
  const [name] = email.split("@");
  const parts = name.replace(/[._-]+/g, " ").split(" ").filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return letters || name.slice(0, 2).toUpperCase();
}

export function AppShell({
  children,
  userEmail,
  onSignOut,
}: {
  children: React.ReactNode;
  userEmail?: string;
  onSignOut?: (formData: FormData) => Promise<void>;
}) {
  const pathname = usePathname();
  const liveMode = hasSupabaseEnv();

  return (
    <div className="app-shell">
      <aside className="relative flex min-h-screen flex-col gap-6 border-r border-[var(--line)] bg-[var(--surface)]/80 px-4 py-5 backdrop-blur-sm">
        {/* Logo lockup */}
        <Link href="/projects" className="group flex items-center gap-3 px-2">
          <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-[10px] bg-[var(--ink)] text-white shadow-[var(--shadow-sm)]">
            <Sparkles className="h-[18px] w-[18px]" strokeWidth={2.4} />
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold tracking-[-0.005em] text-[var(--ink)]">
              Tinkerbrains
            </div>
            <div className="text-[11px] text-[var(--muted)]">Creative pipeline</div>
          </div>
        </Link>

        {/* Live status chip */}
        <div className="px-1">
          <div className="flex items-center justify-between rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "relative inline-flex h-1.5 w-1.5 rounded-full",
                  liveMode ? "bg-[var(--emerald)]" : "bg-[var(--amber)]",
                )}
              >
                {liveMode && (
                  <span className="absolute inset-0 -m-1 rounded-full bg-[var(--emerald)] opacity-30 animate-ping" />
                )}
              </span>
              <span className="text-[12px] font-medium text-[var(--ink-2)]">
                {liveMode ? "Live" : "Setup pending"}
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] mono">
              v1
            </span>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex flex-col gap-5 px-1">
          {groups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                          : "text-[var(--ink-2)] hover:bg-[var(--surface-3)]",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-all",
                          active ? "bg-[var(--accent)] opacity-100" : "opacity-0",
                        )}
                      />
                      <Icon
                        className={cn(
                          "h-[15px] w-[15px] transition-colors",
                          active ? "text-[var(--accent)]" : "text-[var(--muted)] group-hover:text-[var(--ink-2)]",
                        )}
                        strokeWidth={2}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Wedge offer card */}
        <div className="relative mx-1 overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--ink)] p-4 text-white shadow-[var(--shadow-md)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full"
            style={{
              background:
                "radial-gradient(circle at center, rgba(99,84,255,0.55), transparent 60%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              <Sparkles className="h-3 w-3" />
              Wedge offer
            </div>
            <div className="mt-2 text-[14px] font-semibold leading-snug">
              Marketplace Launch Pack
            </div>
            <div className="mt-1 text-[12px] leading-5 text-white/70">
              20 SKUs · Amazon · Etsy · Shopify · 72h turnaround.
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90 mono">
              £600 flat
            </div>
          </div>
        </div>

        {/* User row */}
        <div className="mt-auto px-1">
          <div className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-semibold text-white">
              {initialsFromEmail(userEmail)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium text-[var(--ink)]">
                {userEmail ?? "Operator"}
              </div>
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                <ShieldCheck className="h-3 w-3" />
                Operator
              </div>
            </div>
            {onSignOut ? (
              <form action={onSignOut}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
                >
                  <LogOut className="h-[14px] w-[14px]" />
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
