import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { navigateBack } from "@/lib/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { insertListing, saveListing } from "@/lib/listings";
import { resolvePhotos, replaceListingPhotos } from "@/lib/photos";
import ListingFormFields, {
  coerceDraftValues,
  defaultFormValues,
  validateForDraft,
  validateForPublish,
  type FormValues,
} from "@/components/ListingFormFields";
import type { TablesInsert } from "@sublets/shared/types";

export default function NewListingScreen() {
  const { profile, session } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  function goBack() {
    navigateBack(
      router,
      navigation,
      undefined,
      "/(tabs)/my-listings" as Parameters<typeof router.replace>[0]
    );
  }
  const [values, setValues] = useState<FormValues>(defaultFormValues);
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Set once the listing row exists so a retry (e.g. after a photo upload
  // failure) updates that row instead of inserting a duplicate.
  const createdListingId = useRef<string | null>(null);

  function patch(updates: Partial<FormValues>) {
    setValues((prev) => ({ ...prev, ...updates }));
  }

  async function submit(publish: boolean) {
    if (!profile || !session) return;
    const errs = publish ? validateForPublish(values) : validateForDraft(values);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSubmitting(true);
    try {
      const v = publish ? values : coerceDraftValues(values);
      const insert: TablesInsert<"listings"> = {
        owner_id: profile.id,
        campus_id: profile.campus_id,
        title: v.title.trim(),
        housing_type: v.housing_type,
        description: v.description.trim(),
        monthly_rent: Number(v.monthly_rent),
        security_deposit: v.security_deposit
          ? Number(v.security_deposit)
          : null,
        utilities_included: v.utilities_included,
        available_start_date: v.available_start_date,
        available_end_date: v.available_end_date,
        lease_status: v.lease_status,
        neighborhood: v.neighborhood.trim(),
        address_private: v.address_private.trim() || null,
        bedrooms: v.bedrooms,
        bathrooms: v.bathrooms,
        parking_available: v.parking_available,
        laundry_available: v.laundry_available,
        furnished: v.furnished,
        pets_allowed: v.pets_allowed,
        status: publish ? "published" : "draft",
      };
      let listingId = createdListingId.current;
      if (listingId) {
        await saveListing(listingId, insert);
      } else {
        const listing = await insertListing(insert);
        listingId = listing.id;
        createdListingId.current = listingId;
      }
      if (photos.length > 0) {
        const urls = await resolvePhotos(photos, listingId, session.user.id);
        await replaceListingPhotos(listingId, urls);
      }
      router.replace("/(tabs)/my-listings");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Listing</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ListingFormFields
        values={values}
        onChange={patch}
        errors={errors}
        submitting={submitting}
        onSaveDraft={() => void submit(false)}
        onPublish={() => void submit(true)}
        photos={photos}
        onPhotosChange={setPhotos}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  backBtn: { padding: 4, minWidth: 60 },
  backText: { fontSize: 15, color: "#208AEF", fontWeight: "600" },
  headerSpacer: { minWidth: 60 },
});
