#!/usr/bin/env bun
/**
 * Fails when Capacitor packages span different major versions across the
 * root web app and the ios-app Capacitor wrapper.
 *
 * Usage: bun run check:capacitor
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type Pkg = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

function readPkg(file: string): Pkg | null {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as Pkg;
}

function capacitorDeps(pkg: Pkg | null): Record<string, string> {
  if (!pkg) return {};
  const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  return Object.fromEntries(
    Object.entries(all).filter(([name]) => name.startsWith("@capacitor/") || name.startsWith("@capacitor-community/")),
  );
}

function major(range: string): number | null {
  const m = /(\d+)\./.exec(range.replace(/^[^\d]*/, ""));
  return m ? Number(m[1]) : null;
}

const rootPkg = readPkg(path.join(root, "package.json"));
const iosPkg = readPkg(path.join(root, "ios-app", "package.json"));

const entries: Array<{ where: string; name: string; range: string; major: number | null }> = [];
for (const [where, pkg] of [
  ["root", rootPkg],
  ["ios-app", iosPkg],
] as const) {
  for (const [name, range] of Object.entries(capacitorDeps(pkg))) {
    entries.push({ where, name, range, major: major(range) });
  }
}

const errors: string[] = [];
const unknown = entries.filter((e) => e.major === null);
for (const e of unknown) errors.push(`Cannot parse version for ${e.name} (${e.where}): "${e.range}"`);

const known = entries.filter((e) => e.major !== null);
const majors = [...new Set(known.map((e) => e.major))];

if (majors.length > 1) {
  errors.push(
    `Capacitor packages span multiple major versions: ${majors.sort().join(", ")}.\n` +
      known
        .filter((e) => e.name === "@capacitor/core" || e.name === "@capacitor/cli" || e.name === "@capacitor/ios")
        .map((e) => `  ${e.where}: ${e.name}@${e.range}`)
        .join("\n") +
      "\nAll Capacitor packages (root + ios-app) must use the same major version (currently 7).",
  );
}

if (errors.length > 0) {
  console.error("\n✖ Capacitor dependency check failed:\n");
  for (const err of errors) console.error(`- ${err}\n`);
  process.exit(1);
}

console.log(`✔ Capacitor dependency check passed — all packages on Capacitor ${majors[0]}.`);
for (const e of known) console.log(`   ${e.where.padEnd(7)} ${e.name}@${e.range}`);
