import { Sparkles } from "lucide-react";
import { requestMagicLinkAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const traits = [
  "Intake to delivery in hours",
  "Eight-stage agentic pipeline",
  "Marketplace · Social · Premium · Catalog",
];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-[var(--ink)] text-white lg:flex lg:flex-col lg:justify-between p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 400px at 110% -10%, rgba(99,84,255,0.45), transparent 60%), radial-gradient(600px 400px at -10% 110%, rgba(20,184,166,0.25), transparent 60%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] grid-bg" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-white/10 text-white ring-1 ring-white/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.005em]">Tinkerbrains</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">
                Creative pipeline
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Operator console
          </div>
          <h1 className="display mt-3 max-w-md text-[40px] font-semibold leading-[1.05]">
            Agentic automation for client product imagery.
          </h1>
          <ul className="mt-8 space-y-2.5">
            {traits.map((t) => (
              <li key={t} className="flex items-center gap-2 text-[13.5px] text-white/80">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/60" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[11px] uppercase tracking-[0.18em] text-white/40">
          v1 · single-tenant · supabase × trigger.dev
        </div>
      </aside>

      {/* Form panel */}
      <section className="relative flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-6 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--ink)] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-[13px] font-semibold">Tinkerbrains</div>
          </div>

          <div className="eyebrow">Magic link auth</div>
          <h2 className="display mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
            Sign in
          </h2>
          <p className="mt-2 text-[13.5px] leading-6 text-[var(--ink-3)]">
            Internal operator access. If Supabase isn&apos;t configured, submitting opens the demo console.
          </p>

          <form action={requestMagicLinkAction} className="mt-7 space-y-3.5">
            <div>
              <Label htmlFor="email">Operator email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="you@tinkerbrains.studio"
                required
              />
            </div>
            <Button type="submit" variant="accent" size="lg" className="w-full">
              Send magic link
            </Button>
          </form>

          <p className="mt-8 text-[11.5px] leading-5 text-[var(--muted)]">
            By signing in you acknowledge this is an internal automation tool. Generated creatives are
            stored in Supabase Storage with signed URLs.
          </p>
        </div>
      </section>
    </main>
  );
}
