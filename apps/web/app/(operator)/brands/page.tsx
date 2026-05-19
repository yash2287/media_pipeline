import { Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrandProfiles } from "@/lib/data";

export default async function BrandsPage() {
  const brands = await getBrandProfiles();

  return (
    <div className="px-6 py-6">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">Brands</div>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Brand profiles</h1>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {brands.map((brand) => (
          <Card key={brand.id}>
            <CardHeader>
              <CardTitle>{brand.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {brand.colorPalette.map((color) => (
                  <div key={`${brand.id}-${color.hex}`} className="flex items-center gap-2 rounded-full bg-stone-50 px-3 py-1 text-xs">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color.hex }} />
                    {color.role}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {brand.styleKeywords.map((keyword) => (
                  <span key={keyword} className="rounded-full bg-[var(--purple-soft)] px-3 py-1 text-xs text-[var(--purple)]">
                    {keyword}
                  </span>
                ))}
              </div>
              <div className="flex items-start gap-2 text-sm text-[var(--muted)]">
                <Palette className="mt-0.5 h-4 w-4" />
                {brand.brandGuidelinesMd}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

