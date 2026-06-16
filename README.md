# Sublets

Verified student sublets, campus by campus.

Sublets is a mobile-first responsive web MVP that lets verified college students list and find short-term sublets at their own school. The v1 beta is scoped to UC San Diego (`ucsd.edu`); other students can join a waitlist.

## Tech

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- Supabase (Postgres + Auth — schema landed in Milestone 1, runtime wired up in a later milestone)
- Deploys on Vercel

Auth UI, payments, and AI are intentionally **not** wired up yet — see `CLAUDE.md` for the full scope guardrails.

## Local setup

Requires Node.js 18.18+ (Next.js 16) and npm.

```bash
npm install
cp .env.example .env.local   # optional until Supabase is wired into a page
npm run dev
```

Open <http://localhost:3000>. The app boots without Supabase credentials — env vars only become required when a page actually calls a Supabase client.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## Supabase setup

The schema lives in `supabase/migrations/`. The seed file lives at `supabase/seed.sql`.

### 1. Create a Supabase project

1. Create a project at <https://supabase.com>.
2. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon (public) key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Paste both into `.env.local` (see `.env.example`).

### 2. Apply the schema

Pick one:

- **SQL editor (easiest):** open Supabase Studio → SQL Editor → paste the contents of `supabase/migrations/0001_initial_schema.sql` and run, then do the same with `supabase/seed.sql`.
- **Supabase CLI:**
  ```bash
  supabase link --project-ref <your-project-ref>
  supabase db push       # applies migrations/
  psql "$DATABASE_URL" -f supabase/seed.sql
  ```

The migration enables RLS on every table and installs `current_profile_id()` / `is_admin()` helper functions used by the policies. Until auth ships, policies are inert (no `auth.uid()` returns null), which is intentional.

### 3. Verify

After running both files you should have:

- 1 row in `public.campuses` (UC San Diego, `is_supported = true`)
- 6 rows in `public.profiles` (placeholder lister profiles)
- 6 rows in `public.listings` (all `status = 'published'`)
- 6 rows in `public.listing_photos` (placeholder `storage_url` values)

## Project structure

```
app/
  (marketing)/        # public routes: /, /login, /waitlist
  (app)/              # post-auth routes (currently placeholders)
    explore/
    saved/
    listings/new/
    listings/[id]/
    messages/
    messages/[conversationId]/
    onboarding/
    dashboard/
    admin/
components/           # shared UI (nav, layouts, placeholders)
lib/
  env.ts              # env access, throws lazily on missing Supabase config
  supabase/
    server.ts         # createSupabaseServerClient — Server Components / Route Handlers
    browser.ts        # getSupabaseBrowserClient — Client Components
    types.ts          # hand-rolled Database type (replace with `supabase gen types` later)
supabase/
  migrations/         # SQL migrations applied in order
  seed.sql            # idempotent seed data for local + preview environments
```

The `(marketing)` and `(app)` folders are Next.js route groups — they don't show up in URLs. They exist so the public site and the authed app can have different chrome.

## Status

- **Milestone 0** ✓ project foundation, navigation, placeholder routes, landing page.
- **Milestone 1** ✓ Supabase schema, RLS scaffolding, seed data, typed client helpers.

Auth UI, onboarding, and feature pages land in later milestones.
