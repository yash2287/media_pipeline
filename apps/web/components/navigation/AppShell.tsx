"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, ImageIcon, LayoutTemplate, PackageCheck, PanelsTopLeft, Palette, Rocket, ShieldEllipsis } from "lucide-react";
import { hasSupabaseEnv } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/projects/new", label: "New Project", icon: Rocket },
  { href: "/brands", label: "Brands", icon: Palette },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/library", label: "Library", icon: ImageIcon },
];

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
    <div className="app-shell min-h-screen">
      <aside className="border-r border-[var(--line)] bg-white px-4 py-5">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">
              <PanelsTopLeft className="h-4 w-4" />
              Tinkerbrains Studio
            </div>
            <h1 className="mt-2 text-lg font-semibold text-[var(--foreground)]">Product Image Pipeline</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Internal operator console for 72-hour client packs.</p>
          </div>
        </div>

        <nav className="mt-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-[var(--purple-soft)] text-[var(--purple)]" : "text-[var(--foreground)] hover:bg-stone-100",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--teal-soft)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
            <PackageCheck className="h-4 w-4" />
            Wedge Offer
          </div>
          <div className="px-3 py-3 text-sm text-[var(--foreground)]">
            Marketplace Launch Pack
            <div className="mt-1 text-xs text-[var(--muted)]">20 SKUs to Amazon, Etsy, Shopify-ready image sets.</div>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-dashed border-[var(--line)] px-3 py-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-[var(--foreground)]">
            <ShieldEllipsis className="h-4 w-4 text-[var(--amber)]" />
            {liveMode ? "Live mode" : "Configuration missing"}
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {liveMode
              ? "Supabase and storage are configured."
              : "Required environment variables are missing. Real operator flows are disabled until Supabase is configured."}
          </p>
        </div>

        <div className="mt-auto pt-6">
          <div className="rounded-md border border-[var(--line)] px-3 py-3 text-sm text-[var(--muted)]">{userEmail ?? "Authenticated operator required"}</div>
          {onSignOut ? (
            <form action={onSignOut} className="mt-3">
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          ) : null}
        </div>
      </aside>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
