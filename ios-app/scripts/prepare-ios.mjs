#!/usr/bin/env node
// Prepares everything Capacitor needs, without generating the native project.
//   1. installs root web deps if missing
//   2. builds the root Layerly web app
//   3. verifies the generated client dist directory exists
//   4. runs `cap sync ios` only when ios/ already exists
//   5. installs the Layerly AppIcon asset catalog into the native project
import { existsSync, mkdirSync, readdirSync, rmSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const iosApp = path.resolve(here, "..");
const webRoot = path.resolve(iosApp, "..");
const clientDist = path.join(webRoot, "dist", "client");

function run(cmd, args, cwd) {
  console.log(`\n> ${cmd} ${args.join(" ")}  (${cwd})`);
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const pm = existsSync(path.join(webRoot, "bun.lock")) ? "bun" : "npm";

if (!existsSync(path.join(webRoot, "node_modules"))) {
  run(pm, ["install"], webRoot);
} else {
  console.log("Root web dependencies already installed — skipping install.");
}

run(pm, ["run", "build"], webRoot);

if (!existsSync(clientDist)) {
  console.error(`\n✖ Expected web output at ${clientDist} but it does not exist.`);
  console.error("  Run the root build manually and re-run `bun run prepare:ios`.");
  process.exit(1);
}
console.log(`\n✔ Web assets ready at ${clientDist}`);

function installAppIcons() {
  const source = path.join(iosApp, "resources", "AppIcon.appiconset");
  const target = path.join(iosApp, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset");
  if (!existsSync(source)) {
    console.warn("⚠ resources/AppIcon.appiconset missing — skipping icon install.");
    return;
  }
  // Wipe the Capacitor placeholder icon completely, then copy ours in.
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const file of readdirSync(source)) {
    copyFileSync(path.join(source, file), path.join(target, file));
  }
  console.log(`✔ Layerly AppIcon installed (${readdirSync(target).length} files) — no Capacitor placeholder left.`);
}

if (existsSync(path.join(iosApp, "ios"))) {
  run("npx", ["cap", "sync", "ios"], iosApp);
  installAppIcons();
  console.log("\n✔ Native iOS project synced. Next: bun run open:ios");
} else {
  console.log(
    [
      "",
      "ℹ No native iOS platform found (ios-app/ios is missing).",
      "  On a Mac with Xcode + CocoaPods installed, run:",
      "",
      "    cd ios-app && npx cap add ios",
      "    bun run sync:ios",
      "    bun run open:ios",
      "",
    ].join("\n"),
  );
}
