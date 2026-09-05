#!/usr/bin/env node
// Patches @codetrix-studio/capacitor-google-auth (pinned to the pre-open-source
// GoogleSignIn 6.2.4 API) to use a modern GoogleSignIn version and pass a
// custom nonce through to Google.
//
// Why this exists: GoogleSignIn's sign-in request always mints its own nonce
// internally (via AppAuth) and bakes it into the returned id_token, whatever
// our code does. Supabase's signInWithIdToken requires a nonce we passed
// ourselves to match it, or none at all — with GoogleSignIn 6.2.4 there is no
// way to supply one, so every native Google sign-in failed with "Passed nonce
// and nonce in id_token should either both exist or not." GoogleSignIn 7.0+
// (Google open-sourced it and added an explicit `nonce:` parameter) fixes
// this, but the plugin's podspec still pins the old version and its Swift
// code predates the resulting API changes (GIDSignInResult, GIDToken, the
// renamed signIn method, refreshTokensIfNeededWithCompletion).
//
// node_modules is regenerated on every fresh install (this repo's CI clones
// clean and runs `bun install` from scratch — see ci_post_clone.sh), so a
// one-off manual edit here would silently vanish on the next clean install.
// This script re-applies both changes every time prepare:ios runs, before
// `cap sync`'s `pod install` picks up the podspec.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, "../node_modules/@codetrix-studio/capacitor-google-auth");
const podspecPath = path.join(pluginRoot, "CodetrixStudioCapacitorGoogleAuth.podspec");
const pluginSwiftPath = path.join(pluginRoot, "ios/Plugin/Plugin.swift");

if (!existsSync(podspecPath) || !existsSync(pluginSwiftPath)) {
  console.error(
    `✖ Cannot patch capacitor-google-auth: expected files not found under ${pluginRoot}.\n` +
      "  Run `bun install` first.",
  );
  process.exit(1);
}

// --- Podspec: pin a modern, nonce-capable GoogleSignIn version ---
const oldPodspec = readFileSync(podspecPath, "utf8");
const newPodspec = oldPodspec.replace(
  /s\.dependency\s+'GoogleSignIn',\s*'~>\s*6\.2\.4'/,
  "s.dependency 'GoogleSignIn', '~> 9.2'",
);
if (newPodspec === oldPodspec && !oldPodspec.includes("'GoogleSignIn', '~> 9.2'")) {
  console.error("✖ Could not find the GoogleSignIn ~> 6.2.4 dependency line to patch in the podspec.");
  process.exit(1);
}
writeFileSync(podspecPath, newPodspec);

// --- Plugin.swift: modern signIn API + explicit nonce support ---
const pluginSwift = `import Foundation
import Capacitor
import GoogleSignIn

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitor.ionicframework.com/docs/plugins/ios
 *
 * Patched by scripts/patch-google-auth-plugin.mjs for GoogleSignIn 9.x:
 * the original (GoogleSignIn 6.2.4) API had no way to pass a custom nonce,
 * so Supabase's signInWithIdToken always rejected the id_token GoogleSignIn's
 * AppAuth-based request mints internally. See that script for the full story.
 */
@objc(GoogleAuth)
public class GoogleAuth: CAPPlugin {
    var signInCall: CAPPluginCall!
    var googleSignIn: GIDSignIn!;
    var googleSignInConfiguration: GIDConfiguration!;
    var forceAuthCode: Bool = false;
    var additionalScopes: [String]!;

    func loadSignInClient (
        customClientId: String,
        customScopes: [String]
    ) {
        googleSignIn = GIDSignIn.sharedInstance;

        let serverClientId = getServerClientIdValue();

        googleSignInConfiguration = GIDConfiguration.init(clientID: customClientId, serverClientID: serverClientId)
        // GoogleSignIn 9.x reads the active configuration from this property
        // instead of taking it as a signIn(...) argument.
        googleSignIn.configuration = googleSignInConfiguration;

        // these are scopes granted by default by the signIn method
        let defaultGrantedScopes = ["email", "profile", "openid"];
        // these are scopes we will need to request after sign in
        additionalScopes = customScopes.filter {
            return !defaultGrantedScopes.contains($0);
        };

        forceAuthCode = getConfig().getBoolean("forceCodeForRefreshToken", false)

        NotificationCenter.default.addObserver(self, selector: #selector(handleOpenUrl(_ :)), name: Notification.Name(Notification.Name.capacitorOpenURL.rawValue), object: nil);
    }


    public override func load() {
    }

    @objc
    func initialize(_ call: CAPPluginCall) {
        // get client id from initialize, with client id from config file as fallback
        guard let clientId = call.getString("clientId") ?? getClientIdValue() as? String else {
            NSLog("no client id found in config");
            call.resolve();
            return;
        }

        // get scopes from initialize, with scopes from config file as fallback
        let customScopes = call.getArray("scopes", String.self) ?? (
            getConfigValue("scopes") as? [String] ?? []
        );

        // get force auth code from initialize, with config from config file as fallback
        forceAuthCode = call.getBool("grantOfflineAccess") ?? (
            getConfigValue("forceCodeForRefreshToken") as? Bool ?? false
        );

        // load client
        self.loadSignInClient(
            customClientId: clientId,
            customScopes: customScopes
        )
        call.resolve();
    }

    @objc
    func signIn(_ call: CAPPluginCall) {
        signInCall = call;
        // A nonce means the caller (native-social-auth.ts) needs the returned
        // id_token's nonce claim to match one it can hand to Supabase, so a
        // silent restore — which can't take a nonce — isn't good enough here.
        let nonce = call.getString("nonce");
        DispatchQueue.main.async {
            if nonce == nil && self.googleSignIn.hasPreviousSignIn() && !self.forceAuthCode {
                self.googleSignIn.restorePreviousSignIn() { user, error in
                    if let error = error {
                        self.signInCall?.reject(error.localizedDescription);
                        return;
                    }
                    self.resolveSignInCallWith(user: user!, serverAuthCode: nil);
                }
            } else {
                let presentingVc = self.bridge!.viewController!;

                self.googleSignIn.signIn(withPresenting: presentingVc, hint: nil, additionalScopes: self.additionalScopes, nonce: nonce) { signInResult, error in
                    if let error = error {
                        self.signInCall?.reject(error.localizedDescription, "\\(error._code)");
                        return;
                    }
                    guard let signInResult = signInResult else {
                        self.signInCall?.reject("Google sign-in returned no result.");
                        return;
                    }
                    self.resolveSignInCallWith(user: signInResult.user, serverAuthCode: signInResult.serverAuthCode);
                };
            }
        }
    }

    @objc
    func refresh(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let currentUser = self.googleSignIn.currentUser else {
                call.reject("User not logged in.");
                return
            }
            currentUser.refreshTokensIfNeeded { user, error in
                guard let user = user else {
                    call.reject(error?.localizedDescription ?? "Something went wrong.");
                    return;
                }
                let authenticationData: [String: Any] = [
                    "accessToken": user.accessToken.tokenString,
                    "idToken": user.idToken?.tokenString as Any,
                    "refreshToken": user.refreshToken.tokenString
                ]
                call.resolve(authenticationData);
            }
        }
    }

    @objc
    func signOut(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.googleSignIn.signOut();
        }
        call.resolve();
    }

    @objc
    func handleOpenUrl(_ notification: Notification) {
        guard let object = notification.object as? [String: Any] else {
            print("There is no object on handleOpenUrl");
            return;
        }
        guard let url = object["url"] as? URL else {
            print("There is no url on handleOpenUrl");
            return;
        }
        googleSignIn.handle(url);
    }


    func getClientIdValue() -> String? {
        if let clientId = getConfig().getString("iosClientId") {
            return clientId;
        }
        else if let clientId = getConfig().getString("clientId") {
            return clientId;
        }
        else if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
                let dict = NSDictionary(contentsOfFile: path) as? [String: AnyObject],
                let clientId = dict["CLIENT_ID"] as? String {
            return clientId;
        }
        return nil;
    }

    func getServerClientIdValue() -> String? {
        if let serverClientId = getConfig().getString("serverClientId") {
            return serverClientId;
        }
        return nil;
    }

    func resolveSignInCallWith(user: GIDGoogleUser, serverAuthCode: String?) {
        var userData: [String: Any] = [
            "authentication": [
                "accessToken": user.accessToken.tokenString,
                "idToken": user.idToken?.tokenString as Any,
                "refreshToken": user.refreshToken.tokenString
            ],
            "serverAuthCode": serverAuthCode ?? NSNull(),
            "email": user.profile?.email ?? NSNull(),
            "familyName": user.profile?.familyName ?? NSNull(),
            "givenName": user.profile?.givenName ?? NSNull(),
            "id": user.userID ?? NSNull(),
            "name": user.profile?.name ?? NSNull()
        ];
        if let imageUrl = user.profile?.imageURL(withDimension: 100)?.absoluteString {
            userData["imageUrl"] = imageUrl;
        }
        signInCall?.resolve(userData);
    }
}
`;

writeFileSync(pluginSwiftPath, pluginSwift);

console.log("✔ Patched capacitor-google-auth for GoogleSignIn 9.x + nonce support");
