import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { insertListing } from "@/lib/listings";
import { resolvePhotos, replaceListingPhotos } from "@/lib/photos";
import ListingFormFields, {
  defaultFormValues,
  validateForDraft,
  validateForPublish,
  type FormValues,
} from "@/components/ListingFormFields";
import type { TablesInsert } from "@sublets/shared/types";

export default function NewListingScreen() {
  const { profile, session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<FormValues>(defaultFormValues);
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
      const insert: TablesInsert<"listings"> = {
        owner_id: profile.id,
        campus_id: profile.campus_id,
        title: values.title.trim(),
        housing_type: values.housing_type,
        description: values.description.trim(),
        monthly_rent: Number(values.monthly_rent),
        security_deposit: values.security_deposit
          ? Number(values.security_deposit)
          : null,
        utilities_included: values.utilities_included,
        available_start_date: values.available_start_date,
        available_end_date: values.available_end_date,
        lease_status: values.lease_status,
        neighborhood: values.neighborhood.trim(),
        address_private: values.address_private.trim() || null,
        bedrooms: values.bedrooms,
        bathrooms: values.bathrooms,
        parking_available: values.parking_available,
        laundry_available: values.laundry_available,
        furnished: values.furnished,
        pets_allowed: values.pets_allowed,
        status: publish ? "published" : "draft",
      };
      const listing = await insertListing(insert);
      if (photos.length > 0) {
        const urls = await resolvePhotos(photos, listing.id, session.user.id);
        await replaceListingPhotos(listing.id, urls);
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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
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
