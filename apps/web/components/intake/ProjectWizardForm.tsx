import { Calendar, Camera, FileText, Palette, Sparkles, Type, Upload, Wand2 } from "lucide-react";
import { BrandProfileForm } from "@/components/intake/BrandProfileForm";
import { BulkUploader } from "@/components/intake/BulkUploader";
import { MarketplacePicker } from "@/components/intake/MarketplacePicker";
import { ReferenceUploader } from "@/components/intake/ReferenceUploader";
import { WizardTabs } from "@/components/intake/WizardTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandProfile, Project, ProjectBrief } from "@/lib/types";

const selectClasses =
  "h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] transition-colors hover:border-[var(--line-2)] focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-glow)]";

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-[11.5px] leading-5 text-[var(--muted)]">{children}</p>;
}

function Toggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 cursor-pointer hover:border-[var(--line-2)] transition-colors">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 accent-[var(--accent)]"
      />
      <span>
        <span className="block text-[13px] font-semibold text-[var(--ink)]">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11.5px] leading-5 text-[var(--ink-3)]">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

function dateLocalString(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // <input type="datetime-local"> expects "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function skuTableString(brief: ProjectBrief | undefined) {
  const skus = brief?.skus ?? [];
  if (!skus.length) return "";
  return skus
    .map((s) =>
      [s.id, s.name ?? "", s.material ?? "", s.dimensionsCm ?? "", s.weightG ?? "", s.keyFeature ?? "", s.priceTier ?? ""].join(","),
    )
    .join("\n");
}

function carouselCopyString(brief: ProjectBrief | undefined) {
  const lines = brief?.carouselCopy ?? [];
  return lines.map((c) => [c.slide, c.headline ?? "", c.subhead ?? "", c.cta ?? ""].join("|")).join("\n");
}

export type WizardDefaults = {
  project?: Project | null;
  brand?: BrandProfile | null;
  rawAssetCount?: number;
  referenceAssetCount?: number;
};

export function ProjectWizardForm({
  brands,
  defaults,
  packTabsOnly = false,
  uploaderHint,
}: {
  brands: BrandProfile[];
  defaults?: WizardDefaults;
  packTabsOnly?: boolean;
  uploaderHint?: React.ReactNode;
}) {
  const project = defaults?.project ?? null;
  const brand = defaults?.brand ?? null;
  const brief = (project?.brief ?? {}) as ProjectBrief;

  return (
    <WizardTabs
      tabs={[
        { id: "client", eyebrow: "01", label: "Client" },
        { id: "brand", eyebrow: "02", label: "Brand" },
        { id: "brief", eyebrow: "03", label: "Brief" },
        { id: "art", eyebrow: "04", label: "Art direction" },
        { id: "copy", eyebrow: "05", label: "Copy & text" },
        { id: "skus", eyebrow: "06", label: "SKUs" },
        { id: "output", eyebrow: "07", label: "Output config" },
        { id: "assets", eyebrow: "08", label: "Assets" },
      ]}
      panels={{
        client: (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Client</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="clientName">Client name</Label>
                  <Input
                    id="clientName"
                    name="clientName"
                    required
                    placeholder="Maya Patel"
                    defaultValue={project?.clientName ?? ""}
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Client email</Label>
                  <Input
                    id="clientEmail"
                    name="clientEmail"
                    type="email"
                    placeholder="maya@example.com"
                    defaultValue={project?.clientEmail ?? ""}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="dueAt">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Due date
                  </span>
                </Label>
                <Input
                  id="dueAt"
                  name="dueAt"
                  type="datetime-local"
                  defaultValue={dateLocalString(project?.dueAt)}
                />
              </div>
              <MarketplacePicker
                defaultPackType={project?.packType ?? "marketplace"}
                defaultMarketplaces={project?.targetMarketplaces ?? []}
              />
            </CardContent>
          </Card>
        ),
        brand: (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Brand profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <BrandProfileForm brands={brands} defaults={brand} />
            </CardContent>
          </Card>
        ),
        brief: (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Campaign brief</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="campaignName">Campaign name</Label>
                  <Input
                    id="campaignName"
                    name="campaignName"
                    placeholder="Summer Drop 26"
                    defaultValue={brief.campaignName ?? ""}
                  />
                </div>
                <div>
                  <Label htmlFor="season">Season / window</Label>
                  <Input
                    id="season"
                    name="season"
                    placeholder="Summer · pre-launch"
                    defaultValue={brief.season ?? ""}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="hook">Headline hook</Label>
                <Input
                  id="hook"
                  name="hook"
                  placeholder="Made for hands that do."
                  defaultValue={brief.hook ?? ""}
                />
                <FieldHint>≤ 80 chars. Used as a fallback on-image headline.</FieldHint>
              </div>
              <div>
                <Label htmlFor="cta">Call to action</Label>
                <Input id="cta" name="cta" placeholder="Shop the drop" defaultValue={brief.cta ?? ""} />
              </div>
              <div>
                <Label htmlFor="valueProps">Value propositions</Label>
                <Input
                  id="valueProps"
                  name="valueProps"
                  placeholder="hand-finished, ethically sourced, lifetime guarantee"
                  defaultValue={brief.valueProps?.join(", ") ?? ""}
                />
                <FieldHint>Comma-separated. Fed into prompt context as soft constraints.</FieldHint>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="targetAudience">Target audience</Label>
                  <Input
                    id="targetAudience"
                    name="targetAudience"
                    placeholder="urban millennials, premium home"
                    defaultValue={brief.targetAudience ?? ""}
                  />
                </div>
                <div>
                  <Label htmlFor="tone">Tone descriptors</Label>
                  <Input
                    id="tone"
                    name="tone"
                    placeholder="luxurious, calm, confident"
                    defaultValue={brief.tone?.join(", ") ?? ""}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ),
        art: (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Art direction</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="lighting">Lighting</Label>
                  <select
                    id="lighting"
                    name="lighting"
                    className={selectClasses}
                    defaultValue={brief.lighting ?? "studio"}
                  >
                    <option value="studio">Studio</option>
                    <option value="window">Window light</option>
                    <option value="golden_hour">Golden hour</option>
                    <option value="overcast">Overcast</option>
                    <option value="hard_product">Hard product</option>
                    <option value="moody">Moody</option>
                    <option value="neon">Neon</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="scene">Scene / surface</Label>
                  <select
                    id="scene"
                    name="scene"
                    className={selectClasses}
                    defaultValue={brief.scene ?? "studio_white"}
                  >
                    <option value="studio_white">Studio white</option>
                    <option value="studio_dark">Studio dark</option>
                    <option value="marble">Marble</option>
                    <option value="linen">Linen</option>
                    <option value="wood">Wood</option>
                    <option value="concrete">Concrete</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="tabletop">Tabletop</option>
                    <option value="lifestyle_room">Lifestyle room</option>
                    <option value="on_model">On model</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="framing">Camera framing</Label>
                  <select
                    id="framing"
                    name="framing"
                    className={selectClasses}
                    defaultValue={brief.framing ?? "eye_level"}
                  >
                    <option value="eye_level">Eye-level</option>
                    <option value="top_down">Top-down</option>
                    <option value="three_quarter">3/4</option>
                    <option value="macro">Macro</option>
                    <option value="low_angle">Low angle</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="colorGrade">Color grade</Label>
                  <select
                    id="colorGrade"
                    name="colorGrade"
                    className={selectClasses}
                    defaultValue={brief.colorGrade ?? "neutral"}
                  >
                    <option value="neutral">Neutral</option>
                    <option value="warm_magazine">Warm magazine</option>
                    <option value="cool_tech">Cool tech</option>
                    <option value="kinfolk_natural">Kinfolk natural</option>
                    <option value="high_contrast">High contrast</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Label className="mb-0">Reference images</Label>
                  {defaults?.referenceAssetCount ? (
                    <span className="chip mono">
                      {defaults.referenceAssetCount} already attached
                    </span>
                  ) : null}
                </div>
                <ReferenceUploader />
              </div>
            </CardContent>
          </Card>
        ),
        copy: (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Copy & on-image text</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="carouselSlides">Carousel slides</Label>
                  <Input
                    id="carouselSlides"
                    name="carouselSlides"
                    type="number"
                    min={3}
                    max={10}
                    defaultValue={brief.carouselSlides ?? 5}
                  />
                  <FieldHint>3–10 slides for social_carousel pack.</FieldHint>
                </div>
                <div>
                  <Label htmlFor="variantsPerSlot">Variants per slot</Label>
                  <Input
                    id="variantsPerSlot"
                    name="variantsPerSlot"
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={project?.variantsPerSlot ?? 1}
                  />
                  <FieldHint>1 (fastest, cheapest) — 5 (most options to pick).</FieldHint>
                </div>
              </div>
              <div>
                <Label htmlFor="carouselCopy">Carousel copy</Label>
                <Textarea
                  id="carouselCopy"
                  name="carouselCopy"
                  defaultValue={carouselCopyString(brief)}
                  placeholder={
                    "1|Stop scrolling|We made this for you|Tap to shop\n2|The story|Hand-finished by 12 artisans\n3|The detail|Sustainably sourced linen\n4|Trusted by|2400 verified buyers\n5|Shop now|Free shipping today|Link in bio"
                  }
                />
                <FieldHint>
                  One line per slide. Format <span className="mono">slide | headline | subhead | cta</span>.
                </FieldHint>
              </div>
            </CardContent>
          </Card>
        ),
        skus: (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Per-SKU metadata</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="skuTable">SKU table (one per line)</Label>
              <Textarea
                id="skuTable"
                name="skuTable"
                className="min-h-44"
                defaultValue={skuTableString(brief)}
                placeholder={
                  "# id,name,material,dimensionsCm,weightG,keyFeature,priceTier\nsku_001,Gold hoop earring,18k gold,3x3,4,hand-finished,premium\nsku_002,Silver pendant,925 silver,2x4,6,artisan-engraved,mid"
                }
              />
              <FieldHint>
                CSV per line. The SKU IDs align with raw photo upload order. Used for prompt slot-filling and
                Amazon scale-reference copy.
              </FieldHint>
            </CardContent>
          </Card>
        ),
        output: (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Output configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="budgetCapUsd">Budget cap (USD)</Label>
                <Input
                  id="budgetCapUsd"
                  name="budgetCapUsd"
                  type="number"
                  step="0.5"
                  min={0}
                  placeholder="60"
                  defaultValue={project?.budgetCapUsd ?? ""}
                />
                <FieldHint>
                  Optional. When ≥70% spent, generation downgrades gpt-image-2 high → medium.
                </FieldHint>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle
                  name="smartCrop"
                  label="Smart subject-aware crop"
                  description="Sharp attention strategy. Recommended for portrait/landscape outputs."
                  defaultChecked={brief.smartCrop ?? true}
                />
                <Toggle
                  name="companionExports"
                  label="Companion .webp + .avif"
                  description="Generated alongside each final for web delivery."
                  defaultChecked={brief.companionExports ?? false}
                />
                <Toggle
                  name="captionAutoGen"
                  label="Caption + hashtag autogen"
                  description="Per-asset .caption.txt for Instagram / Pinterest / LinkedIn finals."
                  defaultChecked={brief.captionAutoGen ?? false}
                />
                <Toggle
                  name="watermark"
                  label="Watermark"
                  description="Subtle brand watermark in bottom-right (skipped on Amazon main)."
                  defaultChecked={brief.watermark ?? false}
                />
                <Toggle
                  name="generateListingCsv"
                  label="Marketplace listing CSVs"
                  description="Amazon, Etsy, Shopify CSVs bundled with delivery."
                  defaultChecked={brief.generateListingCsv ?? true}
                />
              </div>
            </CardContent>
          </Card>
        ),
        assets: (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Source product photos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {defaults?.rawAssetCount ? (
                <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[12.5px] text-[var(--ink-3)]">
                  <span className="mono">{defaults.rawAssetCount}</span> raw photo
                  {defaults.rawAssetCount === 1 ? "" : "s"} already attached. New uploads here will be
                  appended.
                </div>
              ) : null}
              {uploaderHint}
              <BulkUploader />
            </CardContent>
          </Card>
        ),
      }}
    />
  );
  // packTabsOnly param kept for forward compatibility; unused in this layout.
  void packTabsOnly;
}
