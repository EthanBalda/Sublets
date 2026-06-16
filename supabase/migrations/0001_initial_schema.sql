-- Sublets · initial schema (Milestone 1)
-- Campus-scoped, .edu-gated student sublet marketplace. v1: UCSD only.
--
-- File order
--   1. Extensions
--   2. Trigger function (referenced by table-attached triggers)
--   3. Tables
--   4. Indexes
--   5. Triggers
--   6. Helper functions (query profiles, so must come AFTER tables)
--   7. Row-Level Security enablement
--   8. Policies
--
-- Notes
--   - profiles.user_id is intentionally NOT a foreign key to auth.users yet.
--     Auth is implemented in a later milestone; the FK will be added then.
--   - All timestamps are timestamptz.
--   - SQL-language functions parse their body at CREATE time, which is why
--     current_profile_id() / is_admin() must be declared after public.profiles.

-- ===========================================================================
-- 1. Extensions
-- ===========================================================================

create extension if not exists pgcrypto;

-- ===========================================================================
-- 2. Trigger function (no table references — safe to create early)
-- ===========================================================================

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- 3. Tables
-- ===========================================================================

create table public.campuses (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  domain_suffix   text not null unique,
  city            text not null,
  state           text not null,
  is_supported    boolean not null default false,
  created_at      timestamptz not null default now()
);

create table public.profiles (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null unique,
  campus_id                 uuid not null references public.campuses(id),
  full_name                 text not null,
  profile_photo_url         text,
  major                     text not null,
  graduation_year           integer not null,
  bio                       text not null default '',
  role                      text not null check (role in ('seeker', 'lister', 'both')),
  is_onboarded              boolean not null default false,
  is_admin                  boolean not null default false,
  is_suspended              boolean not null default false,
  verification_status       text not null default 'unverified',
  id_verification_status    text not null default 'not_started',
  cleanliness               text,
  noise_level               text,
  smoking_preference        text,
  pets_preference           text,
  guests_frequency          text,
  sleep_schedule            text,
  gender_preference         text,
  room_sharing_preference   text,
  heard_from                text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table public.waitlist_entries (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  campus_name       text,
  intent            text not null check (intent in ('list_place', 'find_place', 'both', 'other')),
  target_dates      text,
  budget            text,
  referral_source   text,
  created_at        timestamptz not null default now()
);

create table public.listings (
  id                      uuid primary key default gen_random_uuid(),
  owner_id                uuid not null references public.profiles(id),
  campus_id               uuid not null references public.campuses(id),
  title                   text not null,
  housing_type            text not null,
  monthly_rent            integer not null,
  security_deposit        integer,
  utilities_included      text not null,
  available_start_date    date not null,
  available_end_date      date not null,
  address_private         text,
  neighborhood            text not null,
  distance_to_campus      text,
  bedrooms                numeric not null,
  bathrooms               numeric not null,
  total_roommates         integer,
  room_sharing_required   boolean not null default false,
  parking_available       boolean not null default false,
  laundry_available       boolean not null default false,
  furnished               boolean not null default false,
  pets_allowed            boolean not null default false,
  appliances              text[] not null default '{}',
  description             text not null,
  lease_status            text not null,
  status                  text not null check (status in ('draft', 'published', 'paused', 'filled', 'expired', 'removed')),
  is_featured             boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  filled_at               timestamptz
);

create table public.listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  storage_url  text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create table public.favorites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (user_id, listing_id)
);

create table public.conversations (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id),
  seeker_id    uuid not null references public.profiles(id),
  lister_id    uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (listing_id, seeker_id, lister_id)
);

create table public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  sender_id         uuid not null references public.profiles(id),
  body              text not null,
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

create table public.interest_requests (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id),
  seeker_id      uuid not null references public.profiles(id),
  lister_id      uuid not null references public.profiles(id),
  status         text not null check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  message        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create table public.sublet_checklist_items (
  id                       uuid primary key default gen_random_uuid(),
  interest_request_id      uuid not null references public.interest_requests(id) on delete cascade,
  key                      text not null,
  label                    text not null,
  completed_by_seeker      boolean not null default false,
  completed_by_lister      boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_id         uuid not null references public.profiles(id),
  reported_user_id    uuid references public.profiles(id),
  listing_id          uuid references public.listings(id),
  conversation_id     uuid references public.conversations(id),
  reason              text not null,
  details             text,
  status              text not null check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_notes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.analytics_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id),
  event_name      text not null,
  metadata_json   jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- ===========================================================================
-- 4. Indexes
-- ===========================================================================

create index campuses_is_supported_idx on public.campuses (is_supported);

create index profiles_campus_id_idx on public.profiles (campus_id);
create index profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;

create index waitlist_entries_created_at_idx on public.waitlist_entries (created_at desc);
create index waitlist_entries_campus_name_idx on public.waitlist_entries (campus_name);

create index listings_campus_status_idx on public.listings (campus_id, status);
create index listings_owner_id_idx on public.listings (owner_id);
create index listings_available_window_idx on public.listings (available_start_date, available_end_date);
create index listings_is_featured_idx on public.listings (is_featured) where is_featured = true;

create index listing_photos_listing_id_idx on public.listing_photos (listing_id, sort_order);

create index favorites_user_id_idx on public.favorites (user_id);
create index favorites_listing_id_idx on public.favorites (listing_id);

create index conversations_seeker_id_idx on public.conversations (seeker_id, updated_at desc);
create index conversations_lister_id_idx on public.conversations (lister_id, updated_at desc);
create index conversations_listing_id_idx on public.conversations (listing_id);

create index messages_conversation_id_idx on public.messages (conversation_id, created_at);
create index messages_sender_id_idx on public.messages (sender_id);

create index interest_requests_listing_id_idx on public.interest_requests (listing_id);
create index interest_requests_seeker_id_idx on public.interest_requests (seeker_id, status);
create index interest_requests_lister_id_idx on public.interest_requests (lister_id, status);

create index sublet_checklist_items_request_id_idx
  on public.sublet_checklist_items (interest_request_id);

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reporter_id_idx on public.reports (reporter_id);

create index analytics_events_event_name_idx
  on public.analytics_events (event_name, created_at desc);
create index analytics_events_user_id_idx on public.analytics_events (user_id);

-- ===========================================================================
-- 5. Triggers (use tg_set_updated_at from step 2)
-- ===========================================================================

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.tg_set_updated_at();

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.tg_set_updated_at();

create trigger interest_requests_set_updated_at
  before update on public.interest_requests
  for each row execute function public.tg_set_updated_at();

create trigger sublet_checklist_items_set_updated_at
  before update on public.sublet_checklist_items
  for each row execute function public.tg_set_updated_at();

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.tg_set_updated_at();

-- ===========================================================================
-- 6. Helper functions (query public.profiles — must come AFTER it exists)
-- ===========================================================================

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where user_id = auth.uid()),
    false
  );
$$;

-- ===========================================================================
-- 7. Row-Level Security enablement
-- ===========================================================================

alter table public.campuses                enable row level security;
alter table public.profiles                enable row level security;
alter table public.waitlist_entries        enable row level security;
alter table public.listings                enable row level security;
alter table public.listing_photos          enable row level security;
alter table public.favorites               enable row level security;
alter table public.conversations           enable row level security;
alter table public.messages                enable row level security;
alter table public.interest_requests       enable row level security;
alter table public.sublet_checklist_items  enable row level security;
alter table public.reports                 enable row level security;
alter table public.analytics_events        enable row level security;

-- ===========================================================================
-- 8. Policies
-- ===========================================================================

-- ---------- campuses ----------

create policy campuses_public_read_supported
  on public.campuses for select
  to anon, authenticated
  using (is_supported = true);

create policy campuses_admin_all
  on public.campuses for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- profiles ----------

create policy profiles_self_read
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy profiles_authenticated_read
  on public.profiles for select
  to authenticated
  using (true);

create policy profiles_self_insert
  on public.profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy profiles_self_update
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy profiles_admin_all
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- waitlist_entries ----------

create policy waitlist_public_insert
  on public.waitlist_entries for insert
  to anon, authenticated
  with check (true);

create policy waitlist_admin_read
  on public.waitlist_entries for select
  to authenticated
  using (public.is_admin());

-- ---------- listings ----------

create policy listings_published_read
  on public.listings for select
  to authenticated
  using (status = 'published');

create policy listings_owner_read
  on public.listings for select
  to authenticated
  using (owner_id = public.current_profile_id());

create policy listings_owner_insert
  on public.listings for insert
  to authenticated
  with check (owner_id = public.current_profile_id());

create policy listings_owner_update
  on public.listings for update
  to authenticated
  using (owner_id = public.current_profile_id())
  with check (owner_id = public.current_profile_id());

create policy listings_owner_delete
  on public.listings for delete
  to authenticated
  using (owner_id = public.current_profile_id());

create policy listings_admin_all
  on public.listings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- listing_photos ----------

create policy listing_photos_read
  on public.listing_photos for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and (l.status = 'published' or l.owner_id = public.current_profile_id())
    )
  );

create policy listing_photos_owner_write
  on public.listing_photos for all
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and l.owner_id = public.current_profile_id()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and l.owner_id = public.current_profile_id()
    )
  );

-- ---------- favorites ----------

create policy favorites_owner_read
  on public.favorites for select
  to authenticated
  using (user_id = public.current_profile_id());

create policy favorites_owner_insert
  on public.favorites for insert
  to authenticated
  with check (user_id = public.current_profile_id());

create policy favorites_owner_delete
  on public.favorites for delete
  to authenticated
  using (user_id = public.current_profile_id());

-- ---------- conversations ----------

create policy conversations_participant_read
  on public.conversations for select
  to authenticated
  using (
    seeker_id = public.current_profile_id()
    or lister_id = public.current_profile_id()
  );

create policy conversations_seeker_insert
  on public.conversations for insert
  to authenticated
  with check (seeker_id = public.current_profile_id());

create policy conversations_participant_update
  on public.conversations for update
  to authenticated
  using (
    seeker_id = public.current_profile_id()
    or lister_id = public.current_profile_id()
  )
  with check (
    seeker_id = public.current_profile_id()
    or lister_id = public.current_profile_id()
  );

-- ---------- messages ----------

create policy messages_participant_read
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.seeker_id = public.current_profile_id()
          or c.lister_id = public.current_profile_id()
        )
    )
  );

create policy messages_participant_send
  on public.messages for insert
  to authenticated
  with check (
    sender_id = public.current_profile_id()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.seeker_id = public.current_profile_id()
          or c.lister_id = public.current_profile_id()
        )
    )
  );

create policy messages_participant_update
  on public.messages for update
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.seeker_id = public.current_profile_id()
          or c.lister_id = public.current_profile_id()
        )
    )
  );

-- ---------- interest_requests ----------

create policy interest_requests_participant_read
  on public.interest_requests for select
  to authenticated
  using (
    seeker_id = public.current_profile_id()
    or lister_id = public.current_profile_id()
  );

create policy interest_requests_seeker_insert
  on public.interest_requests for insert
  to authenticated
  with check (seeker_id = public.current_profile_id());

create policy interest_requests_participant_update
  on public.interest_requests for update
  to authenticated
  using (
    seeker_id = public.current_profile_id()
    or lister_id = public.current_profile_id()
  )
  with check (
    seeker_id = public.current_profile_id()
    or lister_id = public.current_profile_id()
  );

-- ---------- sublet_checklist_items ----------

create policy checklist_participant_read
  on public.sublet_checklist_items for select
  to authenticated
  using (
    exists (
      select 1 from public.interest_requests ir
      where ir.id = sublet_checklist_items.interest_request_id
        and (
          ir.seeker_id = public.current_profile_id()
          or ir.lister_id = public.current_profile_id()
        )
    )
  );

create policy checklist_participant_write
  on public.sublet_checklist_items for all
  to authenticated
  using (
    exists (
      select 1 from public.interest_requests ir
      where ir.id = sublet_checklist_items.interest_request_id
        and (
          ir.seeker_id = public.current_profile_id()
          or ir.lister_id = public.current_profile_id()
        )
    )
  )
  with check (
    exists (
      select 1 from public.interest_requests ir
      where ir.id = sublet_checklist_items.interest_request_id
        and (
          ir.seeker_id = public.current_profile_id()
          or ir.lister_id = public.current_profile_id()
        )
    )
  );

-- ---------- reports ----------

create policy reports_user_insert
  on public.reports for insert
  to authenticated
  with check (reporter_id = public.current_profile_id());

create policy reports_user_read_own
  on public.reports for select
  to authenticated
  using (reporter_id = public.current_profile_id());

create policy reports_admin_read
  on public.reports for select
  to authenticated
  using (public.is_admin());

create policy reports_admin_update
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- analytics_events ----------

create policy analytics_self_insert
  on public.analytics_events for insert
  to authenticated
  with check (user_id is null or user_id = public.current_profile_id());

create policy analytics_admin_read
  on public.analytics_events for select
  to authenticated
  using (public.is_admin());
