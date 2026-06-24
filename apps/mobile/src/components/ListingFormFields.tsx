import { useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { HOUSING_TYPES, UTILITIES_INCLUDED, LEASE_STATUSES } from "@sublets/shared/constants";

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseDateStr(s: string): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(s: string): string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return "Select date";
  const [y, mo, d] = s.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface FormValues {
  title: string;
  housing_type: string;
  description: string;
  monthly_rent: string;
  security_deposit: string;
  utilities_included: string;
  available_start_date: string;
  available_end_date: string;
  lease_status: string;
  neighborhood: string;
  address_private: string;
  bedrooms: number;
  bathrooms: number;
  parking_available: boolean;
  laundry_available: boolean;
  furnished: boolean;
  pets_allowed: boolean;
}

export const defaultFormValues: FormValues = {
  title: "",
  housing_type: "",
  description: "",
  monthly_rent: "",
  security_deposit: "",
  utilities_included: "",
  available_start_date: "",
  available_end_date: "",
  lease_status: "",
  neighborhood: "",
  address_private: "",
  bedrooms: 1,
  bathrooms: 1,
  parking_available: false,
  laundry_available: false,
  furnished: false,
  pets_allowed: false,
};

export function validateForPublish(v: FormValues): string[] {
  const errs: string[] = [];
  if (!v.title.trim()) errs.push("Title is required");
  if (!v.housing_type) errs.push("Housing type is required");
  if (!v.description.trim()) errs.push("Description is required");
  const rent = Number(v.monthly_rent);
  if (!v.monthly_rent || isNaN(rent) || rent <= 0)
    errs.push("Monthly rent must be greater than 0");
  if (!v.utilities_included) errs.push("Utilities is required");
  if (!v.available_start_date) errs.push("Start date is required");
  if (!v.available_end_date) errs.push("End date is required");
  if (
    v.available_start_date &&
    v.available_end_date &&
    v.available_start_date >= v.available_end_date
  )
    errs.push("End date must be after start date");
  if (!v.neighborhood.trim()) errs.push("Neighborhood is required");
  if (v.bedrooms < 0) errs.push("Bedrooms must be 0 or more");
  if (v.bathrooms <= 0) errs.push("Bathrooms must be greater than 0");
  if (!v.lease_status) errs.push("Lease status is required");
  return errs;
}

export function validateForDraft(v: FormValues): string[] {
  if (!v.title.trim()) return ["Title is required to save a draft"];
  return [];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={s.fieldLabel}>
      {label}
      {required ? <Text style={s.required}> *</Text> : null}
    </Text>
  );
}

function SelectPills({
  options,
  value,
  onChange,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.pillRow}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((o) => (
        <Pressable
          key={o.value}
          style={[s.pill, value === o.value && s.pillActive]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[s.pillText, value === o.value && s.pillTextActive]}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min = 0,
  step = 0.5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <View style={s.stepperRow}>
      <Text style={s.stepperLabel}>
        {label} <Text style={s.required}>*</Text>
      </Text>
      <View style={s.stepper}>
        <Pressable
          style={s.stepBtn}
          onPress={() => onChange(+(Math.max(min, value - step)).toFixed(1))}
        >
          <Text style={s.stepBtnText}>−</Text>
        </Pressable>
        <Text style={s.stepValue}>{value}</Text>
        <Pressable
          style={s.stepBtn}
          onPress={() => onChange(+(value + step).toFixed(1))}
        >
          <Text style={s.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const MAX_PHOTOS = 6;

interface ListingFormFieldsProps {
  values: FormValues;
  onChange: (patch: Partial<FormValues>) => void;
  errors: string[];
  submitting: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  photos?: string[];
  onPhotosChange?: (photos: string[]) => void;
}

export default function ListingFormFields({
  values,
  onChange,
  errors,
  submitting,
  onSaveDraft,
  onPublish,
  photos = [],
  onPhotosChange,
}: ListingFormFieldsProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<"start" | "end" | null>(null);
  const [tempDate, setTempDate] = useState(new Date());

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    onChange({ [key]: val } as Partial<FormValues>);
  }

  function openDatePicker(field: "start" | "end") {
    const existing = field === "start"
      ? values.available_start_date
      : values.available_end_date;
    setTempDate(parseDateStr(existing));
    setActiveDateField(field);
    setShowDatePicker(true);
  }

  function applyDate(date: Date) {
    if (!activeDateField) return;
    set(
      activeDateField === "start" ? "available_start_date" : "available_end_date",
      toDateStr(date)
    );
  }

  function confirmIOSDate() {
    applyDate(tempDate);
    setShowDatePicker(false);
    setActiveDateField(null);
  }

  function handleAndroidChange(event: DateTimePickerEvent, date?: Date) {
    setShowDatePicker(false);
    if (event.type === "set" && date) applyDate(date);
    setActiveDateField(null);
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Allow Sublets to access your photos in Settings."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log("[ListingFormFields] picked photo:", JSON.stringify({
        uri: asset.uri.slice(0, 100),
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        width: asset.width,
        height: asset.height,
      }));
      onPhotosChange?.([...photos, asset.uri]);
    }
  }

  function removePhoto(index: number) {
    onPhotosChange?.(photos.filter((_, i) => i !== index));
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {errors.length > 0 && (
          <View style={s.errorBox}>
            {errors.map((e, i) => (
              <Text key={i} style={s.errorItem}>
                • {e}
              </Text>
            ))}
          </View>
        )}

        {onPhotosChange !== undefined && (
          <Section title="Photos">
            <Text style={s.photoHint}>
              Up to {MAX_PHOTOS} photos. First photo is the cover.
            </Text>
            <View style={s.photoGrid}>
              {photos.map((uri, i) => (
                <View key={`${i}-${uri.slice(-8)}`} style={s.photoThumb}>
                  <Image source={{ uri }} style={s.thumbImg} contentFit="cover" />
                  <Pressable
                    style={s.thumbRemove}
                    onPress={() => removePhoto(i)}
                  >
                    <Text style={s.thumbRemoveText}>×</Text>
                  </Pressable>
                </View>
              ))}
              {photos.length < MAX_PHOTOS && (
                <Pressable
                  style={s.addPhotoBtn}
                  onPress={() => void pickPhoto()}
                  disabled={submitting}
                >
                  <Text style={s.addPhotoBtnText}>+{"\n"}Add</Text>
                </Pressable>
              )}
            </View>
          </Section>
        )}

        <Section title="Basics">
          <FieldLabel label="Title" required />
          <TextInput
            style={s.input}
            placeholder="e.g. Private room near UCSD"
            value={values.title}
            onChangeText={(t) => set("title", t)}
          />

          <FieldLabel label="Housing type" required />
          <SelectPills
            options={HOUSING_TYPES}
            value={values.housing_type}
            onChange={(v) => set("housing_type", v)}
          />

          <FieldLabel label="Description" required />
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Describe the space, house rules, ideal roommate…"
            value={values.description}
            onChangeText={(t) => set("description", t)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Section>

        <Section title="Rent & Utilities">
          <FieldLabel label="Monthly rent ($)" required />
          <TextInput
            style={s.input}
            placeholder="e.g. 950"
            value={values.monthly_rent}
            onChangeText={(t) => set("monthly_rent", t)}
            keyboardType="numeric"
          />

          <FieldLabel label="Security deposit ($)" />
          <TextInput
            style={s.input}
            placeholder="Optional"
            value={values.security_deposit}
            onChangeText={(t) => set("security_deposit", t)}
            keyboardType="numeric"
          />

          <FieldLabel label="Utilities" required />
          <SelectPills
            options={UTILITIES_INCLUDED}
            value={values.utilities_included}
            onChange={(v) => set("utilities_included", v)}
          />
        </Section>

        <Section title="Availability & Lease">
          <FieldLabel label="Start date" required />
          <Pressable
            style={s.dateBtn}
            onPress={() => openDatePicker("start")}
            disabled={submitting}
          >
            <Text
              style={[
                s.dateBtnText,
                !values.available_start_date && s.dateBtnPlaceholder,
              ]}
            >
              {values.available_start_date
                ? formatDateDisplay(values.available_start_date)
                : "Select start date"}
            </Text>
          </Pressable>

          <FieldLabel label="End date" required />
          <Pressable
            style={s.dateBtn}
            onPress={() => openDatePicker("end")}
            disabled={submitting}
          >
            <Text
              style={[
                s.dateBtnText,
                !values.available_end_date && s.dateBtnPlaceholder,
              ]}
            >
              {values.available_end_date
                ? formatDateDisplay(values.available_end_date)
                : "Select end date"}
            </Text>
          </Pressable>

          <FieldLabel label="Lease status" required />
          <SelectPills
            options={LEASE_STATUSES}
            value={values.lease_status}
            onChange={(v) => set("lease_status", v)}
          />
        </Section>

        {/* iOS: bottom-sheet modal with Done/Cancel */}
        {Platform.OS === "ios" && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={s.modalOverlay}>
              <View style={s.modalSheet}>
                <View style={s.modalHeader}>
                  <Pressable onPress={() => { setShowDatePicker(false); setActiveDateField(null); }}>
                    <Text style={s.modalCancel}>Cancel</Text>
                  </Pressable>
                  <Text style={s.modalTitle}>
                    {activeDateField === "start" ? "Start Date" : "End Date"}
                  </Text>
                  <Pressable onPress={confirmIOSDate}>
                    <Text style={s.modalDone}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, d) => { if (d) setTempDate(d); }}
                  style={s.iosPicker}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android: native dialog, no modal wrapper needed */}
        {Platform.OS === "android" && showDatePicker && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            onChange={handleAndroidChange}
          />
        )}

        <Section title="Location">
          <FieldLabel label="Neighborhood" required />
          <TextInput
            style={s.input}
            placeholder="e.g. La Jolla, UTC, Pacific Beach"
            value={values.neighborhood}
            onChangeText={(t) => set("neighborhood", t)}
          />

          <FieldLabel label="Private address (shown only to accepted seekers)" />
          <TextInput
            style={s.input}
            placeholder="Optional — full address"
            value={values.address_private}
            onChangeText={(t) => set("address_private", t)}
          />
        </Section>

        <Section title="Unit Details">
          <Stepper
            label="Bedrooms"
            value={values.bedrooms}
            onChange={(v) => set("bedrooms", v)}
            min={0}
          />
          <Stepper
            label="Bathrooms"
            value={values.bathrooms}
            onChange={(v) => set("bathrooms", v)}
            min={0.5}
          />
        </Section>

        <Section title="Amenities">
          <ToggleRow
            label="Parking available"
            value={values.parking_available}
            onChange={(v) => set("parking_available", v)}
          />
          <ToggleRow
            label="Laundry available"
            value={values.laundry_available}
            onChange={(v) => set("laundry_available", v)}
          />
          <ToggleRow
            label="Furnished"
            value={values.furnished}
            onChange={(v) => set("furnished", v)}
          />
          <ToggleRow
            label="Pets allowed"
            value={values.pets_allowed}
            onChange={(v) => set("pets_allowed", v)}
          />
        </Section>

        <View style={s.actions}>
          <Pressable
            style={[s.btnDraft, submitting && s.btnDisabled]}
            onPress={onSaveDraft}
            disabled={submitting}
          >
            <Text style={s.btnDraftText}>
              {submitting ? "Saving…" : "Save Draft"}
            </Text>
          </Pressable>
          <Pressable
            style={[s.btnPublish, submitting && s.btnDisabled]}
            onPress={onPublish}
            disabled={submitting}
          >
            <Text style={s.btnPublishText}>
              {submitting ? "Publishing…" : "Publish"}
            </Text>
          </Pressable>
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginTop: 10,
    marginBottom: 4,
  },
  required: { color: "#dc2626" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1a1a1a",
  },
  textarea: { minHeight: 100 },
  pillRow: { marginBottom: 4 },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
    marginBottom: 4,
  },
  pillActive: { backgroundColor: "#208AEF" },
  pillText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  pillTextActive: { color: "#fff" },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  stepperLabel: { fontSize: 15, color: "#1a1a1a", fontWeight: "500" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 16 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { fontSize: 22, fontWeight: "500", color: "#1a1a1a", lineHeight: 28 },
  stepValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    minWidth: 36,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  toggleLabel: { fontSize: 15, color: "#1a1a1a" },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  errorItem: { fontSize: 13, color: "#dc2626" },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  btnDraft: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnPublish: {
    flex: 1,
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDraftText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  btnPublishText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  btnDisabled: { opacity: 0.5 },
  bottomPad: { height: 24 },
  photoHint: { fontSize: 13, color: "#888", marginBottom: 10 },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  thumbImg: { width: 80, height: 80 },
  thumbRemove: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbRemoveText: { color: "#fff", fontSize: 16, lineHeight: 20 },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#d0d0d0",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9f9f9",
  },
  addPhotoBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#208AEF",
    textAlign: "center",
    lineHeight: 18,
  },
  dateBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateBtnText: { fontSize: 15, color: "#1a1a1a" },
  dateBtnPlaceholder: { color: "#aaa" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  modalCancel: { fontSize: 16, color: "#888" },
  modalDone: { fontSize: 16, fontWeight: "700", color: "#208AEF" },
  iosPicker: { height: 200 },
});
