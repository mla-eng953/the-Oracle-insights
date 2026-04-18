export type EntitlementTier = "free" | "pro" | "elite";

export type FeatureKey =
  | "view_picks"
  | "track_pick_limited"
  | "track_pick_unlimited"
  | "basic_analytics"
  | "full_analytics"
  | "clv_dashboard"
  | "strategy_profiles"
  | "alerts"
  | "early_picks"
  | "api_access"
  | "priority_support";

export interface Entitlement {
  tier: EntitlementTier;
  features: FeatureKey[];
  expiresAt?: string;
  source: "default" | "stripe" | "apple" | "admin";
}

export const TIER_LABEL: Record<EntitlementTier, string> = {
  free: "Free",
  pro: "Pro",
  elite: "Elite",
};

export const TIER_PRICE_USD_MONTHLY: Record<Exclude<EntitlementTier, "free">, number> = {
  pro: 19,
  elite: 49,
};
