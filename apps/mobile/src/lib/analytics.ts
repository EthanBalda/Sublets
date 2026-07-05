const IS_DEV = __DEV__;

export type AnalyticsEvent =
  | { name: "feed_pass"; listingId: string }
  | { name: "feed_request"; listingId: string }
  | { name: "feed_detail_open"; listingId: string }
  | { name: "listing_create_start" }
  | { name: "listing_publish"; listingId: string }
  | { name: "listing_draft_save"; listingId: string }
  | { name: "request_accept"; requestId: string }
  | { name: "request_decline"; requestId: string }
  | { name: "message_send"; conversationId: string }
  | { name: "auth_login_start" }
  | { name: "auth_login_success" }
  | { name: "auth_logout" }
  | { name: "onboarding_complete" };

export function track(event: AnalyticsEvent): void {
  if (IS_DEV) {
    console.log("[analytics]", event.name, event);
  }
  // TODO: wire to Supabase analytics_events or PostHog before production
}
