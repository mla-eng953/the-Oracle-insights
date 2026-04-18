import Foundation
import UIKit
import UserNotifications

/// Requests APNs authorization, registers for remote notifications, and
/// bridges the device token back to the web layer. The web layer forwards
/// it to the `register-push-token` edge function.
@MainActor
final class PushManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = PushManager()
    weak var webVC: WebViewController?

    func attach(to vc: WebViewController) { self.webVC = vc }

    func requestPermission() async {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            if granted {
                await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
            }
        } catch {
            print("APNs permission error: \(error)")
        }
    }

    func didRegisterDeviceToken(_ deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        webVC?.postToWeb([
            "kind": "oracle:push:token",
            "platform": "ios",
            "apnsToken": token,
            "bundleId": Bundle.main.bundleIdentifier ?? "",
        ])
    }

    // Foreground presentation.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification) async
                                -> UNNotificationPresentationOptions {
        return [.banner, .sound, .list]
    }
}
