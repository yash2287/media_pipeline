import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">Not found</div>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Project or route missing</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">The requested record does not exist in the current workspace.</p>
        <div className="mt-6">
          <Link href="/projects">
            <Button>Back to projects</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

