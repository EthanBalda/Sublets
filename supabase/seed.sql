-- Sublets · seed data (Milestone 1)
-- Idempotent inserts so this can be re-run during dev.
-- UUIDs are fixed string literals; not derived from real auth.users yet.

-- ---------------------------------------------------------------------------
-- Campus
-- ---------------------------------------------------------------------------

insert into public.campuses (id, name, domain_suffix, city, state, is_supported)
values (
  '00000000-0000-0000-0000-0000000000c1',
  'UC San Diego',
  'ucsd.edu',
  'San Diego',
  'CA',
  true
)
on conflict (domain_suffix) do nothing;

-- ---------------------------------------------------------------------------
-- Owner profiles
-- ---------------------------------------------------------------------------

insert into public.profiles (
  id, user_id, campus_id, full_name, major, graduation_year,
  bio, role, is_onboarded, verification_status
)
values
  ('11111111-1111-1111-1111-111111111101',
   '22222222-2222-2222-2222-222222222201',
   '00000000-0000-0000-0000-0000000000c1',
   'Maya R.', 'Cognitive Science', 2026,
   'Going home for summer, looking for someone chill to take my room.',
   'lister', true, 'edu_verified'),
  ('11111111-1111-1111-1111-111111111102',
   '22222222-2222-2222-2222-222222222202',
   '00000000-0000-0000-0000-0000000000c1',
   'Jordan P.', 'Mechanical Engineering', 2025,
   'Studying abroad in the fall. Quiet, tidy, easygoing.',
   'lister', true, 'edu_verified'),
  ('11111111-1111-1111-1111-111111111103',
   '22222222-2222-2222-2222-222222222203',
   '00000000-0000-0000-0000-0000000000c1',
   'Priya S.', 'Biology', 2027,
   'Doing a summer internship in SF — need someone to cover my lease.',
   'lister', true, 'edu_verified'),
  ('11111111-1111-1111-1111-111111111104',
   '22222222-2222-2222-2222-222222222204',
   '00000000-0000-0000-0000-0000000000c1',
   'Diego M.', 'Data Science', 2026,
   'Subletting my room while I do a field season in Costa Rica.',
   'lister', true, 'edu_verified'),
  ('11111111-1111-1111-1111-111111111105',
   '22222222-2222-2222-2222-222222222205',
   '00000000-0000-0000-0000-0000000000c1',
   'Hannah L.', 'Political Science', 2025,
   'Moving early for a new job. Lease ends in August.',
   'lister', true, 'edu_verified'),
  ('11111111-1111-1111-1111-111111111106',
   '22222222-2222-2222-2222-222222222206',
   '00000000-0000-0000-0000-0000000000c1',
   'Wesley K.', 'Computer Science', 2026,
   'Two-room sublet near campus, prefer another student.',
   'both', true, 'edu_verified')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Listings
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
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
   '11111111-1111-1111-1111-111111111101',
   '00000000-0000-0000-0000-0000000000c1',
   'Private room in La Jolla Village 2BR, 5 min walk to UCSD',
   'private_room', 1450, 1450, 'partial_water_trash',
   '2026-06-22', '2026-09-15',
   'La Jolla Village', '5 min walk',
   1, 1, 1, false,
   false, true, true, false,
   array['fridge','dishwasher','microwave','in_unit_laundry'],
   'Furnished private room in a clean 2BR I share with one other student. South-facing window, lots of light. Walking distance to Pepper Canyon and Geisel.',
   'have_signed_lease', 'published', true),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02',
   '11111111-1111-1111-1111-111111111102',
   '00000000-0000-0000-0000-0000000000c1',
   'Studio sublet in UTC, fully furnished, fall quarter',
   'studio', 2100, 2100, 'none',
   '2026-09-20', '2026-12-20',
   'University City', '15 min bike',
   0, 1, 0, false,
   true, true, true, false,
   array['fridge','dishwasher','microwave','in_unit_laundry','ac'],
   'My studio while I''m abroad. Building has a gym and pool. Bus stop to campus right outside.',
   'need_landlord_approval', 'published', false),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03',
   '11111111-1111-1111-1111-111111111103',
   '00000000-0000-0000-0000-0000000000c1',
   'Room in 3BR Mira Mesa house, summer only',
   'private_room', 1100, 1100, 'all_included',
   '2026-06-15', '2026-09-01',
   'Mira Mesa', '20 min bus',
   1, 1.5, 2, false,
   true, true, true, false,
   array['fridge','dishwasher','in_unit_laundry'],
   'Quiet house with two other UCSD students. Backyard, parking, easy bus to campus. Looking for a clean, respectful subletter.',
   'have_signed_lease', 'published', false),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04',
   '11111111-1111-1111-1111-111111111104',
   '00000000-0000-0000-0000-0000000000c1',
   'Shared room in Clairemont 4BR — summer field season sublet',
   'shared_room', 750, 500, 'partial_water_trash',
   '2026-06-25', '2026-08-30',
   'Clairemont', '25 min bus',
   1, 1, 3, true,
   true, true, true, false,
   array['fridge','microwave','laundry_in_building'],
   'Sharing a room (two twin beds, separate desks) in a house with three other students. Lots of board games, backyard with grill.',
   'verbal_agreement', 'published', false),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa05',
   '11111111-1111-1111-1111-111111111105',
   '00000000-0000-0000-0000-0000000000c1',
   '1BR Pacific Beach apartment, ocean breeze, July–August',
   '1br_apartment', 2400, 1200, 'partial_water_trash',
   '2026-07-01', '2026-08-31',
   'Pacific Beach', '30 min bus',
   1, 1, 0, false,
   false, true, true, true,
   array['fridge','dishwasher','microwave','ac'],
   'My 1BR a few blocks from the beach. Small (cat-friendly), bright, good natural light. Bus to campus is straightforward.',
   'have_signed_lease', 'published', false),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa06',
   '11111111-1111-1111-1111-111111111106',
   '00000000-0000-0000-0000-0000000000c1',
   'Private room in 4BR Costa Verde townhouse, year-long lease takeover',
   'private_room', 1300, 1300, 'partial_water_trash',
   '2026-08-15', '2027-06-30',
   'Costa Verde', '10 min walk',
   1, 2, 3, false,
   true, true, false, false,
   array['fridge','dishwasher','microwave','in_unit_laundry'],
   'Lease takeover for the room I currently rent. Three other UCSD seniors, mostly engineers. Quiet weekdays, social-ish weekends.',
   'need_landlord_approval', 'published', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Listing photos (storage_url is a placeholder until Storage is wired up)
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
