# Oracle iOS shell

A thin SwiftUI + WKWebView wrapper around the PWA that:

1. Loads `https://app.oracleinsights.app` (or `OracleWebURL` from `Info.plist`).
2. Registers as a native StoreKit 2 consumer so subscriptions stay inside Apple's billing system — required by App Store Review Guideline 3.1.1.
3. Bridges StoreKit purchases to the JS side via a `WKScriptMessageHandler`.
4. Exposes the user's App Account Token so `apple-webhook` can link the receipt to the Supabase user.

## Layout

```
ios/
  OracleApp.xcodeproj/        # generate via `xcodegen generate` from project.yml
  OracleApp/
    OracleApp.swift           # @main App
    WebShell.swift            # SwiftUI wrapper for WKWebView
    WebViewController.swift   # UIKit shell, installs script handler
    StoreKitBridge.swift      # StoreKit 2 integration + message bridge
    StoreConfig.storekit      # Local test config for sandbox
    Info.plist                # OracleWebURL, UIRequiresFullScreen, etc.
    products.json             # Product identifiers mirrored from App Store Connect
    project.yml               # xcodegen config
```

## First-time setup

1. `brew install xcodegen`
2. From `ios/`, run `xcodegen generate`.
3. Open `OracleApp.xcodeproj` in Xcode, select your Apple Developer team.
4. Enable *In-App Purchase* capability.
5. Mirror product IDs from App Store Connect into `products.json`:
   - `app.oracleinsights.pro.monthly`
   - `app.oracleinsights.elite.monthly`
6. Run on Simulator with the StoreKit configuration file selected for sandbox testing.

## Bridge contract

**Web → Native** (triggered from `/billing` on iOS standalone):
```json
{ "kind": "oracle:iap:purchase", "plan": "pro" }
```

**Native → Web** (posted back on success):
```json
{
  "kind": "oracle:iap:success",
  "plan": "pro",
  "originalTransactionId": "200000XXXXXXXXXX",
  "transactionId": "200000XXXXXXXXXY"
}
```

Web code catches the native success event and calls the `link-apple-receipt` edge function with the original transaction ID so the server-side entitlement reconciliation can resolve a Supabase user.

## Not covered here

- Push notifications — requires APNs key + `UIApplicationDelegate` wiring.
- Universal Links for OAuth callback — `apple-app-site-association` must live at `https://app.oracleinsights.app/.well-known/apple-app-site-association`.
- TestFlight / App Store Connect setup.
