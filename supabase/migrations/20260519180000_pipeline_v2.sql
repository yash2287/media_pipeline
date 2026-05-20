-- Pipeline v2 — campaign briefs, per-SKU metadata, marketplaces, brand extensions, render text

alter table projects
  add column if not exists brief jsonb not null default '{}'::jsonb,
  add column if not exists target_marketplaces text[] not null default '{}',
  add column if not exists variants_per_slot int not null default 1
    check (variants_per_slot between 1 and 5),
  add column if not exists budget_cap_usd numeric(10,4);

alter table brand_profiles
  add column if not exists logo_storage_path text,
  add column if not exists tone_keywords text[] not null default '{}',
  add column if not exists font_family text,
  add column if not exists watermark_enabled boolean not null default false;

-- Allow asset.kind to include reference (style boards, competitor refs, brand assets)
alter table assets drop constraint if exists assets_kind_check;
alter table assets
  add constraint assets_kind_check
  check (kind in ('raw', 'cutout', 'generated', 'upscaled', 'final', 'reference', 'companion'));

-- Indexes
create index if not exists idx_assets_project_kind_runid
  on assets (project_id, kind, ((metadata->>'runId')));
