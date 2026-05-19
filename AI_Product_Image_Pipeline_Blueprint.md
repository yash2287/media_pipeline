# AI Product Image Automation Pipeline — Architectural Blueprint

**Version:** 1.0 (May 2026)
**Operator:** Yashashree (Tinkerbrains Studio)
**Status:** Ready for Claude Code / Codex implementation

---

## 0. Strategic Framing (read this first)

This blueprint is opinionated. It deliberately constrains scope because the goal is **revenue from Upwork/LinkedIn gigs within 30 days**, not a polished SaaS.

**What we are building:**
A **single-tenant internal operator tool** that lets Yashashree intake a client's raw product photos and brand info, run them through an automated AI pipeline, and deliver multi-format marketplace + social assets in hours instead of days. Clients receive output as a downloadable zip + Google Drive link.

**What we are NOT building (yet):**
- Multi-tenant SaaS with client logins
- Stripe billing
- Pinecone vector search for prompt memory
- A full client portal with comment threads
- Style-reference embedding search

Those belong to Phase 2/3 and only if the business proves out. The image you uploaded shows the *eventual* product surface — this blueprint is how to get to a paid v1 in two weeks.

**The wedge offer (commit to one):**
> **"Marketplace Launch Pack: 20 SKUs → Amazon/Etsy/Shopify-ready images in 72 hours, £600 flat."**
> Includes: clean white-bg main image, 4 gallery variants, 2 lifestyle scenes, all marketplace aspect ratios.

Every decision below is in service of delivering that pack profitably. Other industry packs (food, jewellery, interior, fashion) are the same pipeline with different prompt templates.

---

## 1. Verified API Stack (May 2026)

I verified every model and price below against current docs.

### Image Generation / Editing
| Service | Model ID | Endpoint | Use | Cost |
|---|---|---|---|---|
| **OpenAI** | `gpt-image-2` (snapshot `gpt-image-2-2026-04-21`) | `/v1/images/generations`, `/v1/images/edits` | Lifestyle scene generation, text-in-image (labels, packaging), brand-sensitive hero shots | ~$0.06–$0.17/image depending on quality + size |
| **fal.ai** | `fal-ai/flux-pro/v1.1` / `fal-ai/flux/dev` | fal.queue | Fast variants, A/B creative testing | $0.025–$0.05 |
| **fal.ai** | `fal-ai/flux-kontext-pro` | fal.queue | Context-aware product edits (keep product, change background) | $0.04 |
| **fal.ai** | `fal-ai/seedream-4` (ByteDance) | fal.queue | Strong photoreal editing alternative | $0.03 |

### Background / Cutout / Staging
| Service | Endpoint | Use | Cost |
|---|---|---|---|
| **Bria RMBG 2.0** via fal.ai | `fal-ai/bria/background/remove` | Background removal (commercial-safe, licensed training data) | $0.018 |
| **Bria Background Replace** via fal.ai | `fal-ai/bria/background/replace` | Replace bg with prompt or reference | $0.023 |
| **Bria Product Shot** via fal.ai | `fal-ai/bria/product-shot` | All-in-one cutout + studio scene | $0.023 |
| **Photoroom API** | `image.photoroom.com/v2/edit` | Fallback + Shopify-compliant templates | ~$0.02–$0.05/image, $39+/mo |

**Selection rule:**
- White-background marketplace images → **Bria RMBG 2.0** (cheapest, licensed data, safe for client work).
- Lifestyle scenes with product preserved → **Bria Product Shot** OR **gpt-image-2 edit mode** with the cutout as input.
- Stylized social campaign creatives → **gpt-image-2** in thinking mode for hero, **FLUX.1 Kontext** for variants.

### Upscaling & Enhancement
- **fal.ai Topaz** (`fal-ai/topaz/upscale`) for print-grade upscaling (when client asks for print catalog).
- **fal.ai Clarity Upscaler** for cheaper batch upscaling.

### Image Hosting / Transformations
- **Phase 1:** Supabase Storage with signed URLs. Skip Cloudinary until you have >5 paying clients.
- **Phase 2:** Cloudinary for on-the-fly aspect ratio crops, format conversion (webp/avif), and CDN delivery.

**Rationale for skipping Cloudinary in Phase 1:** Supabase Storage with `image/transform` (built-in resize + format) handles everything you need for the first dozen clients. One less moving part.

---

## 2. Tech Stack (Pinned Versions)

```
Runtime:        Node.js 22 LTS
Framework:      Next.js 15 (App Router, Server Actions)
Language:       TypeScript 5.5+
Styling:        Tailwind CSS 4 + shadcn/ui
DB / Auth:      Supabase (Postgres 16, RLS, Auth, Storage)
Orchestration:  Trigger.dev v3 (self-hosted optional, Apache 2.0)
Forms:          react-hook-form + zod
File handling:  Supabase Storage (Phase 1), uploadthing optional
Deploy:         Vercel (Next.js) + Trigger.dev Cloud
Monitoring:     Sentry (free tier) + Trigger.dev built-in observability
```

**Why Trigger.dev over Inngest:**
1. The pipeline is **linear multi-step with long-running AI calls** (gpt-image-2 thinking mode can take 20–60s). Trigger.dev's checkpoint-resume model handles this without serverless timeout pain.
2. Self-host fallback (Apache 2.0) if costs spike.
3. The dashboard's per-step replay is invaluable when debugging which API call failed in a 8-step pipeline.

**Why Supabase over Convex:**
You have experience with both, but the relational shape of this data (projects → runs → steps → assets) is a textbook Postgres workload. Supabase RLS gives you clean per-client scoping for free in Phase 2.

---

## 3. The 8-Step Pipeline — Concrete Implementation

Each step is a Trigger.dev task. Each task is **idempotent** and writes its output to `pipeline_steps` so any step can be retried independently.

### Step 1: Intake & Asset Validation
- **Input:** Operator uploads raw photos + brand_profile_id via admin UI
- **Logic:**
  - Validate file format (JPEG/PNG/HEIC accepted), max 25MB
  - Run a vision check via `gpt-4o-mini` on a thumbnail: detect blur, multiple products, missing subject, watermarks, copyright marks
  - Auto-extract product attributes (color, type, count) into structured JSON for downstream prompts
  - Generate stable SKU IDs (`sku_001`, `sku_002`) if not provided
- **Output:** Validated raw asset rows + per-image metadata blob
- **Cost:** ~$0.001/image (gpt-4o-mini vision)

### Step 2: Background Removal / Subject Cutout
- **API:** `fal-ai/bria/background/remove`
- **Logic:**
  - Submit each raw image to Bria RMBG 2.0
  - Store the transparent PNG result in Supabase Storage at `assets/{project_id}/cutouts/{sku_id}.png`
  - For multi-subject images, flag for manual review (don't auto-process)
- **Output:** Transparent PNG cutouts, foreground mask URL
- **Cost:** $0.018/image
- **Fallback:** Photoroom `/v2/edit?bg=transparent` if Bria fails twice

### Step 3: Style + Prompt Engine
- **API:** None (this is local/DB logic)
- **Logic:**
  - Load the brand_profile (color palette, style direction, vibe descriptors)
  - Load the industry prompt_template (jewellery / food / interior / fashion)
  - Compose final prompts for each variant requested, slot-filling:
    - `{product_type}`, `{primary_color}`, `{secondary_color}`, `{vibe}`, `{scene}`, `{lighting}`, `{aspect}`
  - Generate 3–5 prompt variants per output slot for A/B (different lighting, different angles)
- **Output:** A JSON manifest of `{slot_id, prompt, model, params}` rows to execute
- **Cost:** $0 (no API call; uses pre-stored templates)

### Step 4: AI Generation / Scene Staging
- **API:** Primarily `gpt-image-2` (edits endpoint with cutout as input + mask), fallback `fal-ai/flux-kontext-pro`
- **Logic:**
  - For each prompt slot, call the chosen model with the cutout as the reference image
  - Use gpt-image-2 `quality: high` + `thinking_mode: true` for hero/lifestyle shots
  - Use `quality: medium` for catalog variants (faster, cheaper)
  - Generate 2–3 variants per slot (let the operator pick the best)
  - Run in parallel using Trigger.dev's `batch.trigger()` with concurrency cap of 5 to avoid OpenAI rate-limit hits on Tier 1
- **Output:** Generated PNGs at native resolution (1024x1024 / 1536x1024 / 1024x1536)
- **Cost (per SKU, ~10 outputs):** ~$1.20–$2.00

### Step 5: Enhancement, Retouch & Upscale
- **API:** `fal-ai/topaz/upscale` (only for print) OR `fal-ai/clarity-upscaler` (default batch)
- **Logic:**
  - Upscale to 2048px or 4096px depending on output_pack
  - Optional denoise / sharpen pass
  - Optional shadow compositing for white-bg marketplace images (Bria has a built-in shadow flag)
- **Output:** High-res final PNG + JPEG variants
- **Cost:** $0.02–$0.10/image

### Step 6: Multi-Format Adaptation
- **API:** None (`sharp` library locally in Trigger.dev task)
- **Logic:** For each generated final, produce the required output pack variants:
  - **Marketplace Launch Pack:** 2000x2000 white-bg (Amazon main), 1600x1600 (gallery), 1080x1080 (Etsy)
  - **Social Pack:** 1080x1350 (IG portrait), 1080x1080 (IG square), 1080x1920 (Story/Reel)
  - **Premium AI Photoshoot Pack:** 4096px square + 16:9 hero + 9:16 vertical
  - **Catalog Pack:** 1500x1500 + thumbnail variants
- **Output:** Folder structure per pack, each variant labeled `{sku_id}_{slot}_{aspect}.{ext}`
- **Cost:** $0 (local processing)

### Step 7: QA + Human Review Gate
- **API:** `gpt-4o-mini` vision for auto-QA + manual operator review
- **Logic:**
  - Auto-QA: check for visible artifacts, distorted product, color drift from brand palette, NSFW false positives
  - Score each output 0–100; anything <70 flagged red, 70–85 yellow, 85+ green
  - Render review UI: side-by-side raw → final with green/yellow/red badges
  - Operator approves, rejects (re-runs with adjusted prompt), or marks for manual touch-up in Photoshop
- **Output:** Approved assets manifest
- **Cost:** ~$0.002/image for auto-QA

### Step 8: Delivery & Client Handoff
- **Phase 1:** Zip the approved pack, upload to Google Drive via the Drive API, send a signed link + checklist PDF.
- **Phase 2:** Client portal page at `/c/{project_slug}` showing thumbnails, download buttons, revision request form.

---

## 4. Database Schema (PostgreSQL via Supabase)

```sql
-- Single-tenant for Phase 1; org_id stays nullable. Add real RLS in Phase 2.

create table brand_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  name text not null,                  -- "Maya's Jewelry"
  industry text not null,              -- jewellery | food | interior | fashion | other
  color_palette jsonb,                 -- [{"hex":"#1a1a1a","role":"primary"}, ...]
  style_keywords text[],               -- ["minimal","warm","artisan"]
  reference_image_urls text[],
  brand_guidelines_md text,            -- free-form notes
  created_at timestamptz default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles(id),
  client_name text not null,
  client_email text,
  pack_type text not null,             -- marketplace | social | premium | catalog
  status text not null default 'intake',  -- intake | running | review | delivered | failed
  due_at timestamptz,
  delivery_url text,                   -- gdrive zip link
  total_cost_usd numeric(10,4) default 0,
  created_at timestamptz default now()
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  sku_id text not null,                -- "sku_001"
  kind text not null,                  -- raw | cutout | generated | upscaled | final
  parent_asset_id uuid references assets(id),
  storage_path text not null,
  width int,
  height int,
  mime_type text,
  metadata jsonb,                      -- {prompt, model, seed, slot, aspect, ...}
  qa_score int,
  qa_status text,                      -- pending | approved | rejected | manual_fix
  created_at timestamptz default now()
);

create table pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  trigger_run_id text,                 -- Trigger.dev run id
  status text not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  total_cost_usd numeric(10,4) default 0
);

create table pipeline_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references pipeline_runs(id) on delete cascade,
  step_number int not null,            -- 1..8
  step_name text not null,
  status text not null,                -- queued | running | succeeded | failed | skipped
  input_asset_ids uuid[],
  output_asset_ids uuid[],
  api_used text,
  model_id text,
  duration_ms int,
  cost_usd numeric(10,4),
  error text,
  attempt int default 1,
  created_at timestamptz default now()
);

create table prompt_templates (
  id uuid primary key default gen_random_uuid(),
  industry text not null,              -- jewellery, food, interior, fashion
  slot text not null,                  -- hero_lifestyle, marketplace_main, gallery_angle_2, social_square
  prompt_template text not null,       -- with {slot} placeholders
  model_id text not null default 'gpt-image-2',
  default_params jsonb,                -- {quality, thinking_mode, aspect_ratio, ...}
  is_active boolean default true,
  created_at timestamptz default now()
);
```

---

## 5. Repo Structure

```
tinkerbrains-pipeline/
├── apps/
│   └── web/                          # Next.js 15 admin app
│       ├── app/
│       │   ├── (auth)/login/
│       │   ├── (operator)/
│       │   │   ├── projects/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── new/page.tsx
│       │   │   │   └── [id]/
│       │   │   │       ├── page.tsx           # project detail + pipeline status
│       │   │   │       ├── intake/page.tsx    # upload + brand profile
│       │   │   │       ├── review/page.tsx    # step 7 QA UI
│       │   │   │       └── delivery/page.tsx
│       │   │   ├── brands/
│       │   │   ├── templates/                  # prompt template editor
│       │   │   └── library/                    # asset library / past work
│       │   └── api/
│       │       ├── trigger/[...trigger]/route.ts
│       │       └── upload/route.ts
│       ├── components/
│       │   ├── ui/                             # shadcn
│       │   ├── pipeline/
│       │   │   ├── PipelineStatusTimeline.tsx
│       │   │   ├── AssetGrid.tsx
│       │   │   ├── QAReviewCard.tsx
│       │   │   └── DeliveryPanel.tsx
│       │   └── intake/
│       │       ├── BulkUploader.tsx
│       │       └── BrandProfileForm.tsx
│       └── lib/
│           ├── supabase/
│           ├── trigger/                        # client to invoke trigger.dev
│           └── fal/                            # typed fal.ai wrapper
├── trigger/                                    # Trigger.dev tasks
│   ├── pipeline.ts                             # the orchestrator task
│   ├── steps/
│   │   ├── 1-intake.ts
│   │   ├── 2-cutout.ts
│   │   ├── 3-prompts.ts
│   │   ├── 4-generate.ts
│   │   ├── 5-enhance.ts
│   │   ├── 6-adapt.ts
│   │   ├── 7-qa.ts
│   │   └── 8-deliver.ts
│   └── lib/
│       ├── apis/
│       │   ├── fal.ts
│       │   ├── openai-image.ts
│       │   ├── photoroom.ts
│       │   └── gdrive.ts
│       ├── prompts/
│       │   ├── jewellery.ts
│       │   ├── food.ts
│       │   ├── interior.ts
│       │   └── fashion.ts
│       └── packs/
│           ├── marketplace.ts                  # output pack specs
│           ├── social.ts
│           ├── premium.ts
│           └── catalog.ts
├── supabase/
│   ├── migrations/
│   └── seed.sql                                # seed prompt_templates per industry
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 6. Key Implementation Details

### Trigger.dev Orchestrator (the heart of the system)

```typescript
// trigger/pipeline.ts
import { task, batch } from "@trigger.dev/sdk/v3";
import { intakeTask } from "./steps/1-intake";
import { cutoutTask } from "./steps/2-cutout";
// ... etc

export const runPipeline = task({
  id: "run-pipeline",
  maxDuration: 60 * 60, // 1 hour
  retry: { maxAttempts: 1 }, // we retry at step level, not orchestrator
  run: async (payload: { projectId: string }) => {
    const { projectId } = payload;

    // Step 1: validate intake
    const validated = await intakeTask.triggerAndWait({ projectId });
    if (!validated.ok) throw new Error(`Intake failed: ${validated.error}`);

    // Step 2: cutouts (parallel per SKU)
    const cutouts = await batch.triggerAndWait(
      validated.skus.map(sku => ({ task: cutoutTask, payload: { projectId, sku } }))
    );

    // Step 3: build prompt manifest
    const prompts = await promptsTask.triggerAndWait({ projectId, cutouts });

    // Step 4: generate (concurrency-limited fan-out)
    const generated = await batch.triggerAndWait(
      prompts.slots.map(slot => ({ task: generateTask, payload: slot })),
      { maxConcurrency: 5 }
    );

    // Steps 5–8 sequentially
    await enhanceTask.triggerAndWait({ projectId });
    await adaptTask.triggerAndWait({ projectId });
    await qaTask.triggerAndWait({ projectId });
    // step 8 is gated by manual approval in the admin UI
    
    return { projectId, status: "ready_for_review" };
  },
});
```

### fal.ai Client Wrapper

```typescript
// trigger/lib/apis/fal.ts
import { fal } from "@fal-ai/client";
fal.config({ credentials: process.env.FAL_KEY });

export async function removeBackground(imageUrl: string) {
  const result = await fal.subscribe("fal-ai/bria/background/remove", {
    input: { image_url: imageUrl },
    logs: false,
  });
  return result.data.image.url; // transparent PNG URL
}

export async function replaceBackground(opts: {
  imageUrl: string; prompt: string; aspectRatio?: string;
}) {
  const result = await fal.subscribe("fal-ai/bria/background/replace", {
    input: {
      image_url: opts.imageUrl,
      bg_prompt: opts.prompt,
      refine_prompt: true,
      fast: false,
      num_images: 1,
      aspect_ratio: opts.aspectRatio ?? "1:1",
    },
  });
  return result.data.images[0].url;
}
```

### OpenAI gpt-image-2 Client

```typescript
// trigger/lib/apis/openai-image.ts
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateProductScene(opts: {
  cutoutImageUrl: string;        // foreground product (transparent PNG)
  prompt: string;
  size: "1024x1024" | "1536x1024" | "1024x1536";
  quality: "low" | "medium" | "high";
  thinking?: boolean;
}) {
  // Use the edits endpoint with cutout as reference
  const response = await openai.images.edit({
    model: "gpt-image-2-2026-04-21",   // pin snapshot
    image: [await fetchAsFile(opts.cutoutImageUrl)],
    prompt: opts.prompt,
    size: opts.size,
    quality: opts.quality,
    // thinking_mode is exposed via params on the model
  });
  return response.data[0].b64_json;
}
```

### Sample Prompt Template (Jewellery)

```typescript
// trigger/lib/prompts/jewellery.ts
export const jewelleryTemplates = {
  marketplace_main: ({ product_type, primary_color }) => `
Photorealistic product photo of a ${product_type}, centered on pure white #FFFFFF background.
Soft top-down studio lighting with subtle shadow beneath. Sharp focus on the entire piece.
The ${primary_color} should appear true to color. No props, no text, no watermark.
Frame: square, product fills ~75% of canvas, ample whitespace.
Style: clean, premium e-commerce, Amazon main image compliant.
`.trim(),

  hero_lifestyle: ({ product_type, vibe, secondary_color }) => `
Editorial lifestyle photograph of a ${product_type} resting on a ${vibe} surface
(matte ${secondary_color} ceramic dish or unbleached linen). Soft window light from upper-left,
gentle natural shadow. Shallow depth of field. Out-of-focus warm bokeh in background.
Color palette: muted, sophisticated, jewelry-counter aesthetic.
Frame: 3:2 landscape, magazine-quality, suitable for hero banner.
`.trim(),
  // ...gallery_angle_2, social_square, etc.
};
```

### Cost Calculator (per-project transparency)

Build a real-time cost ticker in the project detail view. Pull from `pipeline_steps.cost_usd`. This is the difference between profitability and burning cash on a Upwork gig.

**Marketplace Launch Pack — 20 SKUs cost model:**
| Step | API | Cost per SKU | Subtotal |
|---|---|---|---|
| 1. Intake QA | gpt-4o-mini | $0.002 | $0.04 |
| 2. Cutout | Bria RMBG 2.0 | $0.018 | $0.36 |
| 4. Generation (6 variants/SKU) | gpt-image-2 medium | 6 × $0.08 = $0.48 | $9.60 |
| 5. Upscale | fal Clarity | $0.04 | $0.80 |
| 7. Auto-QA | gpt-4o-mini | $0.012 | $0.24 |
| **Total API cost** | | **~$0.55/SKU** | **~$11** |

At £600 (~$760) per pack, gross margin on API costs is ~98.5%. Time becomes the constraint, which is exactly what this pipeline solves.

---

## 7. Build Sequence (For Claude Code / Codex)

Optimized for shipping. Each phase is a discrete prompt you can hand to Claude Code.

### Week 1 — Foundation
**Day 1–2: Skeleton + Auth**
- `pnpm dlx create-next-app@latest tinkerbrains-pipeline --typescript --tailwind --app --src-dir=false`
- Add shadcn/ui, set up Supabase (project, anon key, service role key in `.env.local`)
- Implement Supabase Auth with email-magic-link (single-tenant: just Yashashree + Sanket as admins)
- Build `/login`, protected layout for `(operator)` group

**Day 3: Database + Storage**
- Apply the schema from §4 as Supabase migrations
- Seed `prompt_templates` for all 4 industries (~24 templates total)
- Create `assets` bucket in Supabase Storage with operator-only read/write policy
- Wire up signed-URL upload helper

**Day 4: Trigger.dev Setup**
- Init Trigger.dev v3 project (`npx trigger.dev@latest init`)
- Connect to Trigger.dev Cloud (free tier covers Phase 1)
- Create the orchestrator task + 8 step stubs
- Verify a dummy run end-to-end (log only, no API calls)

**Day 5–7: Pipeline MVP**
- Wire up Bria RMBG 2.0 (Step 2)
- Wire up gpt-image-2 with edits endpoint (Step 4)
- Wire up `sharp` for multi-format adaptation (Step 6)
- Skip Steps 5 + 7 for now; deliver as Step 8 zip

### Week 2 — Productionize
**Day 8–9: Admin UI**
- Project list + new-project wizard (intake form)
- Brand profile editor with color picker
- Bulk upload with drag-and-drop, progress bars
- Pipeline status timeline (live from Trigger.dev runs via realtime subscription)

**Day 10–11: QA + Enhancement**
- Step 7: side-by-side review UI with green/yellow/red badges
- Per-asset re-run button (re-fires Step 4 with edited prompt)
- Step 5: hook in fal Clarity Upscaler
- Cost ticker on project detail page

**Day 12: Delivery**
- Google Drive API integration: create folder, upload zip, generate shareable link
- Auto-generate a 1-page delivery PDF (use react-pdf) listing all assets with thumbnails
- Email handoff template (use Resend, £20/mo)

**Day 13–14: Polish + First Real Gig**
- Yashashree runs her own product photos through it end-to-end
- Fix the inevitable 10 papercuts
- Record a 90s loom of the pipeline for the Upwork portfolio

### Week 3 — Pitch + Land First Client
- Post the loom as Upwork portfolio sample + LinkedIn carousel
- Apply to 20 Upwork "product photography" gigs with a pinned £200 trial offer
- Run the first paid gig through the system; capture before/afters

---

## 8. Phase 2 Additions (only after 3 paid gigs)

In priority order:
1. **Client portal** at `/c/{slug}` — gallery, download all, request revisions form. Adds premium positioning.
2. **Cloudinary integration** — drop-in for on-the-fly aspect ratios + CDN. Replace zip delivery with live URLs.
3. **Stripe Checkout** for fixed-price packs (Marketplace £600, Social £400, Premium £900, Refresh £450).
4. **Reusable brand profiles** — repeat customers reuse the same palette/style.
5. **Stock template library** — pre-built 4-industry packs Yashashree can offer as productized fixed-scope.

## 9. Phase 3 (only if Phase 2 generates >£8k MRR equivalent)

- Multi-tenant SaaS with org-scoped RLS
- Pinecone for style-reference search ("show me images similar to this mood-board image")
- Self-serve onboarding
- Per-pack credit-based pricing
- Reseller / white-label tier

Do not build Phase 3 until the business begs for it. Yashashree's leverage right now is delivery speed, not platform breadth.

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **OpenAI rate limits on Tier 1** | Start with `quality: medium`, cap parallel calls at 5, fall back to fal-ai FLUX Kontext on 429 errors. Apply for Tier 2 (>$50 spent → unlocks automatically). |
| **gpt-image-2 quality unpredictability** | Generate 2–3 variants per slot, surface all in QA UI, let operator pick. Reject loop → re-prompt with `thinking_mode: true`. |
| **Bria edge cases (hair, transparent jewelry)** | Bria handles jewelry well per their training data. For known-hard categories (loose curly hair, glass), add a manual-review flag in Step 2. |
| **Trigger.dev cost spike** | Start on the $20/mo Hobby plan (1500 runs/mo = ~150 projects). Monitor; switch to self-hosted Docker if hit Pro tier ($300/mo). |
| **Client revisions blow up margin** | Pack pricing includes 2 revision rounds. Beyond that, £40/hr add-on. Document in SOW. |
| **Yashashree as solo bottleneck** | The QA step is the only mandatory human step. Time-box review to 15 min/project. If she's still buried, that's a signal to raise prices, not to hire. |
| **Unknown industry vertical** | Start with the 4 in the diagram. Refuse vertical-specific gigs outside those for the first 3 months — keep templates focused. |

---

## 11. What to Hand to Claude Code Right Now

Three artifacts. Generate them in this order:

**Artifact 1: Project scaffolding prompt**
> "Initialize a Next.js 15 project per §5 of `AI_Product_Image_Pipeline_Blueprint.md`. Set up Supabase, Trigger.dev v3, shadcn/ui. Apply the database migrations in §4. Stop and confirm before adding API integrations."

**Artifact 2: Pipeline core prompt**
> "Implement the 8 Trigger.dev tasks in `trigger/steps/` per §3 and §6. Use the API wrappers in §6. Stub Steps 5, 7, 8 with TODO comments. Verify an end-to-end dry-run completes."

**Artifact 3: Admin UI prompt**
> "Build the operator UI per the Day 8–11 spec. Project list, new-project wizard with brand profile + bulk upload, pipeline status timeline using Trigger.dev realtime, QA review UI with approve/reject/re-run per asset."

Each prompt should reference this blueprint as a markdown file in the repo root so Claude Code can re-read it for context.

---

## 12. Definition of Done for v1

The system is "done" when Yashashree can:
1. Receive 20 raw product photos from a client over WhatsApp
2. Upload them to the admin UI in <5 minutes
3. Pick `pack_type: marketplace`, pick the brand profile (or create one in <2 min)
4. Click "Run Pipeline"
5. Come back in 30–60 minutes to a fully populated QA review
6. Approve in 15 minutes (rejecting + re-running any she doesn't love)
7. Click "Deliver" and the client receives a Google Drive link with 80 marketplace-ready images organized by SKU

If all of that works once, end-to-end, with one real client paying real money, **stop building features and start running gigs.** Idea sprawl is the enemy here. The fact that you'll *want* to add Pinecone, switch to Convex, build a fancy Figma plugin, etc., is precisely why this blueprint is opinionated and phased.

---

## Appendix A: Sample Upwork Pitch (use this verbatim)

> Hi [Client name],
>
> I noticed you're looking for product photography for [N] SKUs. I run an AI-assisted product imaging pipeline that delivers Amazon/Etsy/Shopify-ready images in 72 hours flat, including white-background main shots, 4 gallery angles, and 2 lifestyle scenes per SKU.
>
> Recent example: [Loom link to before/after of Yashashree's own product run].
>
> For 20 SKUs, the pack is a fixed £600 — no studio booking, no shipping products to a photographer. I just need your existing reference photos (even phone photos work) and your brand colors.
>
> Happy to do 3 SKUs as a £75 trial first if that's easier.
>
> — Yashashree, Tinkerbrains Studio

---

*Blueprint compiled May 18, 2026. Verify pricing against fal.ai and OpenAI dashboards before locking client quotes.*
