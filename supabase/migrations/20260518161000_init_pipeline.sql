create extension if not exists pgcrypto;

create table if not exists brand_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  name text not null,
  industry text not null check (industry in ('jewellery', 'food', 'interior', 'fashion', 'other')),
  color_palette jsonb not null default '[]'::jsonb,
  style_keywords text[] not null default '{}',
  reference_image_urls text[] not null default '{}',
  brand_guidelines_md text,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles(id),
  client_name text not null,
  client_email text,
  pack_type text not null check (pack_type in ('marketplace', 'social', 'premium', 'catalog')),
  status text not null default 'intake' check (status in ('intake', 'running', 'review', 'delivered', 'failed')),
  due_at timestamptz,
  delivery_url text,
  total_cost_usd numeric(10,4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  sku_id text not null,
  kind text not null check (kind in ('raw', 'cutout', 'generated', 'upscaled', 'final')),
  parent_asset_id uuid references assets(id),
  storage_path text not null,
  width int,
  height int,
  mime_type text,
  metadata jsonb not null default '{}'::jsonb,
  qa_score int,
  qa_status text not null default 'pending' check (qa_status in ('pending', 'approved', 'rejected', 'manual_fix')),
  created_at timestamptz not null default now()
);

create table if not exists pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  trigger_run_id text,
  status text not null default 'queued' check (status in ('queued', 'running', 'review', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  total_cost_usd numeric(10,4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists pipeline_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references pipeline_runs(id) on delete cascade,
  step_number int not null check (step_number between 1 and 8),
  step_name text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'skipped')),
  input_asset_ids uuid[] not null default '{}',
  output_asset_ids uuid[] not null default '{}',
  api_used text,
  model_id text,
  duration_ms int,
  cost_usd numeric(10,4) not null default 0,
  error text,
  attempt int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists prompt_templates (
  id uuid primary key default gen_random_uuid(),
  industry text not null check (industry in ('jewellery', 'food', 'interior', 'fashion', 'other')),
  slot text not null,
  prompt_template text not null,
  model_id text not null default 'gpt-image-1.5',
  default_params jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_brand_profile_id on projects(brand_profile_id);
create index if not exists idx_assets_project_id on assets(project_id);
create index if not exists idx_assets_project_kind on assets(project_id, kind);
create index if not exists idx_pipeline_runs_project_id on pipeline_runs(project_id);
create index if not exists idx_pipeline_steps_run_id on pipeline_steps(run_id);
create index if not exists idx_prompt_templates_industry on prompt_templates(industry, slot);

alter table brand_profiles enable row level security;
alter table projects enable row level security;
alter table assets enable row level security;
alter table pipeline_runs enable row level security;
alter table pipeline_steps enable row level security;
alter table prompt_templates enable row level security;

drop policy if exists "operator read brand_profiles" on brand_profiles;
create policy "operator read brand_profiles"
on brand_profiles for select
using (auth.role() = 'authenticated');

drop policy if exists "operator write brand_profiles" on brand_profiles;
create policy "operator write brand_profiles"
on brand_profiles for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "operator read projects" on projects;
create policy "operator read projects"
on projects for select
using (auth.role() = 'authenticated');

drop policy if exists "operator write projects" on projects;
create policy "operator write projects"
on projects for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "operator read assets" on assets;
create policy "operator read assets"
on assets for select
using (auth.role() = 'authenticated');

drop policy if exists "operator write assets" on assets;
create policy "operator write assets"
on assets for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "operator read pipeline_runs" on pipeline_runs;
create policy "operator read pipeline_runs"
on pipeline_runs for select
using (auth.role() = 'authenticated');

drop policy if exists "operator write pipeline_runs" on pipeline_runs;
create policy "operator write pipeline_runs"
on pipeline_runs for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "operator read pipeline_steps" on pipeline_steps;
create policy "operator read pipeline_steps"
on pipeline_steps for select
using (auth.role() = 'authenticated');

drop policy if exists "operator write pipeline_steps" on pipeline_steps;
create policy "operator write pipeline_steps"
on pipeline_steps for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "operator read prompt_templates" on prompt_templates;
create policy "operator read prompt_templates"
on prompt_templates for select
using (auth.role() = 'authenticated');

drop policy if exists "operator write prompt_templates" on prompt_templates;
create policy "operator write prompt_templates"
on prompt_templates for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
