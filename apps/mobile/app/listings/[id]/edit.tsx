import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getListingById, saveListing, type Listing } from "@/lib/listings";
import ListingFormFields, {
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<FormValues>(defaultFormValues);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getListingById(id)
      .then((l) => {
        if (l) {
          setListing(l);
          setValues(listingToForm(l));
        }
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
    if (!id) return;
    const errs = publish ? validateForPublish(values) : validateForDraft(values);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSubmitting(true);
    try {
      const update: TablesUpdate<"listings"> = {
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
      await saveListing(id, update);
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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
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
