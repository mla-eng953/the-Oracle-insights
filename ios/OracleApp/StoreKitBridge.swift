import Foundation
import StoreKit

/// StoreKit 2 purchase manager for Oracle's Pro / Elite subscriptions.
/// Products defined in `products.json`; App Store Connect product IDs must match.
@MainActor
final class StoreKitBridge: ObservableObject {
    @Published private(set) var products: [Product] = []
    private var updateListenerTask: Task<Void, Never>?
    private weak var webVC: WebViewController?

    private static let productIds: [String: String] = [
        "pro": "app.oracleinsights.pro.monthly",
        "elite": "app.oracleinsights.elite.monthly",
    ]

    func attach(to vc: WebViewController) {
        self.webVC = vc
        vc.storeKit = self
    }

    func loadProducts() async {
        do {
            self.products = try await Product.products(for: Array(Self.productIds.values))
        } catch {
            print("StoreKit products error: \(error)")
        }
    }

    func listenForTransactionUpdates() async {
        updateListenerTask?.cancel()
        updateListenerTask = Task.detached { [weak self] in
            for await result in Transaction.updates {
                await self?.handle(result: result)
            }
        }
    }

    func purchase(plan: String) async {
        guard let pid = Self.productIds[plan],
              let product = products.first(where: { $0.id == pid }) else {
            postToWeb(["kind": "oracle:iap:error", "error": "Product not loaded"])
            return
        }
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                await handle(result: verification)
            case .userCancelled:
                postToWeb(["kind": "oracle:iap:cancelled"])
            case .pending:
                postToWeb(["kind": "oracle:iap:pending"])
            @unknown default:
                postToWeb(["kind": "oracle:iap:error", "error": "Unknown result"])
            }
        } catch {
            postToWeb(["kind": "oracle:iap:error", "error": "\(error)"])
        }
    }

    func restore() async {
        try? await AppStore.sync()
    }

    private func handle(result: VerificationResult<Transaction>) async {
        switch result {
        case .verified(let tx):
            await tx.finish()
            let plan = Self.productIds.first(where: { $0.value == tx.productID })?.key ?? "unknown"
            postToWeb([
                "kind": "oracle:iap:success",
                "plan": plan,
                "productId": tx.productID,
                "transactionId": "\(tx.id)",
                "originalTransactionId": "\(tx.originalID)",
            ])
        case .unverified(_, let error):
            postToWeb(["kind": "oracle:iap:error", "error": "Unverified: \(error)"])
        }
    }

    private func postToWeb(_ payload: [String: Any]) {
        webVC?.postToWeb(payload)
    }
}
