# Sublets

Verified student sublets, campus by campus.

Sublets is a mobile-first responsive web MVP that lets verified college students list and find short-term sublets at their own school. The v1 beta is scoped to UC San Diego (`ucsd.edu`); other students can join a waitlist.

## Tech

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- Supabase (Postgres + Auth via email/password)
- Deploys on Vercel

Payments, AI, native mobile, real ID verification, landlord portal, legal-doc generation, premium checkout, and messaging are intentionally **not** built yet — see `CLAUDE.md` for the scope guardrails.

## Local setup

Requires Node.js 18.18+ (Next.js 16) and npm.

```bash
npm install
cp .env.example .env.local   # then fill in real Supabase values for auth to work
npm run dev
```

Open <http://localhost:3000>.

The app boots without Supabase credentials — public routes (`/`, `/login`, `/waitlist`) still render. But the login form and any gated route need real env values.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

### Required environment variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

Both come from **Supabase Dashboard → Project Settings → API**.

## Supabase setup

### 1. Create a project + apply schema

1. Create a project at <https://supabase.com> and copy the URL + anon key into `.env.local`.
2. **SQL editor (easiest):** open Supabase Studio → SQL Editor → paste the contents of `supabase/migrations/0001_initial_schema.sql` and run, then do the same with `supabase/seed.sql`.
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

Session refresh on every request is handled by `middleware.ts` + `lib/supabase/middleware.ts`.

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
    actions.ts         # startSignIn, signOut server actions
    session.ts         # requireUser / requireOnboardedUser / requireAdminUser
  supabase/
    server.ts          # createSupabaseServerClient — Server Components / Route Handlers
    browser.ts         # getSupabaseBrowserClient — Client Components
    middleware.ts      # updateSession helper used by root middleware
    types.ts           # hand-rolled Database type
middleware.ts          # session refresh
supabase/
  migrations/          # SQL migrations applied in order
  seed.sql             # idempotent seed data
```

The `(marketing)`, `(post-login)`, and `(app)` folders are Next.js route groups — they don't show up in URLs. Each group has its own layout (chrome) and its own auth gate.

## Status

- **Milestone 0** ✓ project foundation, navigation, placeholder routes, landing page.
- **Milestone 1** ✓ Supabase schema, RLS scaffolding, seed data, typed client helpers.
- **Milestone 2** ✓ auth, .edu / UCSD access control, onboarding, route protection.

Listing creation, messaging, favorites, reports, and analytics land in later milestones.
