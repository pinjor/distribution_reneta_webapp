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

function getUsedHeaderIcons(content) {
  const icons = new Set();
  const re = /icon=\{([A-Z][a-zA-Z0-9]*)\}/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    icons.add(m[1]);
  }
  return icons;
}

function mergeImport(content, toAdd) {
  const match = content.match(
    /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/s,
  );
  if (!match) {
    const insert = `import { ${toAdd.join(", ")} } from "lucide-react";\n`;
    const idx = content.indexOf("\n") + 1;
    return content.slice(0, idx) + insert + content.slice(idx);
  }
  const existing = match[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = [...new Set([...existing, ...toAdd])].sort((a, b) =>
    a.localeCompare(b),
  );
  const replacement = `import {\n  ${merged.join(",\n  ")},\n} from "lucide-react"`;
  return content.replace(
    /import\s+\{[^}]+\}\s+from\s+['"]lucide-react['"]/s,
    replacement,
  );
}

const roots = ["src/pages", "src/components"];
const fixes = [];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const content = fs.readFileSync(file, "utf8");
    if (!content.includes("PageHeader") && !content.includes("icon={")) continue;

    const imported = getLucideImports(content);
    const used = getUsedHeaderIcons(content);
    const missing = [...used].filter((i) => !imported.has(i));
    if (missing.length === 0) continue;

    const updated = mergeImport(content, missing);
    fs.writeFileSync(file, updated);
    fixes.push({ file, missing });
  }
}

for (const f of fixes) {
  console.log(`${f.file}: added ${f.missing.join(", ")}`);
}
console.log(`Fixed ${fixes.length} file(s).`);
