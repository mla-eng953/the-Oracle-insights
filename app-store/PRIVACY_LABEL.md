# App Privacy — exact answers for App Store Connect

Work through every section. Apple rejects inconsistent declarations — this doc is the single source of truth.

## Does your app collect any data?

**Yes.**

## Data collection table

| Data type | Linked to user | Used for tracking | Purposes |
|---|---|---|---|
| **Email address** | Yes | No | App Functionality, Account Management |
| **User ID** (Supabase UUID) | Yes | No | App Functionality, Analytics |
| **Name** (from Apple ID / Google OAuth only if provided) | Yes | No | App Functionality |
| **Date of birth** | Yes | No | App Functionality (21+ gate) |
| **Government ID image** (Persona flow) | Yes | No | App Functionality, Fraud Prevention |
| **Coarse location** (country/region only) | Yes | No | App Functionality (jurisdiction gating) |
| **Device ID** (FingerprintJS visitor ID) | Yes | No | Fraud Prevention |
| **Product interaction** (picks viewed, tracked) | Yes | No | App Functionality, Analytics |
| **Purchase history** (StoreKit transaction IDs) | Yes | No | App Functionality |
| **Crash data** | No (optional opt-in; IDs hashed) | No | Analytics |
| **Performance data** | No (optional opt-in) | No | Analytics |
| **Diagnostics** | No (optional opt-in) | No | Analytics |

## Tracking disclosure

**We do not track users across apps or websites owned by other companies.**
- No third-party ad SDKs.
- No IDFA prompt.
- Do not declare "Tracking" in the privacy manifest.
- PostHog configured with `$ip` in `property_denylist` and `autocapture: false`.

## Privacy manifest (PrivacyInfo.xcprivacy)

Required by Apple since May 2024. Ship the file inside the main app bundle.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeUserID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
        <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypePhysicalAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeDeviceID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
        <string>NSPrivacyCollectedDataTypePurposeFraudPreventionSecurityAndCompliance</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeCrashData</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <false/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>CA92.1</string></array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>35F9.1</string></array>
    </dict>
  </array>
</dict>
</plist>
```

Save as `ios/OracleApp/PrivacyInfo.xcprivacy` and add to the target's resources in `project.yml`.
