import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingForm } from "@/components/listings/ListingForm";
import { updateListing } from "@/lib/listings/actions";
import { requireOnboardedUser } from "@/lib/auth/session";
import {
  getListingPhotos,
  getOwnerListing,
} from "@/lib/listings/queries";

export const metadata: Metadata = { title: "Edit listing" };

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditListingPage({ params }: EditPageProps) {
  const { id } = await params;
  const session = await requireOnboardedUser();

  const listing = await getOwnerListing(id, session.profile.id);
  if (!listing) notFound();

  const photos = await getListingPhotos(listing.id);

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Sublets · editing · {listing.status}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Edit listing
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Changes save when you click <span className="font-medium">Save as draft</span>{" "}
        or <span className="font-medium">Publish</span>.
      </p>

      <div className="mt-8">
        <ListingForm
          action={updateListing.bind(null, listing.id)}
          submitLabels={{ draft: "Save as draft", publish: "Publish changes" }}
          initialValues={{
            title: listing.title,
            housing_type: listing.housing_type,
            monthly_rent: listing.monthly_rent,
            security_deposit: listing.security_deposit,
            utilities_included: listing.utilities_included,
            available_start_date: listing.available_start_date,
            available_end_date: listing.available_end_date,
            address_private: listing.address_private,
            neighborhood: listing.neighborhood,
            distance_to_campus: listing.distance_to_campus,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            total_roommates: listing.total_roommates,
            room_sharing_required: listing.room_sharing_required,
            parking_available: listing.parking_available,
            laundry_available: listing.laundry_available,
            furnished: listing.furnished,
            pets_allowed: listing.pets_allowed,
            appliances: listing.appliances,
            description: listing.description,
            lease_status: listing.lease_status,
            photo_urls: photos.map((p) => p.storage_url),
          }}
        />
      </div>
    </section>
  );
}
