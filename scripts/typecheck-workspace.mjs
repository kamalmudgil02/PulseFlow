import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['apps', 'packages'];
const found = [];
const missing = [];

for (const root of roots) {
  if (!existsSync(root)) {
    continue;
  }

  for (const entry of readdirSync(root)) {
    const directory = join(root, entry);
    if (!statSync(directory).isDirectory()) {
      continue;
    }

    const manifestPath = join(directory, 'package.json');
    if (!existsSync(manifestPath)) {
      continue;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const name =
      typeof manifest.name === 'string' ? manifest.name : directory;
    found.push(name);

    if (typeof manifest.scripts?.typecheck !== 'string') {
      missing.push(`${directory} (${name}) has no typecheck script`);
    }
  }
}

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

if (found.length === 0) {
  console.log(
    'No workspace packages yet. Each future package must define a typecheck script.',
  );
} else {
  console.log(`Typecheck scripts present in: ${found.join(', ')}`);
}
