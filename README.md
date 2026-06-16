# Sublets

Verified student sublets, campus by campus.

Sublets is a mobile-first responsive web MVP that lets verified college students list and find short-term sublets at their own school. The v1 beta is scoped to UC San Diego (`ucsd.edu`); other students can join a waitlist.

## Tech

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- Deploys on Vercel

Supabase, auth, payments, and AI are intentionally **not** wired up yet — see `CLAUDE.md` for the full scope guardrails.

## Local setup

Requires Node.js 18.18+ (Next.js 16) and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

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
```

The `(marketing)` and `(app)` folders are Next.js route groups — they don't show up in URLs. They exist so the public site and the authed app can have different chrome.

## Status

Milestone 0: project foundation, navigation, placeholder routes, landing page. Auth, data, and feature pages land in later milestones.
