#!/usr/bin/env node
// Check or render every ```mermaid block in Markdown files with mermaid-cli (mmdc).
//
//   node render-diagrams.mjs --check <file-or-dir>...
//       Parse every block. Prints file:line and the error for each failure. Exit 1 if any fail.
//
//   node render-diagrams.mjs <report.md> [--format svg|png] [--out-dir <dir>] [--out <file.md>]
//       Render each block to <out-dir>/fig-NN.<format> (default: <report>-diagrams/, svg)
//       and write a copy of the report with images in place of the blocks
//       (default: <report>.rendered.md). Blocks that fail stay as code, with a note.
//
// mmdc is found in this order: $MMDC, node_modules/.bin/mmdc (walking up from the cwd),
// mmdc on PATH, then `npx -y -p @mermaid-js/mermaid-cli@12.2.0 mmdc` (downloads once).
// Needs Node 18+. Set MMDC_NO_SANDBOX=1 if Chrome can't start (CI and root set it for you).

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MERMAID_CLI = "@mermaid-js/mermaid-cli@12.2.0";
const FENCE_OPEN = /^(\s{0,3})(`{3,}|~{3,})\s*mermaid\s*$/;

/** Find ```mermaid blocks. Returns [{ code, start, end, open }] with 0-based line numbers. */
export function extractBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FENCE_OPEN);
    if (!m) continue;
    const fence = m[2];
    const close = new RegExp(`^\\s{0,3}${fence[0] === "`" ? "`" : "~"}{${fence.length},}\\s*$`);
    let j = i + 1;
    while (j < lines.length && !close.test(lines[j])) j++;
    blocks.push({ code: lines.slice(i + 1, j).join("\n"), start: i, end: Math.min(j, lines.length - 1) });
    i = j;
  }
  return blocks;
}

function onPath(cmd) {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split("\n")[0].trim() : null;
}

/** Resolve how to call mmdc: { cmd, args } */
export function findMmdc() {
  if (process.env.MMDC) return { cmd: process.env.MMDC, args: [] };
  let dir = process.cwd();
  for (;;) {
    const local = join(dir, "node_modules", ".bin", process.platform === "win32" ? "mmdc.cmd" : "mmdc");
    if (existsSync(local)) return { cmd: local, args: [] };
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  const global = onPath("mmdc");
  if (global) return { cmd: global, args: [] };
  return { cmd: process.platform === "win32" ? "npx.cmd" : "npx", args: ["-y", "-p", MERMAID_CLI, "mmdc"] };
}

export function needsNoSandbox() {
  return Boolean(process.env.CI || process.env.MMDC_NO_SANDBOX || process.getuid?.() === 0);
}

function run(cmd, args) {
  return new Promise((done) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => done({ code, out }));
    child.on("error", (e) => done({ code: 1, out: String(e) }));
  });
}

/** First useful line of an mmdc error, plus the line inside the block if mmdc reported one. */
function summarize(out) {
  const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
  const parse = lines.findIndex((l) => /Parse error|Lexical error|Error:/i.test(l));
  const msg = parse >= 0 ? lines.slice(parse, parse + 4).filter((l) => !l.startsWith("at ")).join(" ") : lines.slice(-3).join(" ");
  const at = msg.match(/on line (\d+)/);
  return { message: msg.replace(/\s+/g, " ").slice(0, 400), line: at ? Number(at[1]) : null };
}

/**
 * Render blocks to files. blocks: [{ code }], returns [{ ok, file, error, line }].
 * format: svg | png. Runs a few mmdc processes at a time.
 */
export async function renderBlocks(blocks, { outDir, format = "svg", scale = 2, prefix = "fig" } = {}) {
  const mmdc = findMmdc();
  const work = mkdtempSync(join(tmpdir(), "mmd-"));
  const out = outDir ?? work;
  mkdirSync(out, { recursive: true });
  const config = join(work, "puppeteer.json");
  writeFileSync(config, JSON.stringify(needsNoSandbox() ? { args: ["--no-sandbox", "--disable-setuid-sandbox"] } : {}));
  const results = new Array(blocks.length);
  const renderOne = async (i) => {
    const n = String(i + 1).padStart(2, "0");
    const input = join(work, `${prefix}-${n}.mmd`);
    const file = join(out, `${prefix}-${n}.${format}`);
    writeFileSync(input, blocks[i].code);
    const args = [...mmdc.args, "-q", "-i", input, "-o", file, "-p", config, "-b", "white"];
    if (format === "png") args.push("-s", String(scale));
    const r = await run(mmdc.cmd, args);
    results[i] = r.code === 0 && existsSync(file) ? { ok: true, file } : { ok: false, ...summarize(r.out) };
  };
  // The first call may install mermaid-cli through npx, so it runs alone; the rest run 3 at a time.
  let next = 0;
  if (blocks.length) await renderOne(next++);
  const worker = async () => { while (next < blocks.length) await renderOne(next++); };
  await Promise.all(Array.from({ length: 3 }, worker));
  rmSync(work, { recursive: true, force: true });
  return results;
}

function markdownFiles(paths) {
  const files = [];
  const walk = (p) => {
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const e of readdirSync(p)) if (e !== "node_modules" && !e.startsWith(".")) walk(join(p, e));
    } else if (/\.(md|mdx|markdown)$/i.test(p)) files.push(p);
  };
  for (const p of paths) walk(p);
  return files;
}

/** Replace each block with an image link (or keep it, with a note, if it failed). */
export function replaceBlocks(markdown, blocks, results, linkFor) {
  const lines = markdown.split("\n");
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    const r = results[i];
    const caption = (lines[b.start - 1] ?? "").match(/^\*\*(Figure[^*]*)\*\*/)?.[1] ?? (lines[b.start - 2] ?? "").match(/^\*\*(Figure[^*]*)\*\*/)?.[1];
    const alt = (caption ?? `Diagram ${i + 1}`).replace(/[\[\]]/g, "");
    const replacement = r.ok
      ? ["", `![${alt}](${linkFor(r.file)})`, ""]
      : [...lines.slice(b.start, b.end + 1), "", `> Diagram failed to render: ${r.message}`];
    lines.splice(b.start, b.end - b.start + 1, ...replacement);
  }
  return lines.join("\n");
}

async function check(paths) {
  const files = markdownFiles(paths.length ? paths : ["."]);
  let total = 0;
  let failed = 0;
  for (const f of files) {
    const blocks = extractBlocks(readFileSync(f, "utf8"));
    if (!blocks.length) continue;
    const results = await renderBlocks(blocks);
    results.forEach((r, i) => {
      total++;
      if (r.ok) return;
      failed++;
      const line = blocks[i].start + (r.line ?? 2);
      console.error(`${relative(process.cwd(), f)}:${line}: block ${i + 1}: ${r.message}`);
    });
  }
  if (!total) console.log("no mermaid blocks found");
  else console.log(`${total - failed}/${total} mermaid block(s) parse${failed ? `, ${failed} failed` : ""}`);
  return failed ? 1 : 0;
}

async function renderReport(file, opts) {
  const md = readFileSync(file, "utf8");
  const stem = basename(file, extname(file));
  const outDir = resolve(opts.outDir ?? join(dirname(file), `${stem}-diagrams`));
  const outFile = resolve(opts.out ?? join(dirname(file), `${stem}.rendered.md`));
  const blocks = extractBlocks(md);
  const results = await renderBlocks(blocks, { outDir, format: opts.format });
  const rel = (p) => relative(dirname(outFile), p).split("\\").join("/");
  writeFileSync(outFile, replaceBlocks(md, blocks, results, rel));
  const bad = results.filter((r) => !r.ok).length;
  console.log(`${outFile}: ${results.length - bad} diagram(s) rendered to ${outDir}${bad ? `, ${bad} failed (kept as code)` : ""}`);
  return bad ? 1 : 0;
}

function parseArgs(argv) {
  const opts = { files: [], format: "svg" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") opts.check = true;
    else if (a === "--format") opts.format = argv[++i];
    else if (a === "--out-dir") opts.outDir = argv[++i];
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "-h" || a === "--help") opts.help = true;
    else opts.files.push(a);
  }
  if (!["svg", "png"].includes(opts.format)) throw new Error("--format must be svg or png");
  return opts;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.check && opts.files.length !== 1)) {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 16).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exit(opts.help ? 0 : 2);
  }
  process.exit(opts.check ? await check(opts.files) : await renderReport(opts.files[0], opts));
}
