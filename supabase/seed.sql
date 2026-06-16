-- Sublets · seed data (Milestone 1)
-- Demo-only rows for local + preview environments.
-- Idempotent: re-running this file will not duplicate rows.
--
-- All references to the UCSD campus are looked up at insert time via
-- `where domain_suffix = 'ucsd.edu'`, so this script works regardless of the
-- specific uuid the campuses row ended up with.

-- ---------------------------------------------------------------------------
-- 1. Campus — UCSD must exist before anything references it
-- ---------------------------------------------------------------------------

insert into public.campuses (name, domain_suffix, city, state, is_supported)
values ('UC San Diego', 'ucsd.edu', 'San Diego', 'CA', true)
on conflict (domain_suffix) do nothing;

-- Fail loudly if the row somehow isn't there before the downstream inserts.
do $$
begin
  if not exists (
    select 1 from public.campuses where domain_suffix = 'ucsd.edu'
  ) then
    raise exception 'Seed: UCSD campus row missing — aborting.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Demo owner profiles
--    campus_id is selected from public.campuses by domain_suffix.
--    Demo profile + user UUIDs are stable so referencing rows (listings,
--    photos) keep working across re-runs.
-- ---------------------------------------------------------------------------

insert into public.profiles (
  id, user_id, campus_id,
  full_name, major, graduation_year,
  bio, role, is_onboarded, verification_status
)
select
  v.id, v.user_id, c.id,
  v.full_name, v.major, v.graduation_year,
  v.bio, v.role, true, 'edu_verified'
from public.campuses c
cross join (values
  ('11111111-1111-1111-1111-111111111101'::uuid,
   '22222222-2222-2222-2222-222222222201'::uuid,
   'Maya R.', 'Cognitive Science', 2026,
   'Going home for summer, looking for someone chill to take my room.',
   'lister'),
  ('11111111-1111-1111-1111-111111111102'::uuid,
   '22222222-2222-2222-2222-222222222202'::uuid,
   'Jordan P.', 'Mechanical Engineering', 2025,
   'Studying abroad in the fall. Quiet, tidy, easygoing.',
   'lister'),
  ('11111111-1111-1111-1111-111111111103'::uuid,
   '22222222-2222-2222-2222-222222222203'::uuid,
   'Priya S.', 'Biology', 2027,
   'Doing a summer internship in SF — need someone to cover my lease.',
   'lister'),
  ('11111111-1111-1111-1111-111111111104'::uuid,
   '22222222-2222-2222-2222-222222222204'::uuid,
   'Diego M.', 'Data Science', 2026,
   'Subletting my room while I do a field season in Costa Rica.',
   'lister'),
  ('11111111-1111-1111-1111-111111111105'::uuid,
   '22222222-2222-2222-2222-222222222205'::uuid,
   'Hannah L.', 'Political Science', 2025,
   'Moving early for a new job. Lease ends in August.',
   'lister'),
  ('11111111-1111-1111-1111-111111111106'::uuid,
   '22222222-2222-2222-2222-222222222206'::uuid,
   'Wesley K.', 'Computer Science', 2026,
   'Two-room sublet near campus, prefer another student.',
   'both')
) as v(id, user_id, full_name, major, graduation_year, bio, role)
where c.domain_suffix = 'ucsd.edu'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3. Demo listings
--    owner_id values match the demo profiles above. campus_id is looked up.
-- ---------------------------------------------------------------------------

insert into public.listings (
  id, owner_id, campus_id,
  title, housing_type, monthly_rent, security_deposit, utilities_included,
  available_start_date, available_end_date,
  neighborhood, distance_to_campus,
  bedrooms, bathrooms, total_roommates, room_sharing_required,
  parking_available, laundry_available, furnished, pets_allowed,
  appliances, description, lease_status, status, is_featured
)
select
  v.id, v.owner_id, c.id,
  v.title, v.housing_type, v.monthly_rent, v.security_deposit, v.utilities_included,
  v.available_start_date, v.available_end_date,
  v.neighborhood, v.distance_to_campus,
  v.bedrooms, v.bathrooms, v.total_roommates, v.room_sharing_required,
  v.parking_available, v.laundry_available, v.furnished, v.pets_allowed,
  v.appliances, v.description, v.lease_status, v.status, v.is_featured
from public.campuses c
cross join (values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01'::uuid,
   '11111111-1111-1111-1111-111111111101'::uuid,
   'Private room in La Jolla Village 2BR, 5 min walk to UCSD',
   'private_room', 1450::integer, 1450::integer, 'partial_water_trash',
   '2026-06-22'::date, '2026-09-15'::date,
   'La Jolla Village', '5 min walk',
   1::numeric, 1::numeric, 1::integer, false,
   false, true, true, false,
   array['fridge','dishwasher','microwave','in_unit_laundry']::text[],
   'Furnished private room in a clean 2BR I share with one other student. South-facing window, lots of light. Walking distance to Pepper Canyon and Geisel.',
   'have_signed_lease', 'published', true),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02'::uuid,
   '11111111-1111-1111-1111-111111111102'::uuid,
   'Studio sublet in UTC, fully furnished, fall quarter',
   'studio', 2100, 2100, 'none',
   '2026-09-20'::date, '2026-12-20'::date,
   'University City', '15 min bike',
   0, 1, 0, false,
   true, true, true, false,
   array['fridge','dishwasher','microwave','in_unit_laundry','ac'],
   'My studio while I''m abroad. Building has a gym and pool. Bus stop to campus right outside.',
   'need_landlord_approval', 'published', false),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03'::uuid,
   '11111111-1111-1111-1111-111111111103'::uuid,
   'Room in 3BR Mira Mesa house, summer only',
   'private_room', 1100, 1100, 'all_included',
   '2026-06-15'::date, '2026-09-01'::date,
   'Mira Mesa', '20 min bus',
   1, 1.5, 2, false,
   true, true, true, false,
   array['fridge','dishwasher','in_unit_laundry'],
   'Quiet house with two other UCSD students. Backyard, parking, easy bus to campus. Looking for a clean, respectful subletter.',
   'have_signed_lease', 'published', false),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04'::uuid,
   '11111111-1111-1111-1111-111111111104'::uuid,
   'Shared room in Clairemont 4BR — summer field season sublet',
   'shared_room', 750, 500, 'partial_water_trash',
   '2026-06-25'::date, '2026-08-30'::date,
   'Clairemont', '25 min bus',
   1, 1, 3, true,
   true, true, true, false,
   array['fridge','microwave','laundry_in_building'],
   'Sharing a room (two twin beds, separate desks) in a house with three other students. Lots of board games, backyard with grill.',
   'verbal_agreement', 'published', false),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa05'::uuid,
   '11111111-1111-1111-1111-111111111105'::uuid,
   '1BR Pacific Beach apartment, ocean breeze, July–August',
   '1br_apartment', 2400, 1200, 'partial_water_trash',
   '2026-07-01'::date, '2026-08-31'::date,
   'Pacific Beach', '30 min bus',
   1, 1, 0, false,
   false, true, true, true,
   array['fridge','dishwasher','microwave','ac'],
   'My 1BR a few blocks from the beach. Small (cat-friendly), bright, good natural light. Bus to campus is straightforward.',
   'have_signed_lease', 'published', false),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa06'::uuid,
   '11111111-1111-1111-1111-111111111106'::uuid,
   'Private room in 4BR Costa Verde townhouse, year-long lease takeover',
   'private_room', 1300, 1300, 'partial_water_trash',
   '2026-08-15'::date, '2027-06-30'::date,
   'Costa Verde', '10 min walk',
   1, 2, 3, false,
   true, true, false, false,
   array['fridge','dishwasher','microwave','in_unit_laundry'],
   'Lease takeover for the room I currently rent. Three other UCSD seniors, mostly engineers. Quiet weekdays, social-ish weekends.',
   'need_landlord_approval', 'published', false)
) as v(
  id, owner_id,
  title, housing_type, monthly_rent, security_deposit, utilities_included,
  available_start_date, available_end_date,
  neighborhood, distance_to_campus,
  bedrooms, bathrooms, total_roommates, room_sharing_required,
  parking_available, laundry_available, furnished, pets_allowed,
  appliances, description, lease_status, status, is_featured
)
where c.domain_suffix = 'ucsd.edu'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Listing photos
--    listing_id values match the demo listings above. No campus lookup needed.
--    storage_url is a placeholder until Supabase Storage is wired up.
-- ---------------------------------------------------------------------------

insert into public.listing_photos (id, listing_id, storage_url, sort_order)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
   'placeholder://listing-1-cover', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02',
   'placeholder://listing-2-cover', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03',
   'placeholder://listing-3-cover', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04',
   'placeholder://listing-4-cover', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa05',
   'placeholder://listing-5-cover', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa06',
   'placeholder://listing-6-cover', 0)
on conflict (id) do nothing;
