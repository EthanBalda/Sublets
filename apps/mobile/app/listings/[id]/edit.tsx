import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { navigateBack } from "@/lib/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getListingById, saveListing, type Listing } from "@/lib/listings";
import { resolvePhotos, replaceListingPhotos, getListingPhotos } from "@/lib/photos";
import ListingFormFields, {
  coerceDraftValues,
  defaultFormValues,
  validateForDraft,
  validateForPublish,
  type FormValues,
} from "@/components/ListingFormFields";
import type { TablesUpdate } from "@sublets/shared/types";

function listingToForm(l: Listing): FormValues {
  return {
    title: l.title,
    housing_type: l.housing_type,
    description: l.description,
    monthly_rent: String(l.monthly_rent),
    security_deposit: l.security_deposit != null ? String(l.security_deposit) : "",
    utilities_included: l.utilities_included,
    available_start_date: l.available_start_date,
    available_end_date: l.available_end_date,
    lease_status: l.lease_status,
    neighborhood: l.neighborhood,
    address_private: l.address_private ?? "",
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    parking_available: l.parking_available,
    laundry_available: l.laundry_available,
    furnished: l.furnished,
    pets_allowed: l.pets_allowed,
  };
}

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
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
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<FormValues>(defaultFormValues);
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getListingById(id), getListingPhotos(id)])
      .then(([l, photoUrls]) => {
        if (l) {
          setListing(l);
          setValues(listingToForm(l));
        }
        setPhotos(photoUrls);
      })
      .catch((e: unknown) =>
        Alert.alert("Error", e instanceof Error ? e.message : String(e))
      )
      .finally(() => setLoading(false));
  }, [id]);

  function patch(updates: Partial<FormValues>) {
    setValues((prev) => ({ ...prev, ...updates }));
  }

  async function submit(publish: boolean) {
    if (!id || !session) return;
    const errs = publish ? validateForPublish(values) : validateForDraft(values);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSubmitting(true);
    try {
      const v = publish ? values : coerceDraftValues(values);
      const update: TablesUpdate<"listings"> = {
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
      await saveListing(id, update);
      const urls = await resolvePhotos(photos, id, session.user.id);
      await replaceListingPhotos(id, urls);
      router.replace("/(tabs)/my-listings");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#208AEF" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>Listing not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Listing</Text>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  notFound: { color: "#dc2626", fontSize: 15 },
});
