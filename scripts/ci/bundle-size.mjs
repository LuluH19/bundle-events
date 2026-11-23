#!/usr/bin/env node
// Measures the client bundle (.next/static JS and CSS, raw and gzip) after `next build`
// and optionally compares it to a baseline produced by the same script.
//
// Usage:
//   node scripts/ci/bundle-size.mjs --out bundle-size.json [--base base.json] [--md report.md]

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const staticDir = arg("--dir") ?? ".next/static";
const outPath = arg("--out") ?? "bundle-size.json";
const basePath = arg("--base");
const mdPath = arg("--md");

if (!existsSync(staticDir)) {
  console.error(`${staticDir} not found: run \`next build\` first.`);
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const totals = { js: { raw: 0, gzip: 0, files: 0 }, css: { raw: 0, gzip: 0, files: 0 } };

for (const file of walk(staticDir)) {
  const kind = { ".js": "js", ".css": "css" }[extname(file)];
  if (!kind) continue;
  const buf = readFileSync(file);
  const gzip = gzipSync(buf, { level: 9 }).length;
  totals[kind].raw += buf.length;
  totals[kind].gzip += gzip;
  totals[kind].files += 1;
}

writeFileSync(outPath, JSON.stringify({ totals }, null, 2));

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const base = basePath && existsSync(basePath) ? JSON.parse(readFileSync(basePath, "utf8")) : null;

function delta(cur, prev) {
  if (prev === undefined) return "";
  const d = cur - prev;
  if (d === 0) return " (no change)";
  const pct = prev ? ` / ${((d / prev) * 100).toFixed(1)}%` : "";
  return ` (${d > 0 ? "+" : "-"}${kb(Math.abs(d))}${pct})`;
}

const lines = [
  "| Asset | Files | Raw | Gzip |",
  "| --- | --- | --- | --- |",
  ...["js", "css"].map((k) => {
    const t = totals[k];
    const b = base?.totals?.[k];
    return `| ${k.toUpperCase()} | ${t.files} | ${kb(t.raw)}${delta(t.raw, b?.raw)} | ${kb(t.gzip)}${delta(t.gzip, b?.gzip)} |`;
  }),
  "",
  base ? "_Compared to the latest baseline of the target branch._" : "_No baseline found for the target branch yet._",
];

const md = lines.join("\n");
if (mdPath) writeFileSync(mdPath, md + "\n");
console.log(md);
