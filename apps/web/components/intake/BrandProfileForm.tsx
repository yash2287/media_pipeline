import type { BrandProfile } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BrandProfileForm({ brands }: { brands: BrandProfile[] }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="brandProfileId">Existing brand profile</Label>
        <select
          id="brandProfileId"
          name="brandProfileId"
          className="h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--foreground)]"
          defaultValue=""
        >
          <option value="">Create a new brand profile</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name} · {brand.industry}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="brandName">Brand name</Label>
          <Input id="brandName" name="brandName" placeholder="Maya's Jewelry" />
        </div>
        <div>
          <Label htmlFor="industry">Industry</Label>
          <select id="industry" name="industry" className="h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm">
            <option value="jewellery">Jewellery</option>
            <option value="food">Food</option>
            <option value="interior">Interior</option>
            <option value="fashion">Fashion</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="styleKeywords">Style keywords</Label>
          <Input id="styleKeywords" name="styleKeywords" placeholder="minimal, warm, artisan" />
        </div>
        <div>
          <Label htmlFor="colorPalette">Color palette</Label>
          <Input id="colorPalette" name="colorPalette" placeholder="#111827:primary,#c084fc:accent,#f8fafc:neutral" />
        </div>
      </div>

      <div>
        <Label htmlFor="brandGuidelines">Brand notes</Label>
        <Textarea id="brandGuidelines" name="brandGuidelines" placeholder="Color fidelity, shadow handling, marketplace constraints, styling notes." />
      </div>
    </div>
  );
}

