import { BLOCKED_COUNTRIES, RESTRICTED_US_STATES, type ComplianceCheck } from "@/types/compliance";

export function evaluateJurisdiction(country: string | undefined, region: string | undefined): Pick<ComplianceCheck, "status" | "restrictionReason" | "jurisdiction"> {
  const iso = (country ?? "").toUpperCase();
  const reg = (region ?? "").toUpperCase();
  if (!iso) return { status: "unknown", jurisdiction: "unknown" };
  if (BLOCKED_COUNTRIES.has(iso)) {
    return { status: "restricted", jurisdiction: iso, restrictionReason: "Blocked country" };
  }
  if (iso === "US" && reg && RESTRICTED_US_STATES.has(reg)) {
    return { status: "restricted", jurisdiction: `US-${reg}`, restrictionReason: "Sports betting info restricted in this state" };
  }
  return { status: "allowed", jurisdiction: iso === "US" ? `US-${reg || "??"}` : iso };
}

export function hasValidAge(dobIso: string | undefined, minAge: number): boolean {
  if (!dobIso) return false;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= minAge;
}

export function summaryLine(check: ComplianceCheck): string {
  if (check.status === "allowed" && check.ageVerified) return `Verified — ${check.jurisdiction}`;
  if (check.status === "restricted") return `Restricted — ${check.restrictionReason ?? check.jurisdiction}`;
  if (check.status === "underage") return `Age verification required`;
  return `Unverified`;
}
