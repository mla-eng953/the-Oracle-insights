import SwiftUI

@main
struct OracleApp: App {
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
                }
        }
    }
}
