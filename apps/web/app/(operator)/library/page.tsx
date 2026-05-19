import { AssetGrid } from "@/components/pipeline/AssetGrid";
import { getLatestProjectDetail } from "@/lib/data";

export default async function LibraryPage() {
  const detail = await getLatestProjectDetail();

  return (
    <div className="px-6 py-6">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">Library</div>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Past work</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Reusable output references and previous approved assets live here.</p>

      <div className="mt-6">
        {detail?.assets?.length ? (
          <AssetGrid assets={detail.assets} />
        ) : (
          <div className="panel px-5 py-8 text-sm text-[var(--muted)]">No assets available yet. Run a project through the pipeline first.</div>
        )}
      </div>
    </div>
  );
}
