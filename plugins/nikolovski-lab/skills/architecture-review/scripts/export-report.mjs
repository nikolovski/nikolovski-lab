#!/usr/bin/env node
// Export a Markdown review with Mermaid diagrams to HTML, PDF, Word or image-based Markdown.
// Diagrams are rendered with mermaid-cli first (see render-diagrams.mjs); nobody has to ask.
//
//   node export-report.mjs <report.md> --to html|pdf|docx|md [--out <file>]
//
//   html  one self-contained file, diagrams as inline SVG
//   pdf   the HTML printed by headless Chrome (the one mermaid-cli installs, or $CHROME_PATH)
//   docx  pandoc, diagrams as 2x PNG (needs pandoc: https://pandoc.org/installing.html)
//   md    Markdown with PNG images next to it, for tools that don't render Mermaid (Confluence)
//
// For Google Docs, export docx and upload it with Drive conversion.
// Markdown to HTML uses pandoc when installed, otherwise `npx -y marked@18.1.3`.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extractBlocks, needsNoSandbox, renderBlocks, replaceBlocks } from "./render-diagrams.mjs";

const MARKED = "marked@18.1.3";
const WIN = process.platform === "win32";

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: WIN, maxBuffer: 64 * 1024 * 1024, ...opts });
  return { ok: r.status === 0, out: (r.stdout ?? "") + (r.stderr ?? "") };
}
const has = (cmd) => sh(WIN ? "where" : "which", [cmd]).ok;

function markdownToHtml(mdFile) {
  if (has("pandoc")) {
    const r = sh("pandoc", ["-f", "gfm", "-t", "html5", mdFile]);
    if (r.ok) return r.out;
  }
  const r = sh(WIN ? "npx.cmd" : "npx", ["-y", MARKED, "-i", mdFile, "--gfm"]);
  if (!r.ok) throw new Error(`Markdown to HTML failed (no pandoc, and npx ${MARKED} failed):\n${r.out}`);
  return r.out;
}

const CSS = `
:root { color-scheme: light; }
body { font: 15px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1b1b1a; max-width: 960px; margin: 32px auto; padding: 0 24px; }
h1, h2, h3 { line-height: 1.25; } h2 { margin-top: 2em; border-bottom: 1px solid #e4e4df; padding-bottom: 4px; }
table { border-collapse: collapse; margin: 1em 0; font-size: 14px; } th, td { border: 1px solid #d8d8d2; padding: 6px 8px; text-align: left; vertical-align: top; }
th { background: #f4f4f0; } code { font-size: 90%; background: #f4f4f0; padding: 1px 4px; border-radius: 4px; }
pre { background: #f4f4f0; padding: 12px; overflow-x: auto; white-space: pre-wrap; } pre code { background: none; padding: 0; }
img { max-width: 100%; height: auto; display: block; margin: 8px auto 16px; }
blockquote { margin: 1em 0; padding: 4px 16px; border-left: 3px solid #d8d8d2; color: #555; }
@media print { body { margin: 0; max-width: none; } h2 { break-after: avoid; } img, table, pre { break-inside: avoid; } }
@page { margin: 16mm 14mm; }
`;

function htmlPage(title, body, baseDir) {
  // Inline local images as data URIs so the file stands alone.
  const inlined = body.replace(/<img([^>]*?)src="([^"]+)"/g, (all, pre, src) => {
    if (/^(https?:|data:)/.test(src)) return all;
    const file = resolve(baseDir, decodeURIComponent(src));
    if (!existsSync(file)) return all;
    const mime = file.endsWith(".svg") ? "image/svg+xml" : "image/png";
    return `<img${pre}src="data:${mime};base64,${readFileSync(file).toString("base64")}"`;
  });
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${esc(title)}</title><style>${CSS}</style></head>\n<body>\n${inlined}\n</body></html>\n`;
}

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = process.env.PUPPETEER_CACHE_DIR ?? join(homedir(), ".cache", "puppeteer");
  const names = new Set(["chrome-headless-shell", "chrome-headless-shell.exe", "chrome", "chrome.exe", "Google Chrome for Testing"]);
  const walk = (dir, depth) => {
    if (depth > 6 || !existsSync(dir)) return null;
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isFile() && names.has(e)) return p;
      if (st.isDirectory()) { const hit = walk(p, depth + 1); if (hit) return hit; }
    }
    return null;
  };
  // Prefer the headless shell, then full Chrome for Testing, from mermaid-cli's puppeteer cache.
  for (const sub of ["chrome-headless-shell", "chrome"]) {
    const hit = walk(join(cache, sub), 0);
    if (hit) return hit;
  }
  for (const c of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "msedge"]) if (has(c)) return c;
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(mac)) return mac;
  throw new Error("No Chrome found for PDF. Set CHROME_PATH, or run render-diagrams.mjs once so mermaid-cli installs one.");
}

async function main() {
  const argv = process.argv.slice(2);
  const opt = { to: null, out: null, file: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--to") opt.to = argv[++i];
    else if (argv[i] === "--out") opt.out = argv[++i];
    else if (argv[i] === "-h" || argv[i] === "--help") opt.help = true;
    else opt.file = argv[i];
  }
  const formats = ["html", "pdf", "docx", "md"];
  if (opt.help || !opt.file || !formats.includes(opt.to)) {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 13).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exit(opt.help ? 0 : 2);
  }

  const src = resolve(opt.file);
  const stem = basename(src, extname(src));
  const ext = opt.to === "md" ? ".images.md" : `.${opt.to}`;
  const out = resolve(opt.out ?? join(dirname(src), stem + ext));
  const md = readFileSync(src, "utf8");
  const title = md.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? stem;
  const blocks = extractBlocks(md);

  const work = mkdtempSync(join(tmpdir(), "review-export-"));
  try {
    const format = opt.to === "html" || opt.to === "pdf" ? "svg" : "png";
    const imgDir = opt.to === "md" ? join(dirname(out), `${basename(out, extname(out)).replace(/\.images$/, "")}-diagrams`) : join(work, "diagrams");
    const results = await renderBlocks(blocks, { outDir: imgDir, format });
    const failed = results.filter((r) => !r.ok);
    const linkBase = opt.to === "md" ? dirname(out) : work;
    const rendered = replaceBlocks(md, blocks, results, (p) => relative(linkBase, p).split("\\").join("/"));
    const renderedFile = opt.to === "md" ? out : join(work, "report.md");
    writeFileSync(renderedFile, rendered);

    if (opt.to === "html" || opt.to === "pdf") {
      const page = htmlPage(title, markdownToHtml(renderedFile), work);
      const htmlFile = opt.to === "html" ? out : join(work, "report.html");
      writeFileSync(htmlFile, page);
      if (opt.to === "pdf") {
        const chrome = findChrome();
        const args = ["--headless", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${out}`, pathToFileURL(htmlFile).href];
        if (needsNoSandbox()) args.unshift("--no-sandbox");
        const r = sh(chrome, args, { shell: false });
        if (!r.ok || !existsSync(out)) throw new Error(`Chrome could not print the PDF:\n${r.out}`);
      }
    } else if (opt.to === "docx") {
      if (!has("pandoc")) throw new Error("docx needs pandoc: https://pandoc.org/installing.html");
      const r = sh("pandoc", ["-f", "gfm", renderedFile, "-o", out, `--resource-path=${work}`, "--metadata", `title=${title}`]);
      if (!r.ok) throw new Error(`pandoc failed:\n${r.out}`);
    }

    console.log(`${out}: ${results.length - failed.length} diagram(s) rendered${failed.length ? `, ${failed.length} failed (kept as code with a note)` : ""}`);
    for (const [i, r] of results.entries()) if (!r.ok) console.error(`  block ${i + 1}: ${r.message}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
