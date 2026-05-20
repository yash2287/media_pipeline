-- Storage bucket for the pipeline. Single private bucket "assets" used for raw,
-- cutout, generated, upscaled, final, companion, reference, and delivery archives.
-- All reads go through signed URLs (apps/web/lib/data.ts + trigger/lib/state.ts).
--
-- Idempotent: safe to re-apply if the bucket was already created manually.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assets',
  'assets',
  false,
  60 * 1024 * 1024, -- 60 MB ceiling (raw photos up to 25 MB; delivery zips can be larger)
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Policies on storage.objects. Single-tenant operator console — any authenticated
-- session can read/write inside the assets bucket. Service-role bypasses RLS so
-- Trigger.dev pipeline workers are unaffected by these policies.

drop policy if exists "assets bucket read (authenticated)" on storage.objects;
create policy "assets bucket read (authenticated)"
on storage.objects for select
to authenticated
using (bucket_id = 'assets');

drop policy if exists "assets bucket insert (authenticated)" on storage.objects;
create policy "assets bucket insert (authenticated)"
on storage.objects for insert
to authenticated
with check (bucket_id = 'assets');

drop policy if exists "assets bucket update (authenticated)" on storage.objects;
create policy "assets bucket update (authenticated)"
on storage.objects for update
to authenticated
using (bucket_id = 'assets')
with check (bucket_id = 'assets');

drop policy if exists "assets bucket delete (authenticated)" on storage.objects;
create policy "assets bucket delete (authenticated)"
on storage.objects for delete
to authenticated
using (bucket_id = 'assets');
