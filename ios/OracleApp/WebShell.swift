import SwiftUI
import WebKit

struct WebShell: UIViewControllerRepresentable {
    @EnvironmentObject var storeKit: StoreKitBridge

    func makeUIViewController(context: Context) -> WebViewController {
        let url = URL(string: Bundle.main.object(forInfoDictionaryKey: "OracleWebURL") as? String
                      ?? "https://app.oracleinsights.app")!
        let vc = WebViewController(initialURL: url)
        storeKit.attach(to: vc)
        return vc
    }

    func updateUIViewController(_ uiViewController: WebViewController, context: Context) {}
}
