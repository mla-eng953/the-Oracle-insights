-- Private storage bucket for any user-generated content
-- (avatars, dispute attachments, etc.). All access goes through
-- short-lived signed URLs minted by edge functions.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-content',
  'user-content',
  false,
  5 * 1024 * 1024,
  array['image/png','image/jpeg','image/webp','application/pdf']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- RLS: only the owning user (objects are stored under `${user_id}/...`).
create policy "user_content_owner_read" on storage.objects
  for select using (
    bucket_id = 'user-content'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "user_content_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'user-content'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "user_content_owner_update" on storage.objects
  for update using (
    bucket_id = 'user-content'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "user_content_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'user-content'
    and auth.uid()::text = split_part(name, '/', 1)
  );
