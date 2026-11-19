#!/usr/bin/env node
// Read-only archive inventory. Never imports users, executes PHP, or emits record values.
const fs = require("fs"),
  path = require("path");
const root = process.argv[2];
if (!root) {
  console.error(
    "Usage: node server/scripts/audit-legacy.js /path/to/extracted/archive",
  );
  process.exit(1);
}
const counts = { php: 0, javascript: 0, html: 0, json: 0, other: 0 };
let users = null;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      e.isSymbolicLink() ||
      ["node_modules", ".git", "uploads", "logs"].includes(e.name)
    )
      continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p);
      continue;
    }
    const ext = path.extname(e.name);
    const key =
      { ".php": "php", ".js": "javascript", ".html": "html", ".json": "json" }[
        ext
      ] || "other";
    counts[key]++;
    if (p === path.join(path.resolve(root), "storage", "users.json")) {
      const raw = JSON.parse(fs.readFileSync(p, "utf8"));
      const rows = Array.isArray(raw) ? raw : Object.values(raw);
      users = {
        count: rows.length,
        fields: [...new Set(rows.flatMap((x) => Object.keys(x || {})))].sort(),
        passwordSchemes: {
          bcrypt: rows.filter((x) => /^\$2[aby]\$/.test(x.password || ""))
            .length,
          other: rows.filter((x) => !/^\$2[aby]\$/.test(x.password || ""))
            .length,
        },
      };
    }
  }
}
walk(path.resolve(root));
console.log(
  JSON.stringify(
    {
      readOnly: true,
      sourceFiles: counts,
      legacyUsers: users,
      warning:
        "No records imported. Resolve identity collisions and legacy case/document mapping before any production migration.",
    },
    null,
    2,
  ),
);
