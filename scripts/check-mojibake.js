const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SCAN_ROOTS = ['src', 'scripts', 'prisma'];
const SKIP_DIRS = new Set([
  '.git',
  '.next',
  'node_modules',
  'coverage',
  'dist',
  'build',
  'StockMovement_Install',
  'codex-quota',
]);
const SKIP_FILE_PATTERNS = [
  /(^|\/)backup\.sql$/i,
  /backup_stock_db_.*\.sql$/i,
  /stock_db_backup\.sql$/i,
  /(^|\/)mojibake-guard\.test\.ts$/i,
];
const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.css',
  '.scss',
  '.html',
  '.txt',
  '.yml',
  '.yaml',
  '.sql',
  '.prisma',
  '.bat',
  '.sh',
]);

const PATTERNS = [
  { label: 'Thai mojibake marker A', regex: /\u0E40\u0E18/ },
  { label: 'Thai mojibake marker B', regex: /\u0E40\u0E19\u20AC/ },
  { label: 'Thai mojibake marker C', regex: /\u0E42\u0082/ },
  { label: 'Replacement char', regex: /\uFFFD/ },
];

function shouldScan(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (SKIP_FILE_PATTERNS.some((regex) => regex.test(normalizedPath))) {
    return false;
  }
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function walk(dirPath, files) {
  if (!fs.existsSync(dirPath)) return;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.env.example') {
      if (entry.isDirectory()) continue;
    }
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (entry.isFile() && shouldScan(fullPath)) {
      files.push(fullPath);
    }
  }
}

function collectFiles() {
  const files = [];
  for (const rootName of SCAN_ROOTS) {
    walk(path.join(ROOT, rootName), files);
  }
  return files.sort();
}

function scanFile(filePath) {
  const raw = fs.readFileSync(filePath);
  // Skip UTF-16/serialized dump-like content with NUL bytes.
  if (raw.includes(0)) return [];
  const content = raw.toString('utf8');
  const hits = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of PATTERNS) {
      if (pattern.regex.test(line)) {
        hits.push({
          filePath,
          lineNumber: index + 1,
          label: pattern.label,
          preview: line.trim(),
        });
      }
    }
  }

  return hits;
}

function main() {
  const files = collectFiles();
  const issues = files.flatMap(scanFile);

  if (issues.length === 0) {
    console.log(`No mojibake patterns found in ${files.length} text files.`);
    return;
  }

  console.error(`Found ${issues.length} mojibake pattern hits:`);
  for (const issue of issues) {
    const relativePath = path.relative(ROOT, issue.filePath).replace(/\\/g, '/');
    console.error(`- ${relativePath}:${issue.lineNumber} [${issue.label}] ${issue.preview}`);
  }

  process.exitCode = 1;
}

main();
