#!/usr/bin/env node
// Refreshes the skill and agent copies in plugins/<name>/ from skills/ and agents/.
//
//   npm run sync:plugins                                  refresh every copy
//   npm run sync:plugins -- --add <plugin> <skill> [...]  also add skills to a plugin
//   npm run sync:plugins -- --check                       only report, exit 1 if out of step
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { syncPluginCopies } from "./lib/plugin-copies.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const check = args.includes("--check");
let add;
const i = args.indexOf("--add");
if (i !== -1) {
  const [plugin, ...skills] = args.slice(i + 1).filter((a) => !a.startsWith("--"));
  if (!plugin || skills.length === 0) {
    console.error("usage: npm run sync:plugins -- --add <plugin> <skill> [<skill> ...]");
    process.exit(1);
  }
  add = { plugin, skills };
}

let changes;
try {
  changes = syncPluginCopies(root, { write: !check, add });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
if (changes.length === 0) {
  console.log("ok: plugin copies match skills/ and agents/");
} else {
  for (const c of changes) console.log(`${check ? "out of step" : "synced"}: ${c}`);
  if (check) process.exit(1);
}
