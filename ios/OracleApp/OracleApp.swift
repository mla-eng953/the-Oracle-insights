import SwiftUI

@main
struct OracleApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var storeKit = StoreKitBridge()

    var body: some Scene {
        WindowGroup {
            WebShell()
                .environmentObject(storeKit)
                .ignoresSafeArea()
                .statusBarHidden(false)
                .task {
                    await storeKit.loadProducts()
                    await storeKit.listenForTransactionUpdates()
                    await PushManager.shared.requestPermission()
                }
        }
    }
}
