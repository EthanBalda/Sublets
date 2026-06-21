-- Admin-read policies for tables queried by the analytics dashboard.
-- Without these, RLS scopes counts to the admin's own rows, producing silent zeros.

create policy favorites_admin_read
  on public.favorites for select
  to authenticated
  using (public.is_admin());

create policy conversations_admin_read
  on public.conversations for select
  to authenticated
  using (public.is_admin());

create policy messages_admin_read
  on public.messages for select
  to authenticated
  using (public.is_admin());

create policy interest_requests_admin_read
  on public.interest_requests for select
  to authenticated
  using (public.is_admin());
