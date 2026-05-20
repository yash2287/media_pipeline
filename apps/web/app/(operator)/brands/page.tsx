import { FileText, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getBrandProfiles } from "@/lib/data";
import { cn, titleCase } from "@/lib/utils";

const accentByIndex = [
  "from-[#4338ca] to-[#7c3aed]",
  "from-[#0f766e] to-[#14b8a6]",
  "from-[#b45309] to-[#f59e0b]",
  "from-[#9d174d] to-[#ec4899]",
  "from-[#1f2937] to-[#475569]",
];

export default async function BrandsPage() {
  const brands = await getBrandProfiles();

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <>
            <Palette className="h-3.5 w-3.5" />
            Brand library
          </>
        }
        title="Brand profiles"
        description="Reusable identity packs that feed the prompt engine — palette, keywords, and free-form guidance."
      />

      {brands.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Palette className="h-5 w-5" />}
            title="No brands yet"
            description="Brand profiles are created during intake. Once added they appear here for reuse."
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 xl:grid-cols-2">
          {brands.map((brand, i) => {
            const initials = brand.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <Card key={brand.id} hoverable>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-[10px] bg-gradient-to-br text-[12px] font-semibold text-white shadow-[var(--shadow-sm)]",
                        accentByIndex[i % accentByIndex.length],
                      )}
                    >
                      {initials}
                    </div>
                    <div>
                      <CardTitle>{brand.name}</CardTitle>
                      <div className="mt-0.5 text-[11.5px] text-[var(--ink-3)]">
                        {titleCase(brand.industry)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {brand.colorPalette.length ? (
                    <div className="space-y-2">
                      <div className="eyebrow">Palette</div>
                      <div className="flex flex-wrap items-center gap-2">
                        {brand.colorPalette.map((c) => (
                          <div
                            key={`${brand.id}-${c.hex}`}
                            className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[11.5px] text-[var(--ink-2)]"
                          >
                            <span
                              className="h-4 w-4 rounded-full ring-1 ring-[var(--line)]"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span className="mono">{c.hex}</span>
                            <span className="text-[var(--muted)]">· {c.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {brand.styleKeywords.length ? (
                    <div className="space-y-2">
                      <div className="eyebrow">Style keywords</div>
                      <div className="flex flex-wrap gap-1.5">
                        {brand.styleKeywords.map((k) => (
                          <span key={k} className="chip">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {brand.brandGuidelinesMd ? (
                    <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
                      <div className="flex items-center gap-1.5 eyebrow">
                        <FileText className="h-3 w-3" />
                        Guidance
                      </div>
                      <p className="mt-2 text-[13px] leading-6 text-[var(--ink-2)]">
                        {brand.brandGuidelinesMd}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
