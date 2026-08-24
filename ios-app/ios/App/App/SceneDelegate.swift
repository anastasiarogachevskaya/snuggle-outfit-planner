import UIKit
import Capacitor

/// Scene lifecycle entry point for iOS 13 and later.
///
/// Capacitor still owns the storyboard bridge controller; this delegate only
/// supplies the scene window and forwards URLs / activities to Capacitor.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard scene is UIWindowScene else { return }

#if DEBUG
        LayerlyDiagnostics.install(windowProvider: { [weak self] in self?.window })
#endif

        if let context = connectionOptions.urlContexts.first {
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared,
                open: context.url,
                options: [:]
            )
        } else if let activity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared,
                continue: activity,
                restorationHandler: { _ in }
            )
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let context = URLContexts.first else { return }
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            open: context.url,
            options: [:]
        )
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
        )
    }
}