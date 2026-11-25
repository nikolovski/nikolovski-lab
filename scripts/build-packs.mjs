#!/usr/bin/env node
// Builds the starter packs: each pack's own files plus a copy of the skills it lists.
// CI publishes the result to the `packs` branch (.github/workflows/publish-packs.yml).
//
//   npm run build:packs                  write to dist/packs
//   npm run build:packs -- --out <dir>   write somewhere else
import { join, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPacks } from "./lib/packs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const i = args.indexOf("--out");
if (i !== -1 && !args[i + 1]) {
  console.error("usage: npm run build:packs -- --out <dir>");
  process.exit(1);
}
const out = i !== -1 ? resolve(args[i + 1]) : join(root, "dist", "packs");
// The build empties --out first, so keep it away from anything that is tracked.
const inside = (child, parent) => child === parent || child.startsWith(parent + sep);
if (inside(root, out) || (inside(out, root) && !inside(out, join(root, "dist")))) {
  console.error("--out must be outside the repo, or under dist/: the build empties it first");
  process.exit(1);
}

try {
  for (const p of buildPacks(root, out)) console.log(`built plugins/${p.name}: ${p.skills.join(", ")}`);
  console.log(`ok: wrote ${out}`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
