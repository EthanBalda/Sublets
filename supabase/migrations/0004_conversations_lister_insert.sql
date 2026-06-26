-- Allow a lister to INSERT a conversation when an accepted interest_request
-- already links the (listing_id, seeker_id, lister_id) triple.
--
-- Background: the original conversations_seeker_insert policy only permits
-- seekers to create conversations. This blocked listers from opening a chat
-- after accepting a request — they could only read existing conversations.
-- Adding this complementary policy lets either participant start the thread
-- once a request is accepted, while keeping the guard tight: the lister must
-- own the matching accepted request.
create policy conversations_lister_insert
  on public.conversations for insert
  to authenticated
  with check (
    lister_id = public.current_profile_id()
    and exists (
      select 1 from public.interest_requests ir
      where ir.listing_id = conversations.listing_id
        and ir.seeker_id  = conversations.seeker_id
        and ir.lister_id  = public.current_profile_id()
        and ir.status     = 'accepted'
    )
  );
