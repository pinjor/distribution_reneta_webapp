import fs from "fs";
import path from "path";

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith(".tsx") || p.endsWith(".ts")) acc.push(p);
  }
  return acc;
}

function getLucideImports(content) {
  const imported = new Set();
  const re = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]lucide-react['"]/gs;
  let m;
  while ((m = re.exec(content)) !== null) {
    m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((name) => imported.add(name.replace(/^type\s+/, "")));
  }
  return imported;
}

function getUsedIcons(content) {
  const icons = new Set();
  const re = /icon=\{([A-Z][a-zA-Z0-9]*)\}/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    icons.add(m[1]);
  }
  return icons;
}

const issues = [];
for (const file of walk("src")) {
  const content = fs.readFileSync(file, "utf8");
  const used = getUsedIcons(content);
  if (used.size === 0) continue;
  const imported = getLucideImports(content);
  const missing = [...used].filter((i) => !imported.has(i));
  if (missing.length) issues.push({ file, missing });
}

if (issues.length === 0) {
  console.log("All icon props have lucide imports.");
} else {
  for (const { file, missing } of issues) {
    console.log(`${file}: ${missing.join(", ")}`);
  }
  process.exit(1);
}
