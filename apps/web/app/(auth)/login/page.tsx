import { Rocket } from "lucide-react";
import { requestMagicLinkAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md rounded-lg border border-[var(--line)] bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-[var(--purple)]">
          <Rocket className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.12em]">Tinkerbrains Studio</span>
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-[var(--foreground)]">Operator login</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Magic-link auth for the internal image pipeline. If Supabase isn&apos;t configured yet, submitting will open the demo operator view.
        </p>

        <form action={requestMagicLinkAction} className="mt-6 space-y-4">
          <Input type="email" name="email" placeholder="operator@tinkerbrains.studio" required />
          <Button type="submit" className="w-full">
            Send magic link
          </Button>
        </form>
      </div>
    </main>
  );
}

