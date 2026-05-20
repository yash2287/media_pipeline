import { ImageIcon } from "lucide-react";
import { AssetGrid } from "@/components/pipeline/AssetGrid";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getLatestProjectDetail } from "@/lib/data";

export default async function LibraryPage() {
  const detail = await getLatestProjectDetail();

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <>
            <ImageIcon className="h-3.5 w-3.5" />
            Asset library
          </>
        }
        title="Output gallery"
        description="Cross-project view of generated outputs from the most recent project. Filter by stage to reference styling and quality."
      />

      <div className="mt-8">
        {detail?.assets?.length ? (
          <AssetGrid assets={detail.assets} />
        ) : (
          <EmptyState
            icon={<ImageIcon className="h-5 w-5" />}
            title="No assets yet"
            description="Run a project through the pipeline to populate the asset library."
          />
        )}
      </div>
    </div>
  );
}
