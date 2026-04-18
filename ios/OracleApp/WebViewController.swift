import UIKit
import WebKit

/// Hosts the WKWebView that loads the Oracle PWA, and installs the
/// `oracle` script-message handler that the StoreKit bridge listens on.
final class WebViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    let webView: WKWebView
    private let initialURL: URL
    weak var storeKit: StoreKitBridge?

    init(initialURL: URL) {
        self.initialURL = initialURL
        let config = WKWebViewConfiguration()
        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs
        config.allowsInlineMediaPlayback = true
        let contentController = WKUserContentController()
        config.userContentController = contentController
        self.webView = WKWebView(frame: .zero, configuration: config)
        super.init(nibName: nil, bundle: nil)
        contentController.add(self, name: "oracle")
    }

    required init?(coder: NSCoder) { fatalError() }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.backgroundColor = .black
        webView.isOpaque = false
        webView.allowsBackForwardNavigationGestures = true
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        webView.load(URLRequest(url: initialURL))
    }

    // MARK: - Script message handler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let kind = body["kind"] as? String else { return }
        switch kind {
        case "oracle:iap:purchase":
            guard let plan = body["plan"] as? String else { return }
            Task { await storeKit?.purchase(plan: plan) }
        case "oracle:iap:restore":
            Task { await storeKit?.restore() }
        default: break
        }
    }

    /// Called from StoreKit bridge to notify the web side.
    func postToWeb(_ payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        let js = "window.dispatchEvent(new MessageEvent('message', { data: \(json) }));"
        webView.evaluateJavaScript(js)
    }
}
