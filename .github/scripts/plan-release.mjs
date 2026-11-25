import { execSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";

const sh = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();
const out = (k, v) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
  else console.log(`${k}=${v}`);
};

const isAncestor = (ref) => {
  try {
    execSync(`git merge-base --is-ancestor ${ref} HEAD`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const SEMVER_TAG = /^v\d+\.\d+\.\d+$/;
let lastTag = "";
try {
  const tags = sh("git tag --list --sort=-v:refname")
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => SEMVER_TAG.test(t));
  lastTag = tags.find(isAncestor) ?? "";
} catch {
  lastTag = "";
}

const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
const SEP = "\u0001";
const raw = sh(`git log ${range} --no-merges --pretty=format:%s${SEP}%b${SEP}%H`);
const commits = raw ? raw.split("\n").map((l) => l.split(SEP)) : [];

const CONV = /^(feat|fix|perf|refactor|revert|docs|chore|ci|test|style|build)(\([^)]*\))?(!)?:\s*(.+)$/i;
const groups = { feat: [], fix: [], perf: [], refactor: [], revert: [] };
let bump = ""; // major | minor | patch

const rank = { patch: 1, minor: 2, major: 3 };
const raise = (b) => {
  if (!bump || rank[b] > rank[bump]) bump = b;
};

for (const [subject = "", body = ""] of commits) {
  const m = subject.match(CONV);
  const breaking = (m && m[3] === "!") || /\bBREAKING[ -]CHANGE\b/.test(`${subject}\n${body}`);
  const type = m ? m[1].toLowerCase() : "";
  const text = (m ? m[4] : subject).trim();
  if (breaking) raise("major");
  if (type === "feat") raise("minor");
  else if (type === "fix" || type === "perf" || type === "refactor" || type === "revert") raise("patch");
  if (groups[type]) {
    const clean = text.charAt(0).toUpperCase() + text.slice(1);
    if (!groups[type].includes(clean)) groups[type].push(clean);
  }
}

if (!bump) {
  out("release", "false");
  console.log("Only docs/chore/ci/test/style since", lastTag || "the start — no release.");
  process.exit(0);
}

const [maj, min, pat] = (lastTag || "v0.0.0").replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
const next =
  bump === "major" ? `v${maj + 1}.0.0` : bump === "minor" ? `v${maj}.${min + 1}.0` : `v${maj}.${min}.${pat + 1}`;

const HEADINGS = {
  feat: "✨ Nouveautés",
  fix: "🐛 Corrections",
  perf: "⚡ Performances",
  refactor: "🔧 Technique",
  revert: "⏪ Reverts",
};

let notes = "";
for (const key of ["feat", "fix", "perf", "refactor", "revert"]) {
  if (!groups[key].length) continue;
  notes += `## ${HEADINGS[key]}\n`;
  for (const item of groups[key]) notes += `- ${item}\n`;
  notes += "\n";
}
notes = notes.trim() || "Mise à jour.";
if (lastTag) notes += `\n\n**Comparaison :** ${lastTag}...${next}`;

writeFileSync("release-notes.md", notes + "\n");
out("release", "true");
out("version", next);
console.log(`Next version: ${next} (${bump}) since ${lastTag || "start"}, ${commits.length} commits.`);
