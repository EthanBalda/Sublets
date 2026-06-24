-- Supabase Storage: listing-photos bucket
-- Public bucket for listing photos.
-- Path convention: {auth_uid}/{listing_id}/{filename}
--   auth_uid = auth.users.id (what auth.uid() returns in policies).
--   Listing ownership is enforced separately by the listing_photos table RLS.
--
-- Run "supabase db push" (or paste into SQL editor) to apply.

-- ===========================================================================
-- 1. Bucket
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  5242880,  -- 5 MB per file
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do nothing;

-- ===========================================================================
-- 2. Storage object policies
-- ===========================================================================

-- Public read: any request (including anonymous) can view objects.
-- The bucket is already marked public, but an explicit policy is best practice
-- for Supabase projects that have RLS enforced on storage.objects.
create policy storage_listing_photos_public_read
  on storage.objects for select
  to public
  using (bucket_id = 'listing-photos');

-- Authenticated insert: uploads only permitted under the requester's own
-- auth.uid() prefix.  split_part extracts the first path segment before '/'.
create policy storage_listing_photos_owner_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-photos'
    and split_part(name, '/', 1) = (auth.uid())::text
  );

-- Authenticated update: users can only replace objects they uploaded.
create policy storage_listing_photos_owner_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and split_part(name, '/', 1) = (auth.uid())::text
  );

-- Authenticated delete: users can only remove objects they uploaded.
create policy storage_listing_photos_owner_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and split_part(name, '/', 1) = (auth.uid())::text
  );
