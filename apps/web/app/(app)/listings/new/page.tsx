import type { Metadata } from "next";
import { ListingForm } from "@/components/listings/ListingForm";
import { createListing } from "@/lib/listings/actions";
import { requireOnboardedUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Post a sublet" };

export default async function NewListingPage() {
  // Layout already gates, but require it here too so we fail closed if the
  // page is ever rendered outside the (app) group.
  await requireOnboardedUser();

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Sublets · new listing
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Post a sublet
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Save as a draft to come back to it later, or publish it now so other
        UCSD students can find it. Your exact address stays private.
      </p>

      <div className="mt-8">
        <ListingForm action={createListing} />
      </div>
    </section>
  );
}
