import { NextResponse } from 'next/server';
import { livenessReport } from '@pulseflow/shared';

/**
 * GET /api/health
 *
 * Health check endpoint for Web application.
 *
 * Design:
 * - Returns liveness report only (not readiness)
 * - Web application has no infrastructure dependencies
 * - Always returns HTTP 200 when server is responding
 *
 * Architecture:
 * - Web is stateless (no PostgreSQL or Redis connections)
 * - All data access goes through API application (port 4000)
 * - Health endpoint verifies web server is running
 *
 * Contract:
 * - Uses @pulseflow/shared livenessReport() for consistency
 * - Response: { "status": "ok" }
 * - HTTP 200 OK (always)
 *
 * Route Configuration:
 * - dynamic = 'force-dynamic' prevents static optimization
 * - Health checks must return real-time status, not cached responses
 */

// Disable Next.js static optimization for this route
// Health endpoints must be dynamically rendered
export const dynamic = 'force-dynamic';

export async function GET() {
  // Web application has no infrastructure dependencies to check
  // Use liveness contract from @pulseflow/shared
  const report = livenessReport();

  return NextResponse.json(report, { status: 200 });
}
