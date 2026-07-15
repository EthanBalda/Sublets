-- interest_requests hardening (found in production-readiness review)
--
-- 1. Partial unique index on open requests.
--    Both clients already handle unique-violation 23505 on insert (mobile
--    treats it as "already requested"; web dedupes before insert), but no
--    constraint actually existed — so a double-tap race could create two
--    pending requests for the same (listing, seeker). This makes the
--    existing 23505 handling real. Closed requests (declined / cancelled /
--    completed) stay unconstrained so a seeker can re-request later.
--
--    NOTE: this CREATE fails if duplicate open requests already exist.
--    Check first with:
--      select listing_id, seeker_id, count(*)
--      from public.interest_requests
--      where status in ('pending', 'accepted')
--      group by 1, 2 having count(*) > 1;
--
-- 2. Role-scoped UPDATE policies.
--    The original interest_requests_participant_update policy let EITHER
--    participant set ANY status — e.g. a seeker could mark their own request
--    "accepted" via a direct API call, unlocking messaging without the
--    lister's consent. App code (mobile + web server actions) already
--    enforces roles; this makes the database enforce them too:
--      - lister: may move a request to accepted / declined / completed
--      - seeker: may only cancel a still-pending request
--    These are the only transitions either client performs.

create unique index interest_requests_open_unique_idx
  on public.interest_requests (listing_id, seeker_id)
  where status in ('pending', 'accepted');

drop policy interest_requests_participant_update on public.interest_requests;

create policy interest_requests_lister_update
  on public.interest_requests for update
  to authenticated
  using (lister_id = public.current_profile_id())
  with check (
    lister_id = public.current_profile_id()
    and status in ('accepted', 'declined', 'completed')
  );

create policy interest_requests_seeker_cancel
  on public.interest_requests for update
  to authenticated
  using (
    seeker_id = public.current_profile_id()
    and status = 'pending'
  )
  with check (
    seeker_id = public.current_profile_id()
    and status = 'cancelled'
  );
