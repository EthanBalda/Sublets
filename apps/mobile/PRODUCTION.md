# Sublets Mobile — Production Setup

Beta distribution via EAS Build (TestFlight). Expo Go for development only.

---

## Prerequisites

1. **Apple Developer account** — Required for TestFlight ($99/yr). Enroll at developer.apple.com.
2. **EAS CLI** — `npm install -g eas-cli` then `eas login`.
3. **EAS project** — Run `eas init` in `apps/mobile/` to create an EAS project ID, then paste it into `app.json` under `expo.extra.eas.projectId`.

---

## Environment variables

Create `apps/mobile/.env` (gitignored):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

All keys must use the `EXPO_PUBLIC_` prefix — Expo requires this to bundle env vars into the app.

For EAS builds, set these as EAS secrets:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
```

---

## Supabase

- Apply every migration in `supabase/migrations/` (0001–0005) with `supabase db push`.
- All tables have RLS enabled; no service-role key is used client-side.
- Storage bucket `listing-photos` is created by migration 0003 (public read).
- Email **password** auth must be enabled in the Supabase dashboard (the app
  signs in with `signInWithPassword` and auto-signs-up new users). Decide the
  "Confirm email" setting deliberately: if ON, new users must open the
  confirmation email before they can sign in.
- UCSD gating (`ucsd.edu`) is enforced in the clients via `classifyEmail` —
  there is no database-level restriction on signup email domains.

---

## Building for beta (TestFlight)

```bash
cd apps/mobile
eas build --platform ios --profile preview
```

After build completes, submit to TestFlight:

```bash
eas submit --platform ios --latest
```

Add beta testers in App Store Connect → TestFlight → Internal Testing.

---

## Test accounts

Create real UCSD `.edu` accounts for smoke testing. If email confirmations are enabled in Supabase, the address must actually receive mail.

Recommended:
- One seeker account (no listings)
- One lister account (at least one published listing)
- One account with accepted request + open conversation

---

## Release checklist

- [ ] `app.json` version bumped (currently `1.0.0`)
- [ ] `app.json` name is "Sublets", slug is "sublets"
- [ ] EAS project ID set in `app.json`
- [ ] EAS secrets set for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `eas build` succeeds (no TypeScript errors, no missing assets)
- [ ] Smoke tested on physical iOS device via TestFlight
- [ ] Beta testers added in App Store Connect

---

## Known limitations (v1 beta)

- No push notifications — users must check the app manually.
- No realtime updates — screens refresh on navigate, not on data change.
- UCSD only — non-ucsd.edu addresses are waitlisted only.
- No payments — rent/deposits handled outside the platform.
- No government ID verification — profiles are self-reported.
