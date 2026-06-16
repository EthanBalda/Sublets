# Sublets — Claude Code Instructions

Sublets is a mobile-first responsive web MVP for verified college students to list and find short-term sublets.

## Product positioning

Sublets is not a general rental marketplace. It is a campus-scoped, .edu-gated student sublet marketplace.

v1 launch:
- UCSD only
- .edu-gated marketplace access
- Public landing page and waitlist
- No payments
- No AI
- No native mobile app
- No legal contract generation
- No real government ID vendor
- No landlord portal

## Core v1 features

Build only:
1. Public landing page
2. Waitlist
3. .edu auth
4. Onboarding profile
5. Listing creation
6. Explore/search/filter
7. Favorites
8. Messaging
9. Interest request + checklist
10. Reports/moderation
11. Admin analytics

## Strict cuts

Do not build unless explicitly approved:
- Native iOS or Android app
- AI matching
- AI price suggestions
- Stripe/payments
- Transaction fees
- Premium listing checkout
- Real ID verification provider
- Landlord portal
- Legal document generation
- 360 virtual tours
- Push notifications
- National multi-campus browsing

## Access rules

Public users:
- Can view landing page
- Can join waitlist
- Can maybe see sample/preview listings later
- Cannot message, save, post, or request sublets

Verified supported .edu users:
- Can onboard
- Can browse listings
- Can post listings
- Can save listings
- Can message
- Can request sublets

v1 supported campus:
- UC San Diego
- domain: ucsd.edu

Other .edu users:
- Can join waitlist only

Non-.edu users:
- Can join general interest waitlist only

## Safety rules

- Do not expose exact address publicly by default.
- Do not claim Sublets legally verifies sublets.
- Do not claim Sublets replaces landlord approval.
- Do not collect or store government IDs in v1.
- Do not process rent, deposits, or platform payments in v1.
- Add clear copy that Sublets helps organize the sublet process but does not provide legal advice.

## Engineering rules

- Keep code simple.
- Use TypeScript.
- Use clear route structure.
- Avoid feature creep.
- Do one milestone at a time.
- After each milestone, stop and ask for review.
