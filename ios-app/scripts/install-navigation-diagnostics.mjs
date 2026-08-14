#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDelegatePath = path.resolve(here, "../ios/App/App/AppDelegate.swift");
const beginMarker = "// LAYERLY_NAV_DIAGNOSTICS_BEGIN";
const endMarker = "// LAYERLY_NAV_DIAGNOSTICS_END";

if (!existsSync(appDelegatePath)) {
  console.error(`✖ Cannot install navigation diagnostics: ${appDelegatePath} is missing.`);
  process.exit(1);
}

let source = readFileSync(appDelegatePath, "utf8");

// Replace the previous generated block, while leaving the Capacitor-generated
// AppDelegate itself intact.
const oldBlock = new RegExp(`${beginMarker}[\\s\\S]*?${endMarker}\\n?`, "g");
source = source.replace(oldBlock, "");
source = source.replace(
  /#if DEBUG\s*LayerlyNavigationDiagnostics\.install\(windowProvider: \{ \[weak self\] in self\?\.window \}\)\s*#endif\s*/g,
  "",
);

const launchSignature = /func application\(\s*_ application: UIApplication,\s*didFinishLaunchingWithOptions launchOptions: \[UIApplication\.LaunchOptionsKey: Any\]\?\s*\) -> Bool \{/m;
if (!launchSignature.test(source)) {
  console.error("✖ Could not find application(_:didFinishLaunchingWithOptions:) in AppDelegate.swift.");
  process.exit(1);
}

source = source.replace(
  launchSignature,
  (match) => `${match}\n#if DEBUG\n        LayerlyNavigationDiagnostics.install(windowProvider: { [weak self] in self?.window })\n#endif`,
);

const diagnostics = `
${beginMarker}
#if DEBUG
import WebKit
import ObjectiveC.runtime

/// Development-only WKWebView diagnostics. This swizzles Capacitor's existing
/// delegate callbacks and always forwards to the original implementation, so it
/// never replaces or bypasses Capacitor's WKNavigationDelegate.
private enum LayerlyNavigationDiagnostics {
    private static var didFinishInitialNavigation = false
    private static var lastFailureReason = "No navigation callback received"
    private static weak var fallbackView: UIView?
    private static var windowProvider: (() -> UIWindow?)?

    static func install(windowProvider: @escaping () -> UIWindow?) {
        self.windowProvider = windowProvider
        swizzle(#selector(WebViewDelegationHandler.webView(_:didStartProvisionalNavigation:)),
                #selector(WebViewDelegationHandler.layerly_didStart(_:navigation:)))
        swizzle(#selector(WebViewDelegationHandler.webView(_:didFinish:)),
                #selector(WebViewDelegationHandler.layerly_didFinish(_:navigation:)))
        swizzle(#selector(WebViewDelegationHandler.webView(_:didFail:withError:)),
                #selector(WebViewDelegationHandler.layerly_didFail(_:navigation:error:)))
        swizzle(#selector(WebViewDelegationHandler.webView(_:didFailProvisionalNavigation:withError:)),
                #selector(WebViewDelegationHandler.layerly_didFailProvisional(_:navigation:error:)))

        print("[Layerly Navigation] diagnostics installed; Capacitor delegate preserved")
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
            guard !didFinishInitialNavigation else { return }
            showFallback(reason: lastFailureReason)
        }
    }

    static func started(url: URL?) {
        print("[Layerly Navigation] navigation started url=\\(safeURL(url))")
    }

    static func finished(webView: WKWebView, url: URL?) {
        didFinishInitialNavigation = true
        print("[Layerly Navigation] navigation finished url=\\(safeURL(url))")
        fallbackView?.removeFromSuperview()
        webView.isHidden = false
        webView.alpha = 1

        // Report document health without reading or logging page content.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            let probe = "({readyState:document.readyState,elementCount:document.body?.children.length??-1,textLength:document.body?.innerText?.trim().length??0})"
            webView.evaluateJavaScript(probe) { result, error in
                if let error = error as NSError? {
                    print("[Layerly Navigation] JavaScript probe failed domain=\\(error.domain) code=\\(error.code) description=\\(error.localizedDescription)")
                    showFallback(reason: "Navigation finished, but JavaScript failed: \\(error.domain) (\\(error.code))")
                } else if let state = result as? [String: Any],
                          let textLength = state["textLength"] as? NSNumber,
                          textLength.intValue == 0 {
                    let reason = "Navigation finished, but the page rendered no text (possible JavaScript/app startup failure)"
                    print("[Layerly Navigation] JavaScript probe found empty page")
                    showFallback(reason: reason)
                } else {
                    print("[Layerly Navigation] JavaScript probe succeeded state=\\(String(describing: result))")
                }
            }
        }
    }

    static func failed(kind: String, webView: WKWebView, error: Error) {
        let nsError = error as NSError
        let failingURL = (nsError.userInfo[NSURLErrorFailingURLErrorKey] as? URL)
            ?? (nsError.userInfo[NSURLErrorFailingURLStringErrorKey] as? String).flatMap(URL.init(string:))
            ?? webView.url
        lastFailureReason = "\\(nsError.domain) (\\(nsError.code)): \\(nsError.localizedDescription)"
        print("[Layerly Navigation] \\(kind) url=\\(safeURL(failingURL)) domain=\\(nsError.domain) code=\\(nsError.code) description=\\(nsError.localizedDescription)")
    }

    private static func safeURL(_ url: URL?) -> String {
        guard var components = url.flatMap({ URLComponents(url: $0, resolvingAgainstBaseURL: false) }) else {
            return "(unknown)"
        }
        // Never print query strings or fragments: OAuth tokens and user data can live there.
        components.query = nil
        components.fragment = nil
        return components.url?.absoluteString ?? "(redacted)"
    }

    private static func showFallback(reason: String) {
        guard fallbackView == nil,
              let rootView = windowProvider?()?.rootViewController?.view else {
            print("[Layerly Navigation] fallback unavailable reason=\\(reason)")
            return
        }

        let fallback = UIView(frame: rootView.bounds)
        fallback.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        fallback.backgroundColor = UIColor(red: 168 / 255, green: 184 / 255, blue: 148 / 255, alpha: 1)

        let title = UILabel()
        title.text = "Layerly failed to load"
        title.font = .preferredFont(forTextStyle: .title2)
        title.textColor = UIColor(red: 47 / 255, green: 58 / 255, blue: 46 / 255, alpha: 1)
        title.textAlignment = .center

        let detail = UILabel()
        detail.text = reason
        detail.font = .preferredFont(forTextStyle: .footnote)
        detail.textColor = title.textColor
        detail.textAlignment = .center
        detail.numberOfLines = 0

        let stack = UIStackView(arrangedSubviews: [title, detail])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        fallback.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: fallback.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: fallback.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            stack.centerYAnchor.constraint(equalTo: fallback.safeAreaLayoutGuide.centerYAnchor),
        ])

        rootView.addSubview(fallback)
        fallbackView = fallback
        print("[Layerly Navigation] development fallback shown reason=\\(reason)")
    }

    private static func swizzle(_ original: Selector, _ replacement: Selector) {
        guard let originalMethod = class_getInstanceMethod(WebViewDelegationHandler.self, original),
              let replacementMethod = class_getInstanceMethod(WebViewDelegationHandler.self, replacement) else {
            print("[Layerly Navigation] failed to install callback \\(NSStringFromSelector(original))")
            return
        }
        method_exchangeImplementations(originalMethod, replacementMethod)
    }
}

private extension WebViewDelegationHandler {
    @objc func layerly_didStart(_ webView: WKWebView, navigation: WKNavigation!) {
        LayerlyNavigationDiagnostics.started(url: webView.url)
        layerly_didStart(webView, navigation: navigation)
    }

    @objc func layerly_didFinish(_ webView: WKWebView, navigation: WKNavigation!) {
        layerly_didFinish(webView, navigation: navigation)
        LayerlyNavigationDiagnostics.finished(webView: webView, url: webView.url)
    }

    @objc func layerly_didFail(_ webView: WKWebView, navigation: WKNavigation!, error: Error) {
        LayerlyNavigationDiagnostics.failed(kind: "navigation failed", webView: webView, error: error)
        layerly_didFail(webView, navigation: navigation, error: error)
    }

    @objc func layerly_didFailProvisional(_ webView: WKWebView, navigation: WKNavigation!, error: Error) {
        LayerlyNavigationDiagnostics.failed(kind: "provisional navigation failed", webView: webView, error: error)
        layerly_didFailProvisional(webView, navigation: navigation, error: error)
    }
}
#endif
${endMarker}
`;

writeFileSync(appDelegatePath, `${source.trimEnd()}\n${diagnostics}`, "utf8");
console.log("✔ Installed DEBUG-only WKWebView navigation diagnostics in AppDelegate.swift");