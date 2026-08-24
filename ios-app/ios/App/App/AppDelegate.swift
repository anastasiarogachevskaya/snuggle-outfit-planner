import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
// Override point for customization after application launch.
        return true
    }

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// LAYERLY_NAV_DIAGNOSTICS_BEGIN
#if DEBUG
import WebKit

/// Development-only WKWebView load diagnostics.
///
/// Observation only: this never becomes the WKNavigationDelegate, never calls
/// loadRequest, and never mutates the DOM. It reads public state through KVO
/// and a read-only JavaScript probe, so Capacitor's own bridge and delegate are
/// left completely untouched.
final class LayerlyDiagnostics: NSObject {
    private static let shared = LayerlyDiagnostics()

    private var windowProvider: (() -> UIWindow?)?
    private var observations: [NSKeyValueObservation] = []
    private weak var webView: WKWebView?
    private var didReportLoaded = false
    private var lastFailureReason = "No navigation completed within 5s"
    private weak var fallbackView: UIView?

    static func install(windowProvider: @escaping () -> UIWindow?) {
        shared.windowProvider = windowProvider
        // The storyboard's CAPBridgeViewController creates its web view during
        // viewDidLoad, so attach on the next runloop passes rather than now.
        shared.attach(attempt: 0)
    }

    private func attach(attempt: Int) {
        guard let controller = Self.findBridgeController(windowProvider?()?.rootViewController) else {
            if attempt < 20 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                    self?.attach(attempt: attempt + 1)
                }
            } else {
                log("could not find CAPBridgeViewController in the view hierarchy")
            }
            return
        }
        guard let webView = controller.bridge?.webView ?? Self.findWebView(controller.view) else {
            if attempt < 20 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                    self?.attach(attempt: attempt + 1)
                }
            } else {
                log("CAPBridgeViewController has no webView")
            }
            return
        }

        self.webView = webView
        let configuredURL = controller.bridge?.config.serverURL.absoluteString
        log("Layerly native start URL: \(configuredURL ?? "(bundled assets — no server.url configured)")")
        log("initial webView.url=\(safe(webView.url)) isLoading=\(webView.isLoading)")

        observations = [
            webView.observe(\.url, options: [.new]) { [weak self] view, _ in
                self?.log("navigation started url=\(Self.safeStatic(view.url))")
            },
            webView.observe(\.isLoading, options: [.new]) { [weak self] view, change in
                guard let loading = change.newValue else { return }
                if loading {
                    self?.log("loading began url=\(Self.safeStatic(view.url))")
                } else {
                    self?.navigationSettled(view)
                }
            },
            webView.observe(\.estimatedProgress, options: [.new]) { [weak self] view, _ in
                if view.estimatedProgress >= 1.0 { self?.navigationSettled(view) }
            },
        ]

        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
            guard let self, !self.didReportLoaded else { return }
            self.log("no completed navigation after 5s; last known reason=\(self.lastFailureReason)")
            self.dumpLayerState(webView)
            self.showFallback(reason: self.lastFailureReason)
        }
    }

    private func navigationSettled(_ webView: WKWebView) {
        guard !didReportLoaded, !webView.isLoading else { return }
        didReportLoaded = true
        log("navigation completed url=\(Self.safeStatic(webView.url))")
        dumpLayerState(webView)
        probePage(webView)
    }

    /// Read-only page-health probe: distinguishes "URL failed to load" from
    /// "HTML loaded but React never hydrated" from "rendered but hidden".
    private func probePage(_ webView: WKWebView) {
        let js = """
        (function () {
          var b = document.body;
          var s = b ? getComputedStyle(b) : null;
          return {
            readyState: document.readyState,
            href: document.location.href.split('?')[0].split('#')[0],
            textLength: b && b.innerText ? b.innerText.trim().length : 0,
            childCount: b ? b.children.length : -1,
            bodyBackground: s ? s.backgroundColor : 'n/a',
            bodyVisibility: s ? s.visibility : 'n/a',
            bodyOpacity: s ? s.opacity : 'n/a',
            rootChildren: document.getElementById('root') ? document.getElementById('root').children.length : -1
          };
        })()
        """
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
            webView.evaluateJavaScript(js) { result, error in
                guard let self else { return }
                if let error = error as NSError? {
                    self.log(
                        "JavaScript probe failed domain=\(error.domain) code=\(error.code) description=\(error.localizedDescription)"
                    )
                    self.showFallback(reason: "Page loaded, but JavaScript failed: \(error.domain) (\(error.code))")
                    return
                }
                guard let state = result as? [String: Any] else {
                    self.log("JavaScript probe returned no state")
                    return
                }
                self.log("page state \(state)")
                let textLength = (state["textLength"] as? NSNumber)?.intValue ?? 0
                if textLength == 0 {
                    self.showFallback(
                        reason: "Navigation finished but the page rendered no text — JavaScript/hydration failure"
                    )
                }
            }
        }
    }

    /// Reports whether a native layer, not the page, is what you are looking at.
    private func dumpLayerState(_ webView: WKWebView) {
        log(
            "webView isHidden=\(webView.isHidden) alpha=\(webView.alpha) frame=\(webView.frame) "
                + "opaque=\(webView.isOpaque) window=\(webView.window != nil ? "attached" : "detached")"
        )
        if let siblings = webView.superview?.subviews {
            let above = siblings.drop(while: { $0 !== webView }).dropFirst()
            for view in above where !view.isHidden && view.alpha > 0.01 {
                log("view above webView: \(type(of: view)) frame=\(view.frame) alpha=\(view.alpha)")
            }
        }
    }

    private static func findWebView(_ view: UIView?) -> WKWebView? {
        guard let view else { return nil }
        if let webView = view as? WKWebView { return webView }
        for subview in view.subviews {
            if let found = findWebView(subview) { return found }
        }
        return nil
    }

    private static func findBridgeController(_ root: UIViewController?) -> CAPBridgeViewController? {
        guard let root else { return nil }
        if let bridge = root as? CAPBridgeViewController { return bridge }
        if let presented = root.presentedViewController,
           let found = findBridgeController(presented) { return found }
        for child in root.children {
            if let found = findBridgeController(child) { return found }
        }
        return nil
    }

    /// Never print query strings or fragments: OAuth tokens can live there.
    private static func safeStatic(_ url: URL?) -> String {
        guard var components = url.flatMap({ URLComponents(url: $0, resolvingAgainstBaseURL: false) }) else {
            return "(none)"
        }
        components.query = nil
        components.fragment = nil
        return components.url?.absoluteString ?? "(redacted)"
    }

    private func safe(_ url: URL?) -> String { Self.safeStatic(url) }

    private func log(_ message: String) {
        print("[Layerly Diagnostics] \(message)")
    }

    private func showFallback(reason: String) {
        guard fallbackView == nil,
              let rootView = windowProvider?()?.rootViewController?.view else {
            log("fallback unavailable reason=\(reason)")
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
        log("development fallback shown reason=\(reason)")
    }
}
#endif
// LAYERLY_NAV_DIAGNOSTICS_END
