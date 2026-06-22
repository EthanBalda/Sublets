// Hand-rolled Database type for the Sublets schema.
// When the Supabase CLI is wired up, this file can be replaced by the output
// of `supabase gen types typescript --local > lib/supabase/types.ts`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ListingStatus =
  | "draft"
  | "published"
  | "paused"
  | "filled"
  | "expired"
  | "removed";

export type ProfileRole = "seeker" | "lister" | "both";

export type WaitlistIntent = "list_place" | "find_place" | "both" | "other";

export type InterestRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

type Timestamp = string;

export interface Database {
  public: {
    Tables: {
      campuses: {
        Row: {
          id: string;
          name: string;
          domain_suffix: string;
          city: string;
          state: string;
          is_supported: boolean;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          domain_suffix: string;
          city: string;
          state: string;
          is_supported?: boolean;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["campuses"]["Insert"]>;
        Relationships: [];
      };

      profiles: {
        Row: {
          id: string;
          user_id: string;
          campus_id: string;
          full_name: string;
          profile_photo_url: string | null;
          major: string;
          graduation_year: number;
          bio: string;
          role: ProfileRole;
          is_onboarded: boolean;
          is_admin: boolean;
          is_suspended: boolean;
          verification_status: string;
          id_verification_status: string;
          cleanliness: string | null;
          noise_level: string | null;
          smoking_preference: string | null;
          pets_preference: string | null;
          guests_frequency: string | null;
          sleep_schedule: string | null;
          gender_preference: string | null;
          room_sharing_preference: string | null;
          heard_from: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          user_id: string;
          campus_id: string;
          full_name: string;
          profile_photo_url?: string | null;
          major: string;
          graduation_year: number;
          bio?: string;
          role: ProfileRole;
          is_onboarded?: boolean;
          is_admin?: boolean;
          is_suspended?: boolean;
          verification_status?: string;
          id_verification_status?: string;
          cleanliness?: string | null;
          noise_level?: string | null;
          smoking_preference?: string | null;
          pets_preference?: string | null;
          guests_frequency?: string | null;
          sleep_schedule?: string | null;
          gender_preference?: string | null;
          room_sharing_preference?: string | null;
          heard_from?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };

      waitlist_entries: {
        Row: {
          id: string;
          email: string;
          campus_name: string | null;
          intent: WaitlistIntent;
          target_dates: string | null;
          budget: string | null;
          referral_source: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          email: string;
          campus_name?: string | null;
          intent: WaitlistIntent;
          target_dates?: string | null;
          budget?: string | null;
          referral_source?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["waitlist_entries"]["Insert"]
        >;
        Relationships: [];
      };

      listings: {
        Row: {
          id: string;
          owner_id: string;
          campus_id: string;
          title: string;
          housing_type: string;
          monthly_rent: number;
          security_deposit: number | null;
          utilities_included: string;
          available_start_date: string;
          available_end_date: string;
          address_private: string | null;
          neighborhood: string;
          distance_to_campus: string | null;
          bedrooms: number;
          bathrooms: number;
          total_roommates: number | null;
          room_sharing_required: boolean;
          parking_available: boolean;
          laundry_available: boolean;
          furnished: boolean;
          pets_allowed: boolean;
          appliances: string[];
          description: string;
          lease_status: string;
          status: ListingStatus;
          is_featured: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
          filled_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          campus_id: string;
          title: string;
          housing_type: string;
          monthly_rent: number;
          security_deposit?: number | null;
          utilities_included: string;
          available_start_date: string;
          available_end_date: string;
          address_private?: string | null;
          neighborhood: string;
          distance_to_campus?: string | null;
          bedrooms: number;
          bathrooms: number;
          total_roommates?: number | null;
          room_sharing_required?: boolean;
          parking_available?: boolean;
          laundry_available?: boolean;
          furnished?: boolean;
          pets_allowed?: boolean;
          appliances?: string[];
          description: string;
          lease_status: string;
          status: ListingStatus;
          is_featured?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
          filled_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["listings"]["Insert"]>;
        Relationships: [];
      };

      listing_photos: {
        Row: {
          id: string;
          listing_id: string;
          storage_url: string;
          sort_order: number;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          listing_id: string;
          storage_url: string;
          sort_order?: number;
          created_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["listing_photos"]["Insert"]
        >;
        Relationships: [];
      };

      favorites: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["favorites"]["Insert"]>;
        Relationships: [];
      };

      conversations: {
        Row: {
          id: string;
          listing_id: string;
          seeker_id: string;
          lister_id: string;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          listing_id: string;
          seeker_id: string;
          lister_id: string;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["conversations"]["Insert"]
        >;
        Relationships: [];
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          read_at: Timestamp | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          read_at?: Timestamp | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [];
      };

      interest_requests: {
        Row: {
          id: string;
          listing_id: string;
          seeker_id: string;
          lister_id: string;
          status: InterestRequestStatus;
          message: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
          completed_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          listing_id: string;
          seeker_id: string;
          lister_id: string;
          status: InterestRequestStatus;
          message?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
          completed_at?: Timestamp | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["interest_requests"]["Insert"]
        >;
        Relationships: [];
      };

      sublet_checklist_items: {
        Row: {
          id: string;
          interest_request_id: string;
          key: string;
          label: string;
          completed_by_seeker: boolean;
          completed_by_lister: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          interest_request_id: string;
          key: string;
          label: string;
          completed_by_seeker?: boolean;
          completed_by_lister?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["sublet_checklist_items"]["Insert"]
        >;
        Relationships: [];
      };

      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          listing_id: string | null;
          conversation_id: string | null;
          reason: string;
          details: string | null;
          status: ReportStatus;
          admin_notes: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id?: string | null;
          listing_id?: string | null;
          conversation_id?: string | null;
          reason: string;
          details?: string | null;
          status: ReportStatus;
          admin_notes?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };

      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_name: string;
          metadata_json: Json;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_name: string;
          metadata_json?: Json;
          created_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["analytics_events"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_profile_id: { Args: Record<string, never>; Returns: string };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
