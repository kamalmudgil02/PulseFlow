// prisma.config.ts
// Prisma 7 configuration file — CLI tool configuration.
// Connection URL and datasource settings live here, not in schema.prisma.
// See: https://www.prisma.io/docs/orm/reference/prisma-config-reference

import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// import.meta.dirname is available since Node 20.11 (we are on Node 26.13.1).
// Anchored to this file's location (packages/database/), not to CWD.
// CWD when invoked via pnpm is the package directory, not the repo root.
const monorepoRoot = path.resolve(import.meta.dirname, '../../');
dotenv.config({ path: path.join(monorepoRoot, '.env') });

export default defineConfig({
  // No earlyAccess — removed since Prisma 6.13 GA.
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // process.env fallback to '' so that `prisma generate` succeeds in CI
    // without a live DATABASE_URL. `prisma migrate` will fail at the
    // PostgreSQL level when the URL is empty — a correct, explicit error.
    url: process.env['DATABASE_URL'] ?? '',
  },
});
