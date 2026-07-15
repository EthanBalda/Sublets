# Sublets

Verified student sublets, campus by campus.

Sublets lets verified college students list and find short-term sublets at their own school. The v1 beta is scoped to UC San Diego (`ucsd.edu`); other students can join a waitlist.

## Monorepo layout (npm workspaces)

- `apps/mobile` — Expo (SDK 54) React Native app. **Primary product.** See `apps/mobile/PRODUCTION.md` and `apps/mobile/TESTING.md`.
- `apps/web` — Next.js 16 app: auth, dashboard/admin, and the public legal/support pages the mobile app links to. Deploys on Vercel (root directory `apps/web`).
- `packages/shared` — shared TypeScript types, constants, and campus/email logic.
- `supabase/` — SQL migrations and seed data.

The rest of this README documents the **web app** (`apps/web`); paths below are relative to that folder.

## Tech (web)

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- Supabase (Postgres + Auth via email/password)
- Deploys on Vercel

Payments, AI, real ID verification, landlord portal, legal-doc generation, and premium checkout are intentionally **not** built — see `CLAUDE.md` for the scope guardrails.

## Local setup

Requires Node.js 18.18+ (Next.js 16) and npm.

```bash
npm install
cp apps/web/.env.example apps/web/.env.local   # then fill in real Supabase values
npm run dev:web
```

Open <http://localhost:3000>.

The app boots without Supabase credentials — public routes (`/`, `/login`, `/waitlist`, `/privacy`, `/terms`, `/support`) still render. But the login form and any gated route need real env values.

Other scripts (run from the repo root):

```bash
npm run build:web     # web production build
npm run dev:mobile    # expo start (needs apps/mobile/.env)
npm run lint --workspace=apps/web
npm run lint --workspace=mobile
npm run typecheck --workspace=mobile
```

### Required environment variables (`apps/web/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

Both come from **Supabase Dashboard → Project Settings → API**.

## Supabase setup

### 1. Create a project + apply schema

1. Create a project at <https://supabase.com> and copy the URL + anon key into `.env.local`.
2. **SQL editor (easiest):** open Supabase Studio → SQL Editor → run each file in `supabase/migrations/` in order (0001 → 0005), then `supabase/seed.sql`.
3. Or via CLI:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

After both files run you should see 1 row in `campuses`, 6 in `profiles`, 6 in `listings`, 6 in `listing_photos`.

### 2. Configure auth

Sublets uses Supabase's **email/password** auth flow — `supabase.auth.signUp()` for new UCSD users, `supabase.auth.signInWithPassword()` for returning ones.

For local development, disable email confirmation so signups produce a session immediately:

**Supabase Dashboard → Authentication → Sign In / Up → Email → Confirm email → toggle OFF.**

(Leave it on for production once Sublets ships.)

In **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (and your production URL once you deploy)

## Auth gating

```
public landing/login/waitlist  →  open to everyone
↓ submit email at /login
  ucsd.edu (any subdomain)     →  signUp / signInWithPassword → /explore
  other .edu                   →  redirect to /waitlist?reason=non-ucsd
  not .edu                     →  redirect to /waitlist?reason=non-edu
↓ first time after sign-in
  no profile / not onboarded   →  /onboarding
  suspended                    →  /suspended
  onboarded + UCSD             →  /explore (and all marketplace routes unlocked)
```

Gating logic lives in **`lib/auth/session.ts`**:

- `requireUser()` — used by `/onboarding` and `/suspended`. Authenticated; profile may be missing/incomplete.
- `requireOnboardedUser()` — used by `(app)/layout.tsx`. Authenticated, profile present + `is_onboarded`, `is_suspended = false`, campus `is_supported`.
- `requireAdminUser()` — used by `/admin`. All of the above **plus** `profile.is_admin = true`.

Session refresh on every request is handled by `proxy.ts` (Next 16's rename of `middleware.ts`) + `lib/supabase/middleware.ts`.

## Creating a test UCSD user

With email confirmation disabled (see above), local dev is straightforward:

**Easiest — sign up through the UI:**

1. Run `npm run dev`, open <http://localhost:3000/login>.
2. Enter `test@ucsd.edu` (or any `*.ucsd.edu` address) and a password (≥ 6 chars).
3. Click **Sign up**. You're signed in immediately and redirected to `/onboarding`.
4. Fill out the onboarding form; you land on `/explore`.

**Alternative — pre-seed via Supabase Dashboard:**

1. Supabase Dashboard → **Authentication → Users → Add user → Create new user**.
2. Email: `test@ucsd.edu`, set a password, check **Auto Confirm User**.
3. Go to `/login`, click **Log in** with that email + password.

To grant admin: after onboarding, run in SQL editor:

```sql
update public.profiles set is_admin = true where user_id = '<your auth user id>';
```

You can find your auth user id in **Authentication → Users**.

## Creating and managing listings (Milestone 3)

Once signed in and onboarded, a UCSD profile can post sublets.

**Post a draft:**

1. Click **New listing** on `/dashboard` (or visit `/listings/new` directly).
2. Fill any subset of the fields — draft saves don't require validation.
3. Click **Save as draft**. You land back on `/dashboard` with the listing visible under *Your listings* with a `Draft` badge.

**Publish:**

- From the new-listing form click **Publish listing**. The action validates required fields (title, housing type, monthly rent, utilities, dates, neighborhood, bedrooms, bathrooms, description, lease status); errors render inline.
- From the dashboard you can publish a draft via the **Publish** button on its row.
- On publish, you're redirected to `/listings/[id]` (the public detail view).

**Manage a listing:**

Each row on the dashboard exposes status-aware actions:

| State | Actions |
|---|---|
| Draft | View not shown · Edit · Publish · Delete |
| Published | View · Edit · Pause · Mark filled |
| Paused | View · Edit · Re-publish · Mark filled |
| Filled / Expired | View · Edit · Re-publish |

**Edit:** `/listings/[id]/edit` pre-populates the form with current values + existing photo URLs. The owner check is enforced server-side; visiting another user's edit URL returns the listings `not-found` page.

**Private vs public address:** the form has both *Neighborhood* (public) and *Exact address* (private — only you can see this). The public detail query at `/listings/[id]` explicitly omits `address_private`, so non-owners can never read it via the app even if RLS were misconfigured.

**Detail page placeholders:** `/listings/[id]` shows Save / Message / Report buttons in a visibly disabled state with tooltips — those flows ship in later milestones.

## Explore, filters, save (Milestone 4)

Once you have a couple of published listings (seed data + anything you posted) you can exercise the marketplace surface.

**Browse:** `/explore` shows every `status = 'published'` listing for your campus. Drafts/paused/filled/expired/removed listings never appear here.

**Filter:** click **Filters**. The form covers price range, available-by / through-at-least dates, housing type, lease status, distance-contains text (e.g. type `walk` to only show walking-distance listings), and on/off toggles for furnished / parking / pets / room-sharing. Click **Apply filters** to push a clean querystring (`/explore?max_price=2000&furnished=1` etc.) — the URL is shareable. **Reset** wipes everything.

**Sort:** the sort dropdown applies on change. Options:

- **Newest** (default) — `created_at` desc.
- **Best match** — rules-based score against your profile preferences (`pets_preference` vs `pets_allowed`, `room_sharing_preference` vs `room_sharing_required`). If you haven't set either preference, falls back to newest. Not AI, just deterministic — see `lib/listings/bestMatch.ts`.
- **Lowest price** — `monthly_rent` asc.
- **Earliest available** — `available_start_date` asc.
- **Closest to campus** — best-effort. `distance_to_campus` is free text (e.g. "5 min walk"), so we extract the leading integer; listings without a parseable number sink to the end of the list. Documented in `lib/listings/explore.ts:parseDistanceMinutes`.

**Save / unsave:** tap the heart on any listing card or the **Save** pill on `/listings/[id]`. Optimistic UI flips the icon immediately; the server action `toggleFavorite` writes to `public.favorites` (unique on `(user_id, listing_id)`). If the insert races against itself the conflict is swallowed silently.

**Saved page:** `/saved` shows your favorites in reverse-favorited order. Listings that left `published` since you saved them still appear with a status badge (Paused / Filled / Expired / Removed) so you know what happened.

**Empty + error states:**

| Surface | Trigger | Copy |
|---|---|---|
| `/explore` no filters | no published listings exist | "No listings yet — be the first." |
| `/explore` with filters | filters too narrow | "No listings match these filters" + Reset button |
| `/explore` load failure | DB error | "We couldn't load listings" red panel |
| `/saved` empty | no favorites | "You haven't saved any listings yet." |
| `/saved` load failure | DB error | "We couldn't load your saved listings" red panel |

**Privacy:** both `/explore` and `/saved` go through the same column-projected query (`PUBLIC_LISTING_COLUMNS`) that omits `address_private`. The owner's edit form is the only surface where the private address is ever fetched.

## Messaging, requests, and checklist (Milestone 5)

Two flows ship in this milestone — both are gated to authenticated, onboarded, non-suspended UCSD users on published listings only.

### Messaging

**Start a conversation:** on `/listings/[id]` (someone else's published listing), click **Message**. A `conversations` row is created or reused for `(listing, seeker=you, lister=owner)` and you land on `/messages/[conversationId]`. Re-clicking from the same listing routes back to the same thread — uniqueness is enforced by the schema's `unique(listing_id, seeker_id, lister_id)`.

**Inbox:** `/messages` lists conversations newest-first by `updated_at`. Each row shows the other participant, the listing title, a one-line preview of the latest message, and a status badge if the listing left `published`.

**Thread:** `/messages/[conversationId]` shows messages chronologically. Your messages are right-aligned and accent-colored; the other side is left-aligned grey. The composer below sends to the `messages` table and bumps `conversations.updated_at`. Empty thread copy reads: *"Start the conversation by asking about availability, dates, or lease approval."*

**Hard cases:**

- You can't message your own listing (the button is hidden when `owner_id === your profile.id`; the action also rejects).
- You can't message about a draft/paused/filled/expired/removed listing — the button is hidden when `status !== 'published'`.
- Visiting `/messages/[id]` for a conversation you're not in returns the listing's not-found page.

### Interest requests

**Send a request:** on a non-owned published listing, click **Request to sublet** to expand an inline form with an optional message. Submitting creates an `interest_requests` row with `status='pending'` and redirects to `/requests/[id]`. If you already have a `pending` or `accepted` request for the same listing, you're redirected to the existing one instead of creating a duplicate.

**Lister view:** `/dashboard` shows incoming requests under *Incoming requests*. Open one to **Accept** or **Decline**.

**Seeker view:** `/dashboard` shows your outgoing requests under *Your requests*. Pending requests can be **Cancelled**.

**Accept → checklist:** when the lister accepts, the request flips to `status='accepted'` and the 7 default checklist items are installed (idempotent — safe to re-trigger):

- Confirm dates
- Confirm rent
- Confirm deposit
- Confirm roommate approval
- Confirm landlord approval
- Confirm agreement signed outside platform
- Confirm move-in/move-out plan

Each row has a *Seeker* and a *Lister* toggle. You can only toggle your own side; the other side renders as a non-interactive indicator. The checklist legal/safety disclaimer is rendered directly below the items.

**Complete the sublet:** once every item has both sides checked, the lister sees **Mark sublet completed** enabled. Clicking it:

- Sets `interest_requests.status = 'completed'` + `completed_at = now()`
- Sets `listings.status = 'filled'` + `filled_at = now()`

Sublets does not process payments and does not generate legal documents — the checklist coordinates everything that happens *off-platform*.

### End-to-end manual test

A typical flow against your Supabase project:

1. Sign in as a UCSD user (User A) and post a listing. Publish it.
2. Sign out, sign in as a second UCSD user (User B). Visit the listing. Click **Message** → land on `/messages/[id]`, send a few messages, watch them appear immediately.
3. From the same listing, click **Request to sublet** → optional note → **Send request**. Land on `/requests/[id]` in `Pending` state. (User B sees the request under *Your requests* on the dashboard.)
4. Sign back in as User A. `/dashboard` shows the request under *Incoming requests*. Open it → **Accept**. Page reloads with the checklist installed.
5. As User A, toggle a few items on the *Lister (you)* side. Sign in as User B, toggle the *Seeker (you)* sides on the same items.
6. Finish all 14 toggles (7 items × 2 sides). As User A, **Mark sublet completed** becomes enabled — click it. The request moves to `Completed`; the listing flips to `Filled` (visible on `/explore` as gone, on `/dashboard` with a `Filled` badge).

### Error and empty states

| Surface | Trigger | Copy |
|---|---|---|
| `/messages` empty | no conversations | "You don't have any messages yet." + Browse Explore |
| `/messages` load failure | DB error | "We couldn't load your messages" panel |
| Thread empty | no messages sent | "Start the conversation by asking about availability, dates, or lease approval." |
| Send-message failure | empty body / too long / DB error | inline red text above the composer |
| Unauthorized conversation | non-participant URL guess | not-found page |
| Create-request failure | non-published listing / self-request / DB error | inline red text in the request form |
| Unauthorized request | non-participant URL guess | request not-found page |
| Accept/decline/cancel/complete failure | wrong role / wrong status / DB error | Next default error UI (action throws) |
| Toggle checklist failure | network blip | inline rollback + "Couldn't update — try again." |

### Privacy

- `address_private` continues to be excluded everywhere via `PUBLIC_LISTING_COLUMNS`. The request detail page, thread page, and dashboard rows all use the same projection.
- Conversation and request access is double-gated: RLS in Postgres + an explicit `seeker_id === me || lister_id === me` check in the query helpers. Non-participants hitting URLs they shouldn't see get the not-found page, never a partial render.

## Reports and admin moderation (Milestone 6)

### Submitting reports

Three entry points, all available to authenticated, onboarded, non-suspended UCSD users:

1. **Listing report** — on `/listings/[id]`, click **Report** (next to Save / Message / Request). Hidden when you're the listing owner.
2. **Conversation report** — on `/messages/[conversationId]`, click **Report conversation** under the listing header. Server-side check rejects non-participants.
3. **User report** — on the listing detail page's lister profile card, click **Report this student**. Hidden when the lister is you.

All three open the same inline form: a *Reason* dropdown (Scam suspicion / Inaccurate listing / Harassment / Duplicate listing / No longer available / Other) and an optional *Details* textarea (2000 chars). Empty reasons are rejected. On success the button becomes a green "Report sent" badge.

### Making yourself admin

`is_admin` is not exposed in the app UI by design. Flip it via SQL editor on Supabase:

```sql
update public.profiles set is_admin = true where user_id = '<your auth user id>';
```

You can find your auth user id in **Supabase Dashboard → Authentication → Users**. Once flipped, refresh `/admin` — you should land on the moderation dashboard.

Non-admins hitting `/admin` are redirected to `/dashboard` via the `requireAdminUser` guard, with no UI hint that the page exists.

### Admin moderation dashboard

`/admin` has three stacked sections with their own filter pills:

- **Reports** — defaults to `open`. Each card shows status, reason, full details, reporter, reported user (if present), linked listing, and a conversation summary (participant names + listing) when applicable. Below: an *Admin notes* textarea (Save notes) and three status actions: **Mark reviewing**, **Resolve**, **Dismiss**. The button matching the current status is disabled.
- **Listings** — every listing across every status. Filter pills cover all 6 statuses + All. Each row links to the public listing page, shows the owner, status badge, and exposes **Remove** (`status='removed'`) or **Restore to paused** (`status='paused'`) depending on current state. Restore deliberately *doesn't* re-publish — the owner has to do that explicitly from their dashboard.
- **Users** — all profiles. Filter pills: All / Active / Suspended. Each row shows name, role, major, grad year, admin/suspended/you badges, current email verification, ID verification status dropdown (Not started / Pending manual review / Verified / Rejected — manual tracking only, no IDs are collected), and a Suspend / Unsuspend button. **You can't suspend your own account from the UI** — the action rejects it.

Each list is capped at 50 rows; tighten the filter to see different slices.

### End-to-end manual test

A typical run-through assuming two test users (A and B) and one admin user (could be A):

1. Sign in as B. Visit one of A's published listings → click **Report** → pick *Inaccurate listing* → optional details → **Submit report**. Card flips to "Report sent."
2. Sign out, log in as the admin. Visit `/admin`. Under Reports / Open you should see the new report.
3. Click **Save notes** with a quick triage note. Click **Mark reviewing**. The card moves to the Reviewing filter pill.
4. Under Listings, find the reported listing → click **Remove**. The listing now has `status = removed`. Visit `/explore` — it's gone. Visit `/listings/[id]` — still loads for admin (and the owner), but doesn't surface anywhere browsable.
5. Back on `/admin`, switch the Listings filter to **Removed**, click **Restore to paused**. Listing is now `paused` — still hidden from explore. Owner sees the *Paused* state on their dashboard and can re-publish via the existing edit flow.
6. Under Users, find user B → click **Suspend**. B's row now shows a *Suspended* badge. Sign in as B → any gated page bounces to `/suspended`.
7. Back as admin, click **Unsuspend** → user B can browse again.
8. Change B's *ID status* dropdown from `Not started` to `Verified`. Refresh — the change persists.
9. Resolve the report from step 1 with **Resolve**. Card moves to the Resolved pill.

### Privacy in admin moderation

- Conversation summaries in report cards show participants + listing only — **the messages themselves aren't surfaced**. RLS still blocks admins from reading `messages` rows of conversations they're not in, so a malicious admin can't read DMs without explicit SQL access.
- Listings in admin lists go through the unmodified `listings` table (admin sees all columns including `address_private`). The admin row UI does NOT render `address_private` — admins click through to the listing detail page (which uses the same public projection) if they want to see public info.
- No government IDs are collected or uploaded. `id_verification_status` is a free-form status flag for admins to record what they verified out-of-band.

### Error and empty states

| Surface | Trigger | Copy |
|---|---|---|
| Report form | empty reason / invalid reason | inline red text in form |
| Report form | conversation report by non-participant | "You can only report conversations you're a participant of." |
| `/admin` reports section | no rows for filter | "No reports in status …" |
| `/admin` listings section | no rows for filter | "No listings in status …" |
| `/admin` users section | no rows for filter | "No users match this filter." |
| `/admin` report card | status-update failure | inline "Couldn't update status." |
| `/admin` listing row | remove/restore failure | inline "Couldn't update listing." |
| `/admin` user row | suspend / verification failure | inline error text (own-account suspension shows the specific message) |
| `/admin` for non-admins | not is_admin | redirect to `/dashboard` (no UI hint) |

## Analytics (Milestone 7)

### Event tracking

Every action that matters operationally writes a row into `public.analytics_events` via `lib/analytics/track.ts`. Tracking is **best-effort** — the helper wraps its insert in try/catch and never throws, so a Supabase blip can't break the parent flow. Events captured:

| Event | Where it fires | Metadata |
|---|---|---|
| `signup_completed` | `emailPasswordAuth` after `signUp()` succeeds | `domain` |
| `profile_completed` | `submitOnboarding` after profile upsert | `campus_id`, `role`, `heard_from` |
| `listing_created` | `createListing` after insert | `listing_id`, `campus_id`, `mode` |
| `listing_published` | `createListing` (publish path) / `updateListing` (draft→published) / `changeListingStatus` (re-publish) | `listing_id`, `source` |
| `listing_viewed` | `/listings/[id]` server render — non-owner + published only | `listing_id`, `campus_id` |
| `listing_saved` | `toggleFavorite` insert path | `listing_id` |
| `listing_unsaved` | `toggleFavorite` delete path | `listing_id` |
| `message_sent` | `sendMessage` after insert | `conversation_id` |
| `interest_request_created` | `createInterestRequest` after insert | `interest_request_id`, `listing_id` |
| `interest_request_accepted` | `acceptInterestRequest` after status flip | `interest_request_id` |
| `interest_request_declined` | `declineInterestRequest` | `interest_request_id` |
| `interest_request_cancelled` | `cancelInterestRequest` | `interest_request_id` |
| `interest_request_completed` | `completeInterestRequest` | `interest_request_id`, `listing_id` |
| `listing_marked_filled` | `changeListingStatus(filled)` + `completeInterestRequest` | `listing_id`, `source`, optional `interest_request_id` |
| `report_submitted` | `createReport` after insert | `report_id`, `reason`, `target`, optional ids |

Owner self-views are intentionally skipped so listers don't inflate their own view counts.

### Admin analytics dashboard

`/admin/analytics` — gated by `requireAdminUser` (admin + onboarded + not suspended). Linked from the main `/admin` page via the *Analytics →* pill in the header.

Sections + metrics:

- **Users** — Total users · Onboarded · Suspended
- **Listings** — Published · Drafts · Paused · Filled · Removed · Expired, plus:
  - **Fill rate** = filled ÷ (published + paused + filled + expired + removed), rendered as a percentage. `—` when the denominator is zero.
  - **Avg time to fill** = mean of `filled_at − created_at` across `status='filled'` rows. Formatted as days / hours / minutes / seconds based on magnitude. `—` when no filled listings exist.
- **Engagement** — Favorites · Conversations · Messages sent
- **Interest requests** — Total · Pending · Accepted · Completed
- **Moderation** — Total reports · Open · Scam / harassment (reports where `reason` is `scam_suspicion` or `harassment`)
- **Acquisition source** — Small table of `profiles.heard_from` answers grouped + counted. Users who skipped the question land in the `unspecified` bucket. Empty state when no data.

All counts are sourced from operational tables (not `analytics_events`), so existing seed data + any actions you've taken so far already populate the dashboard. The `analytics_events` table is forward-looking — useful for funnels and time-series we don't render yet.

### Manual testing

1. Sign in as an admin user. Visit `/admin/analytics` — every section renders, counts match what you'd expect from the seed data + your own activity.
2. From an empty state: temporarily wipe favorites with `delete from public.favorites where user_id = '<your-profile-id>';` then refresh — Favorites should drop to 0.
3. To test acquisition source: ensure two test profiles answered different *heard from* values during onboarding; the table at the bottom should list both rows.
4. To exercise the fill-rate calculation: in `/dashboard`, mark one of your draft listings as *Published*, then *Mark filled*. Refresh `/admin/analytics`. Fill rate should change (numerator and denominator both move).
5. To exercise scam/harassment count: as a non-admin user, file a report on any listing with reason *Harassment*. Refresh `/admin/analytics` — `Scam / harassment` should bump by 1.
6. To verify gating: sign out, log in as a non-admin, navigate to `/admin/analytics` — `requireAdminUser` redirects you to `/dashboard`. No UI hint that the page exists.

### Access control

- Server-side: every page through `requireAdminUser` (which calls `requireOnboardedUser`, blocking suspended users too).
- RLS: `analytics_events` has `analytics_admin_read` (`is_admin()`) and `analytics_self_insert` (`user_id IS NULL OR user_id = current_profile_id()`). Non-admins can't read events; the dashboard's count-table queries also require admin via the higher-level RLS on `profiles`/`listings`/`reports` (admin-all policies + permissive read on profiles).

## Project structure

```
app/
  (marketing)/         # public routes: /, /login, /waitlist
  (post-login)/        # authenticated, profile may be incomplete
    onboarding/
    suspended/
  (app)/               # fully gated marketplace routes
    explore/
    saved/
    listings/new/
    listings/[id]/
    messages/
    messages/[conversationId]/
    dashboard/
    admin/
  auth/
    callback/          # OAuth/code-exchange landing handler (kept for future email-confirm flows; unused with email/password)
components/            # shared UI (nav, layouts, placeholders)
lib/
  campus.ts            # .edu / ucsd.edu domain classification
  env.ts               # env access, throws lazily on missing Supabase config
  auth/
    actions.ts         # emailPasswordAuth, signOut server actions
    session.ts         # requireUser / requireOnboardedUser / requireAdminUser
  listings/
    actions.ts         # createListing, updateListing, changeListingStatus, deleteListing
    queries.ts         # owner + public listing queries (public query omits address_private)
    constants.ts       # housing type, utilities, lease status, appliances option sets
    explore.ts         # filter / sort logic for /explore
    favorites.ts       # toggleFavorite, getSavedListings, getFavoriteListingIds
    bestMatch.ts       # rules-based preference scoring (not AI)
  messages/
    queries.ts         # getConversationsForUser, getConversationDetails, getMessagesForConversation
    actions.ts         # startConversationForListing, sendMessage
  requests/
    queries.ts         # incoming/outgoing lists, request details, checklist items
    actions.ts         # create / accept / decline / cancel / toggleChecklistItem / complete
    constants.ts       # 7 default checklist items, status labels + tones
  reports/
    actions.ts         # createReport (listing / conversation / user targets)
    constants.ts       # 6 spec'd reasons, status labels + tones
  admin/
    queries.ts         # getReports / getAllListings / getAllProfiles (with filters)
    actions.ts         # updateReportStatus / updateReportNotes / removeListing / restoreListing / setUserSuspension / setIdVerificationStatus
    constants.ts       # ID_VERIFICATION_OPTIONS (plain module — must not be in actions.ts)
  analytics/
    track.ts           # best-effort track(eventName, metadata) helper
    queries.ts         # getAnalyticsMetrics() — all metrics for /admin/analytics
  supabase/
    server.ts          # createSupabaseServerClient — Server Components / Route Handlers
    browser.ts         # getSupabaseBrowserClient — Client Components
    middleware.ts      # updateSession helper used by root middleware
    types.ts           # hand-rolled Database type
proxy.ts               # session refresh (Next 16 middleware)
../../supabase/
  migrations/          # SQL migrations applied in order
  seed.sql             # idempotent seed data
```

The `(marketing)`, `(post-login)`, and `(app)` folders are Next.js route groups — they don't show up in URLs. Each group has its own layout (chrome) and its own auth gate.

## Status

- **Milestone 0** ✓ project foundation, navigation, placeholder routes, landing page.
- **Milestone 1** ✓ Supabase schema, RLS scaffolding, seed data, typed client helpers.
- **Milestone 2** ✓ auth, .edu / UCSD access control, onboarding, route protection.
- **Milestone 3** ✓ listing creation, drafts/publish lifecycle, owner management, public detail page with private-address omission.
- **Milestone 4** ✓ explore + filters + sort, rules-based best-match, favorites (save/unsave + /saved page).
- **Milestone 5** ✓ messaging (conversation list + thread + composer), interest requests (create/accept/decline/cancel), sublet checklist, complete → listing filled.
- **Milestone 6** ✓ user reports (listing/conversation/user), admin moderation dashboard, listing remove/restore, user suspend + manual id_verification_status.
- **Milestone 7** ✓ best-effort event tracking across every operational flow, admin analytics dashboard at `/admin/analytics`.
- **Milestone 8** ✓ loading skeletons for all (app) routes, error boundaries, accessibility (alt text, semantic markup), privacy copy on listing form, TESTING.md manual QA guide.

## Manual QA

See **[apps/web/TESTING.md](./apps/web/TESTING.md)** (web) and **[apps/mobile/TESTING.md](./apps/mobile/TESTING.md)** (mobile) for step-by-step manual test flows.
