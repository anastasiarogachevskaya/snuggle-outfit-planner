#!/usr/bin/env node
// Fails the iOS build while the native Google Sign-In client IDs are still
// placeholders. Without real IDs the native sheet cannot return an id_token,
// and sign-in silently degrades to the browser flow.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = ["capacitor.config.ts", "ios/App/App/Info.plist"];
const problems = [];

for (const file of files) {
  const contents = readFileSync(resolve(root, file), "utf8");
  if (contents.includes("REPLACE_WITH_")) {
    problems.push(file);
  }
}

if (problems.length > 0) {
  console.error(
    [
      "Native Google Sign-In is not configured yet.",
      "",
      `Placeholder values still present in: ${problems.join(", ")}`,
      "",
      "Fix:",
      "  1. Google Cloud Console → Credentials → OAuth client → iOS",
      "     (bundle ID online.layerly.app) → copy the client ID.",
      "  2. Put it in capacitor.config.ts as GOOGLE_IOS_CLIENT_ID, and the",
      "     existing Web client ID as GOOGLE_WEB_CLIENT_ID.",
      "  3. In ios/App/App/Info.plist set the URL scheme to the reversed iOS",
      "     client ID: com.googleusercontent.apps.<id-without-suffix>",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("Google Sign-In config OK (no placeholder client IDs).");
