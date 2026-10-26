#!/usr/bin/env node
// Pre-commit guard: blocks a commit when the staged changes add credentials.
// Checks the lines being added (not the whole file) and the names of staged files.
// Bypass for a false positive with `git commit --no-verify`, after checking it really is one.
const { execFileSync } = require("child_process");

const git = args => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

const BLOCKED_FILES = [
  { re: /(^|\/)\.env(\.[\w-]+)?$/, why: "environment file with real values" },
  { re: /\.(pem|key|p12|pfx|keystore|jks)$/i, why: "private key / certificate store" },
  { re: /(^|\/)id_(rsa|ed25519|ecdsa)$/, why: "SSH private key" },
  { re: /(customers?|orders?)_export[^/]*\.csv$/i, why: "customer / order export (personal data)" },
];
const ALLOWED_FILES = /(^|\/)\.env\.(example|sample|template)$/;
const SKIPPED_PATHS = /(^|\/)(node_modules|vendor)\/|(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|composer\.lock)$|\.min\.(js|css)$|\.githooks\/scan-secrets\.cjs$/;

const PLACEHOLDER =
  /^(USER|PASSWORD|PASS|password|user|username|\*+|x+|<[^>]+>|\$\{[^}]+\}|your[_-]?\w*|changeme|change_me|example\w*|placeholder|\.\.\.|REMOVED_SECRET|GANTI_\w+|xxx+|null|undefined|true|false)$/i;

const RULES = [
  ["database URL with password", /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|amqp):\/\/[^:\s/@'"`]+:([^@\s'"`]+)@/g],
  ["password assignment", /\b(?:[A-Z0-9_]*PASSWORD|[A-Z0-9_]*PASSWD|PGPASSWORD|DB_PASS)\s*[=:]\s*["']?([^\s"'#,;]{4,})/g],
  ["hardcoded password", /\bpassword\s*[:=]\s*["'`]([^"'`\s]{4,})["'`]/gi],
  ["secret / token assignment", /\b[A-Z0-9_]*(?:SECRET|TOKEN|API_KEY|APIKEY|PRIVATE_KEY|ACCESS_KEY|SERVICE_ROLE_KEY)\s*[=:]\s*["']?([A-Za-z0-9_\-.+/=]{12,})/g],
  ["Stripe key", /\b((?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9]{10,})/g],
  ["Paddle key", /\b(pdl_(?:sdbx|live)_apikey_[A-Za-z0-9_]{10,})/g],
  ["Neon password", /\b(npg_[A-Za-z0-9]{8,})/g],
  ["AWS access key", /\b(AKIA[0-9A-Z]{16})\b/g],
  ["GitHub token", /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g],
  ["Google API key", /\b(AIza[0-9A-Za-z_-]{35})\b/g],
  ["Slack token", /\b(xox[baprs]-[A-Za-z0-9-]{10,})/g],
  ["Vercel Blob token", /\b(vercel_blob_rw_[A-Za-z0-9_]{10,})/g],
  ["SendGrid key", /\b(SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,})/g],
  ["JWT / Supabase key", /\b(eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/g],
  ["private key block", /(-----BEGIN [A-Z ]*PRIVATE KEY-----)/g],
];

const mask = value => (value.length <= 6 ? "******" : `${value.slice(0, 3)}…${value.slice(-2)}`);

const problems = [];

const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]).split("\n").filter(Boolean);
for (const file of staged) {
  if (ALLOWED_FILES.test(file)) continue;
  const blocked = BLOCKED_FILES.find(rule => rule.re.test(file));
  if (blocked) problems.push(`${file}: ${blocked.why} must not be committed`);
}

const diff = git(["diff", "--cached", "-U0", "--no-color", "--diff-filter=ACMR"]);
let file = "";
let lineNo = 0;
for (const line of diff.split("\n")) {
  if (line.startsWith("+++ b/")) { file = line.slice(6); continue; }
  const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
  if (hunk) { lineNo = Number(hunk[1]); continue; }
  if (!line.startsWith("+") || line.startsWith("+++")) continue;
  const added = line.slice(1);
  const current = lineNo++;
  if (SKIPPED_PATHS.test(file) || /secret-scan:\s*allow/.test(added)) continue;
  for (const [name, re] of RULES) {
    re.lastIndex = 0;
    for (const match of added.matchAll(re)) {
      const value = match[1] ?? match[0];
      if (PLACEHOLDER.test(value) || /^(process\.env|import\.meta\.env|env\(|\$\{|\$[A-Z_])/.test(value)) continue;
      problems.push(`${file}:${current}: ${name} (${mask(value)})`);
    }
  }
}

if (problems.length > 0) {
  console.error("\n✋ Commit blocked: possible credentials in the staged changes.\n");
  for (const problem of Array.from(new Set(problems))) console.error(`  - ${problem}`);
  console.error(
    "\nMove the value to .env (it is git-ignored) and read it from the environment." +
      "\nIf this is a false positive, add the comment `secret-scan: allow` on that line," +
      "\nor commit once with `git commit --no-verify`.\n"
  );
  process.exit(1);
}
