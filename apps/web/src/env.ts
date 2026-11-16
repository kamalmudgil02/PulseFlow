import { config } from 'dotenv';
import { resolve } from 'node:path';
import { validateWebEnv } from '@pulseflow/config';

/**
 * Environment configuration for Web application.
 *
 * Strategy:
 * 1. Explicitly load repository root .env file
 * 2. Validate using @pulseflow/config webEnvSchema
 * 3. Export validated environment for use in server-side code
 *
 * Root .env loading:
 * - process.cwd() in Next.js resolves to apps/web/ during dev and build
 * - Repository root is two directories up: ../../
 * - Matches API/Worker pattern but with 2 levels (no dist/ directory)
 *
 * Validation:
 * - Throws on startup if environment is misconfigured
 * - Uses @pulseflow/shared error contracts
 * - Error messages truncated to 200 characters max
 */

// Load environment variables from repository root
// Next.js process.cwd() resolves to apps/web/
// Repository root is two directories up from apps/web/
const rootEnvPath = resolve(process.cwd(), '../../.env');
config({ path: rootEnvPath });

// Validate and export environment
// This runs at module load time (top-level)
// Application will not start if validation fails
export const env = validateWebEnv(process.env);
