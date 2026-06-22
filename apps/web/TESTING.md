# Manual QA — Sublets MVP

Step-by-step manual test flows for the full Sublets v1 feature set. Run these before every release. Each section lists the setup, steps, and expected outcome.

---

## Setup

Before running QA you need:

- `npm run dev` running at `http://localhost:3000`
- A Supabase project with the schema migrated (`0001_initial_schema.sql` + `0002_admin_analytics_rls.sql`) and seed data loaded (`seed.sql`)
- Email confirmation **disabled** in Supabase Dashboard → Authentication → Sign In / Up → Email → Confirm email (toggle off for local dev)
- Three test accounts:
  - **User A** — `a@ucsd.edu` (lister)
  - **User B** — `b@ucsd.edu` (seeker)
  - **Admin** — `admin@ucsd.edu` with `is_admin = true` (see below)

### Make a user admin

After onboarding, run in Supabase SQL Editor:

```sql
update public.profiles
set is_admin = true
where user_id = (
  select id from auth.users where email = 'admin@ucsd.edu'
);
```

---

## 1. Auth flows

### 1a. Non-.edu sign-up is blocked

1. Go to `/login`.
2. Enter `test@gmail.com` and a password ≥ 6 chars. Click **Sign up**.
3. **Expected:** Redirected to `/waitlist?reason=non-edu`. No account created.

### 1b. Non-UCSD .edu is redirected to waitlist

1. Go to `/login`.
2. Enter `test@stanford.edu` and a password. Click **Sign up**.
3. **Expected:** Redirected to `/waitlist?reason=non-ucsd`. No marketplace access.

### 1c. UCSD sign-up and onboarding

1. Go to `/login`.
2. Enter `a@ucsd.edu` and a password ≥ 6 chars. Click **Sign up**.
3. **Expected:** Redirected to `/onboarding`.
4. Fill full name, major, graduation year, bio, select role = **Both**.
5. Click **Complete profile**.
6. **Expected:** Redirected to `/explore`. Bottom nav is visible.

### 1d. UCSD log in (returning user)

1. Sign out if signed in.
2. Go to `/login`. Enter `a@ucsd.edu` and the same password. Click **Log in**.
3. **Expected:** Redirected to `/explore`.

### 1e. Logout

1. Go to `/dashboard`. Open **Account details**. Click **Sign out**.
2. **Expected:** Redirected to `/login`. Navigating to `/explore` redirects back to `/login`.

### 1f. Protected routes block unauthenticated users

1. While signed out, navigate to `/explore`, `/dashboard`, `/messages`.
2. **Expected:** Each redirects to `/login`.

### 1g. Admin route blocks non-admins

1. Sign in as User A (non-admin). Navigate to `/admin`.
2. **Expected:** Redirected to `/dashboard`. No error or hint that `/admin` exists.

### 1h. Suspended user is blocked

1. As admin, go to `/admin`, find User B, click **Suspend**.
2. Sign out. Sign in as User B.
3. **Expected:** Any gated page redirects to `/suspended`.
4. As admin, click **Unsuspend**. Sign back in as User B → marketplace access restored.

---

## 2. Listing creation and management

### 2a. Create a draft listing

1. Sign in as User A. Go to `/dashboard`. Click **New listing** (or `/listings/new`).
2. Fill only the title field. Click **Save as draft**.
3. **Expected:** Redirected to `/dashboard`. Listing appears under *Your listings* with a `Draft` badge.

### 2b. Publish validation rejects incomplete listings

1. Go to the draft listing form. Clear the title. Click **Publish listing**.
2. **Expected:** Inline field errors appear. No redirect.

### 2c. Publish a listing

1. Fill all required fields (title, housing type, description, rent, utilities, start date, end date, neighborhood, bedrooms, bathrooms, lease status).
2. Click **Publish listing**.
3. **Expected:** Redirected to `/listings/[id]` — the public listing detail page.

### 2d. Edit a listing

1. From `/dashboard`, click **Edit** on a published listing.
2. Change the description. Click **Save changes**.
3. **Expected:** Changes persist on `/listings/[id]`.

### 2e. Owner cannot edit another user's listing

1. As User B, navigate directly to `/listings/[id]/edit` for one of User A's listings.
2. **Expected:** Not-found page (listing not returned because owner check fails server-side).

### 2f. Pause a listing

1. As User A, on a published listing row in `/dashboard`, click **Pause**.
2. **Expected:** Badge changes to `Paused`. Listing disappears from `/explore`.

### 2g. Re-publish a paused listing

1. On the paused listing row, click **Re-publish**.
2. **Expected:** Badge returns to `Published`. Listing reappears on `/explore`.

### 2h. Delete a draft

1. On a draft listing row, click **Delete**.
2. **Expected:** Draft is removed from the dashboard list.

### 2i. Private address is not publicly visible

1. Edit a listing and add an exact address in **Exact address (private)** field.
2. Save. Visit `/listings/[id]` as User B (a non-owner).
3. **Expected:** The exact address does not appear anywhere on the page. Only `Neighborhood` and `Distance to campus` are shown.
4. Open browser DevTools → Network. Check the JSON response for the listing fetch — confirm `address_private` is absent.

---

## 3. Explore, filters, and favorites

### 3a. Browse published listings

1. Sign in as User B. Go to `/explore`.
2. **Expected:** All published listings appear as cards. Drafts, paused, filled, removed listings are absent.

### 3b. Filters

1. Click **Filters**. Set **Min price** to `1000`, **Max price** to `2000`. Click **Apply filters**.
2. **Expected:** URL updates to `/explore?min_price=1000&max_price=2000`. Only listings in range appear.
3. Click **Reset**. **Expected:** URL clears. All listings reappear.

### 3c. Sort

1. Change the sort dropdown to **Lowest price**.
2. **Expected:** Listing order updates; cheapest listing appears first without page reload.

### 3d. Save a listing

1. Tap the heart icon on a listing card. **Expected:** Heart fills immediately (optimistic UI). Count on `/saved` increases by 1.

### 3e. Unsave a listing

1. Tap the filled heart again. **Expected:** Heart empties immediately. Listing removed from `/saved`.

### 3f. Saved listings page

1. Go to `/saved`.
2. **Expected:** All saved listings appear. If a saved listing was paused/filled since saving, a status badge is shown.
3. With no saved listings: **Expected:** "You haven't saved any listings yet." with a Browse Explore link.

---

## 4. Messaging

### 4a. Seeker messages a lister

1. As User B, go to `/listings/[id]` for one of User A's published listings.
2. Click **Message**. **Expected:** Redirected to `/messages/[conversationId]`.
3. Type a message and click **Send**. **Expected:** Message appears immediately in the thread.

### 4b. Lister sees the message

1. Sign in as User A. Go to `/messages`.
2. **Expected:** Conversation with User B appears, showing a preview of the last message.

### 4c. Cannot message your own listing

1. As User A, visit your own published listing at `/listings/[id]`.
2. **Expected:** The **Message** button is not present.

### 4d. Cannot message about a non-published listing

1. Pause a listing as User A. Sign in as User B.
2. Visit the listing's detail page (use the direct URL).
3. **Expected:** The **Message** button is absent.

### 4e. Conversation report

1. As User B, on `/messages/[conversationId]`, click **Report conversation**.
2. Select a reason, add optional details, click **Submit report**.
3. **Expected:** Report button turns into a green "Report sent" badge.

---

## 5. Interest requests

### 5a. Seeker sends a request

1. As User B, on a published listing by User A, click **Request to sublet**.
2. Optionally add a note. Click **Send request**.
3. **Expected:** Redirected to `/requests/[id]` with status `Pending`.

### 5b. Duplicate request is prevented

1. Visit the same listing again. **Expected:** The request button reflects the existing request state; clicking redirects to the existing request instead of creating a new one.

### 5c. Lister accepts a request

1. As User A, go to `/dashboard` → *Incoming requests*. Open the request.
2. Click **Accept**. **Expected:** Status changes to `Accepted`. Checklist items appear.

### 5d. Lister declines a request

1. Create a fresh request as User B on a different listing.
2. As User A, open the request and click **Decline**.
3. **Expected:** Status changes to `Declined`.

### 5e. Seeker cancels a pending request

1. As User B, on a pending request, click **Cancel**.
2. **Expected:** Status changes to `Cancelled`.

### 5f. Checklist — both sides complete items

1. Accept a request (User A). Open the request as User A.
2. Toggle a checklist item on the *Lister (you)* side. **Expected:** Toggle updates immediately.
3. Sign in as User B. Open the same request.
4. Toggle the same item on the *Seeker (you)* side. **Expected:** Toggle updates; item shows both sides checked.

### 5g. Mark sublet completed → listing fills

1. Complete all 7 × 2 checklist toggles (both sides for each item).
2. As User A (lister), click **Mark sublet completed**.
3. **Expected:**
   - Request status → `Completed`.
   - Listing status → `Filled` (badge on dashboard, listing gone from `/explore`).

---

## 6. Reports and admin moderation

### 6a. Submit a listing report

1. As User B, visit a listing by User A. Click **Report**.
2. Select reason *Inaccurate listing*. Optionally add details. Click **Submit report**.
3. **Expected:** Report button becomes a green "Report sent" badge.

### 6b. Report form requires a reason

1. Open the report form. Leave reason blank. Click **Submit report**.
2. **Expected:** Inline error. Form does not submit.

### 6c. Cannot report your own listing

1. As User A, visit your own listing. **Expected:** No **Report** button present.

### 6d. Admin views and triages reports

1. Sign in as admin. Go to `/admin`. **Expected:** Reports section shows the new report under `Open`.
2. Type a triage note in *Admin notes*. Click **Save notes**. Refresh. **Expected:** Note persists.
3. Click **Mark reviewing**. **Expected:** Report moves to the `Reviewing` filter.
4. Click **Resolve**. **Expected:** Report moves to the `Resolved` filter.

### 6e. Admin removes a listing

1. In `/admin` → Listings, find a published listing. Click **Remove**.
2. **Expected:** Status changes to `Removed`. Listing disappears from `/explore`. The listing's detail page still loads for the owner and admin.

### 6f. Admin restores a listing

1. In Listings → filter to `Removed`. Click **Restore to paused**.
2. **Expected:** Status changes to `Paused` (not Published — owner must re-publish explicitly).

### 6g. Admin suspends a user

1. In `/admin` → Users, find User B. Click **Suspend**.
2. **Expected:** User B's row shows *Suspended* badge.
3. Sign out, sign in as User B. **Expected:** Redirected to `/suspended`.
4. As admin, click **Unsuspend**. Sign back in as User B → access restored.

### 6h. Admin cannot suspend their own account

1. As admin, find your own row in the Users table. **Expected:** The Suspend button is either absent or disabled with a tooltip.

### 6i. Admin updates ID verification status

1. In Users, find User B. Change the **ID status** dropdown to `Verified`.
2. **Expected:** Dropdown persists after page refresh.

### 6j. Non-admin blocked from /admin

1. Sign in as User A (non-admin). Navigate to `/admin`.
2. **Expected:** Redirected to `/dashboard`. No error message or hint that the page exists.

---

## 7. Analytics

### 7a. Trigger analytics events

1. As User B, save and unsave a listing, send a message, create and cancel a request, submit a report.
2. These actions write rows into `analytics_events`. Verify via Supabase SQL Editor:
   ```sql
   select event_name, created_at from public.analytics_events order by created_at desc limit 20;
   ```
3. **Expected:** Rows for `listing_saved`, `listing_unsaved`, `message_sent`, `interest_request_created`, `interest_request_cancelled`, `report_submitted`.

### 7b. View admin analytics dashboard

1. Sign in as admin. Visit `/admin/analytics`.
2. **Expected:** All six metric sections render with numbers ≥ 0.
3. Verify each section title is present: Users, Listings, Engagement, Interest requests, Moderation, Acquisition source.

### 7c. Analytics counts update after actions

1. Note the current **Favorites** count. As User B, save a listing. Refresh `/admin/analytics`.
2. **Expected:** Favorites count increased by 1.

### 7d. Analytics gating — non-admin blocked

1. Sign in as User B (non-admin). Navigate to `/admin/analytics`.
2. **Expected:** Redirected to `/dashboard`.

### 7e. Acquisition source table

1. Ensure at least two test users answered different *Heard from* values during onboarding.
2. Check `/admin/analytics` → Acquisition source table.
3. **Expected:** Each distinct `heard_from` value appears as a row with its count, sorted descending.

---

## 8. Loading, error, and empty states

### 8a. Loading skeletons appear during navigation

1. Open DevTools → Network → set throttling to **Slow 3G**.
2. Navigate between `/explore`, `/dashboard`, `/messages`.
3. **Expected:** Pulse skeleton appears for ~1–2 seconds before content loads.

### 8b. Empty states

| Route | How to trigger | Expected copy |
|---|---|---|
| `/explore` (no listings) | Delete or pause all seed listings | "No listings yet — be the first." + Post a sublet button |
| `/explore` (narrow filter) | Set min_price = 999999 | "No listings match these filters" + Reset button |
| `/saved` | Remove all favorites | "You haven't saved any listings yet." |
| `/dashboard` listings | Delete all own listings | "No listings yet" section |
| `/messages` | Use fresh account with no conversations | "You don't have any messages yet." |
| `/admin` reports | Clear all reports | "No reports in status open" |

### 8c. Error states

1. Temporarily break the Supabase URL in `.env.local` (set to an invalid value).
2. Restart dev server. Visit `/explore`.
3. **Expected:** Friendly red error panel, not a raw stack trace.
4. Restore the URL.

---

## 9. Privacy and safety copy

Verify these disclaimers appear in the correct places:

| Location | Required copy |
|---|---|
| `/onboarding` | "Sublets currently verifies student email only. Government ID verification is not active in this MVP." |
| `/dashboard` | Both disclaimers (email-only + legal/payments) |
| `/listings/new` and `/listings/[id]/edit` | Both disclaimers (above submit buttons) |
| `/listings/[id]` | "Sublets helps organize the sublet process. It does not provide legal advice, process payments, or replace landlord approval." |
| `/requests/[id]` | Legal disclaimer |
| Marketing landing `/` | Legal disclaimer |

---

## 10. Accessibility spot-check

1. Tab through the login form — every field and button must be reachable and have a visible focus ring.
2. Tab through `/explore` — listing cards, filter button, sort dropdown, heart buttons all reachable.
3. Open a screen reader (macOS VoiceOver: ⌘F5). Navigate `/listings/[id]`. Verify heading structure is announced: h1 (title) → h2 (Amenities) → h2 (About this sublet).
4. Check listing card images in DevTools — `alt` attribute should be the listing title (not empty).
5. On mobile (375 px viewport or DevTools responsive mode): verify all buttons are ≥ 44 px tap target, no horizontal scrolling occurs, form fields are readable.

---

## 11. Final pre-deployment checks

```bash
npm run lint    # must pass with 0 errors
npm run build   # must complete without errors
```

1. Open the production build (`npm run start`) and walk through Auth → Explore → Listing detail → Message → Request.
2. Confirm no console errors appear on these core flows.
3. Confirm `.env.local` is NOT committed: `git status` should not list it.
