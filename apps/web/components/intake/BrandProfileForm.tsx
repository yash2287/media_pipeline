import type { BrandProfile } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Select({
  id,
  name,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] transition-colors hover:border-[var(--line-2)] focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-glow)]"
    >
      {children}
    </select>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-[11.5px] leading-5 text-[var(--muted)]">{children}</p>;
}

export function BrandProfileForm({
  brands,
  defaults,
}: {
  brands: BrandProfile[];
  defaults?: BrandProfile | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="brandProfileId">Existing brand profile</Label>
        <Select id="brandProfileId" name="brandProfileId" defaultValue={defaults?.id ?? ""}>
          <option value="">Create a new brand profile</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name} · {brand.industry}
            </option>
          ))}
        </Select>
        <FieldHint>Reuse a saved profile or leave blank to create one inline.</FieldHint>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="brandName">Brand name</Label>
          <Input
            id="brandName"
            name="brandName"
            placeholder="Maya's Jewelry"
            defaultValue={defaults?.name ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Select id="industry" name="industry" defaultValue={defaults?.industry ?? "jewellery"}>
            <option value="jewellery">Jewellery</option>
            <option value="food">Food</option>
            <option value="interior">Interior</option>
            <option value="fashion">Fashion</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="styleKeywords">Style keywords</Label>
          <Input
            id="styleKeywords"
            name="styleKeywords"
            placeholder="minimal, warm, artisan"
            defaultValue={defaults?.styleKeywords?.join(", ") ?? ""}
          />
          <FieldHint>Comma-separated descriptors. Used by the prompt engine.</FieldHint>
        </div>
        <div>
          <Label htmlFor="brandToneKeywords">Brand tone keywords</Label>
          <Input
            id="brandToneKeywords"
            name="brandToneKeywords"
            placeholder="confident, calm, knowing"
            defaultValue={defaults?.toneKeywords?.join(", ") ?? ""}
          />
          <FieldHint>Tone descriptors for copy + caption autogen.</FieldHint>
        </div>
      </div>

      <div>
        <Label htmlFor="colorPalette">Color palette</Label>
        <Input
          id="colorPalette"
          name="colorPalette"
          placeholder="#111827:primary,#c084fc:accent,#f8fafc:neutral"
          defaultValue={defaults?.colorPalette?.map((c) => `${c.hex}:${c.role}`).join(",") ?? ""}
        />
        <FieldHint>
          <span className="mono">hex:role</span> pairs, comma separated. Drives QA color-drift checks.
        </FieldHint>
      </div>

      <div>
        <Label htmlFor="brandGuidelines">Brand notes</Label>
        <Textarea
          id="brandGuidelines"
          name="brandGuidelines"
          placeholder="Color fidelity, shadow handling, marketplace constraints, styling notes."
          defaultValue={defaults?.brandGuidelinesMd ?? ""}
        />
        <FieldHint>Free-form. Fed into prompt context for hero / lifestyle slots.</FieldHint>
      </div>
    </div>
  );
}
