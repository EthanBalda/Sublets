# Sublets Mobile — Manual Testing Checklist

v1 scope: UCSD only · Expo Go · No payments · No push notifications

---

## 1. Auth & Onboarding

- [ ] Cold launch shows loading spinner, then redirects to login
- [ ] Login with valid UCSD .edu email sends magic link
- [ ] Tapping magic link opens app and lands on feed (if onboarded)
- [ ] New user after magic link lands on onboarding flow
- [ ] Onboarding: fill name, major, graduation year, role — submit works
- [ ] After onboarding, feed is shown
- [ ] Logout from Account tab shows confirmation dialog
- [ ] After logout, app returns to login screen
- [ ] Re-login restores session and shows feed

---

## 2. Create Listing

- [ ] Tap "+ Create" in My Listings tab
- [ ] Save Draft requires only a title (min 3 chars)
- [ ] Publish requires: title (3+ chars), housing type, description (20+ chars), rent > 0, utilities, start date, end date, neighborhood, lease status
- [ ] End date before start date is blocked on Publish
- [ ] Published listing appears in My Listings with "Published" badge
- [ ] Draft listing appears with "Draft" badge
- [ ] Listing without photos publishes fine (no photo is OK)

---

## 3. Photo Upload

- [ ] Tap "+ Add" in listing form → device photo picker opens
- [ ] Selecting a photo shows thumbnail in form
- [ ] Max 6 photos enforced (+ Add button disappears at 6)
- [ ] Removing a photo (×) removes it from the list
- [ ] Publishing with photos: photos appear in My Listings thumbnail
- [ ] Opening listing detail: carousel shows all uploaded photos
- [ ] Tap right zone → next photo; tap left zone → previous photo
- [ ] "1 / N" indicator updates correctly
- [ ] Editing listing: existing photos pre-load; new photos can be added; removed photos are deleted from storage

---

## 4. Feed

- [ ] Feed shows published listings from other users (same campus)
- [ ] Feed shows first photo (or placeholder if none)
- [ ] Multiple photos: tap right/left zones to cycle through
- [ ] Swipe right → Request (card animates off right)
- [ ] Swipe left → Pass (card animates off left)
- [ ] "Request" button at bottom sends request
- [ ] "Pass" button dismisses card
- [ ] Already-requested listings do not reappear in feed
- [ ] "All caught up" message when feed is empty
- [ ] Feed retry button works if load fails
- [ ] Tapping card info area opens listing detail

---

## 5. Listing Detail

- [ ] Opens from feed card tap
- [ ] Opens from My Listings card tap
- [ ] Opens from "View Listing →" in request detail
- [ ] Opens from "Listing" link in message thread header
- [ ] Shows: photos, title, rent, neighborhood, beds/baths, dates, utilities, description, lister info
- [ ] Owner sees "Edit Listing" button → navigates to edit
- [ ] Seeker sees "Send Request" button (if published and not yet requested)
- [ ] After requesting: button changes to "Request sent"
- [ ] Already-requested: shows "Request sent" on load

---

## 6. Edit Listing

- [ ] Opens from My Listings "Edit →" button or listing detail "Edit Listing"
- [ ] Existing values pre-populated
- [ ] Existing photos pre-loaded in form
- [ ] Can add/remove photos; changes save correctly
- [ ] Save Draft / Publish work same as Create
- [ ] Back navigates to My Listings

---

## 7. Requests

- [ ] Requests tab shows Incoming (lister view) and My Requests (seeker view)
- [ ] Incoming: tapping card opens request detail
- [ ] My Requests: tapping card opens request detail
- [ ] Account → "My Sent Requests" → tapping card opens request detail
- [ ] Request detail shows: listing title, rent, neighborhood, status badge, seeker profile (for lister)
- [ ] "View Listing →" in request detail opens listing detail
- [ ] Lister: "Accept" button accepts request
- [ ] Lister: "Decline" button shows confirmation, then declines
- [ ] Accept/Decline buttons disabled during submission (no double-submit)
- [ ] After accept: status badge updates to "Accepted"
- [ ] After decline: status badge updates to "Declined"
- [ ] Seeker: sees status update after lister acts

---

## 8. Messaging

- [ ] Accepted request shows "Message" button in request detail
- [ ] Tapping "Message" opens conversation thread
- [ ] Messages tab shows conversations list
- [ ] Tapping conversation opens thread
- [ ] "Listing" link in thread header opens listing detail
- [ ] Sending a message: appears in thread immediately
- [ ] Send button disabled for empty input
- [ ] Send button disabled while sending (no double-send)
- [ ] Both seeker and lister can send messages
- [ ] Empty thread shows "No messages yet" message
- [ ] Thread scrolls to bottom after new message

---

## 9. Edge Cases & Error States

- [ ] No internet: feed shows retry button with error message
- [ ] Invalid listing ID in URL: shows "Not found" with back button
- [ ] Request detail for non-participant: shows access error
- [ ] Creating duplicate request (race): app does not crash (23505 handled)
- [ ] Photo upload fails: Alert shown with error message
- [ ] Message send fails: input text restored, error shown

---

## 10. Session & Security

- [ ] Session persists across app restarts (no re-login required)
- [ ] Logging out clears session and redirects to login
- [ ] Cannot access /listings/new without being logged in
- [ ] Cannot view other users' private address unless request is accepted
- [ ] No service role key or hardcoded credentials in source
- [ ] Supabase anon key uses EXPO_PUBLIC_ prefix only

---

## Known Limitations (v1)

- Realtime updates not implemented — refresh screens manually to see updates
- Push notifications not implemented — users must check app manually
- Only UCSD (.edu) users can access the marketplace
- No payment processing — rent/deposits handled outside the platform
- No government ID verification — profiles are self-reported
- No landlord portal — listers manage approvals directly
- Photos: HEIC format may not display in all Image components (iOS-only format)
- Storage cleanup: orphaned storage objects from deleted listings are not cleaned up (only replaced photos are cleaned)
