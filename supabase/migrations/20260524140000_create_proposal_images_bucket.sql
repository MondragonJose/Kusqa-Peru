-- KUSQA: proposal-images Storage Bucket
-- Bucket para almacenar imágenes de propuestas cívicas
-- Regenerate types: supabase gen types typescript --local > src/types/supabase.generated.ts

-- Insert bucket configuration
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proposal-images',
  'proposal-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- RLS Policies for proposal-images bucket

-- Usuarios autenticados pueden subir imágenes
create policy "proposal-images_upload_authenticated"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'proposal-images' and
    auth.role() = 'authenticated'
  );

-- Usuarios autenticados pueden ver imágenes (bucket es público)
create policy "proposal-images_select_public"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'proposal-images');

-- Usuarios pueden eliminar sus propias imágenes
create policy "proposal-images_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'proposal-images' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Usuarios pueden actualizar sus propias imágenes
create policy "proposal-images_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'proposal-images' and
    auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'proposal-images' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

comment on table storage.buckets is 'Bucket para imágenes de propuestas cívicas.';
