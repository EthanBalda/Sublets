# Sublets Mobile

Expo (SDK 54) React Native app — the primary Sublets product. Verified UCSD
students browse a full-screen swipe feed of sublet listings, send interest
requests, and message after acceptance.

## Run it

```bash
# from the repo root
npm install
cp apps/mobile/.env.example apps/mobile/.env   # fill in Supabase URL + anon key
npm run dev:mobile                              # expo start (Expo Go compatible)
```

## Checks

```bash
npm run typecheck --workspace=mobile
npm run lint --workspace=mobile
```

## Structure

- `app/` — Expo Router routes: `(auth)` login, `(onboarding)`, `(tabs)` (Feed,
  Requests, Messages, My Listings, Account), plus `listings/`, `request/`,
  `message/`, and `my-requests` detail screens.
- `src/lib/` — Supabase client, listings/photos/messages helpers, formatting,
  navigation helper.
- `src/context/AuthContext.tsx` — session + profile state, startup recovery.
- Shared types/constants come from `@sublets/shared` (`packages/shared`).

## Docs

- `PRODUCTION.md` — EAS build/TestFlight setup and release checklist.
- `TESTING.md` — manual QA checklist.

Do not upgrade the Expo SDK or break Expo Go compatibility without approval.
