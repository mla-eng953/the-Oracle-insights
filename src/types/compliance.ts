export type ComplianceStatus = "allowed" | "restricted" | "unknown" | "underage";

export interface ComplianceCheck {
  status: ComplianceStatus;
  jurisdiction: string;
  region?: string;
  country: string;
  restrictionReason?: string;
  ageVerified: boolean;
  ageVerifiedAt?: string;
  checkedAt: string;
  isVpn?: boolean;
  isHosting?: boolean;
  isTor?: boolean;
  riskScore?: number;
}

export interface ResponsibleGamblingState {
  selfExcludedUntil?: string;
  dailySessionLimitMinutes?: number;
  weeklyDepositLimitUsd?: number;
  lossLimitUsd?: number;
  lossLimitPeriodDays?: number;
  cooloffActive: boolean;
  lastNudgeAt?: string;
}

export const RESTRICTED_US_STATES = new Set([
  "CA", "TX", "GA", "SC", "AL", "MN", "MO", "HI", "UT", "ID", "WI", "OK", "AK",
]);

export const BLOCKED_COUNTRIES = new Set(["CU", "IR", "KP", "SY", "RU"]);
