/**
 * Homepage component for PulseFlow Web application.
 *
 * MVP Scope:
 * - Minimal welcome page
 * - Confirms Next.js and Tailwind CSS are working
 * - No authentication or business features
 *
 * Future Implementation:
 * - Login/signup links
 * - Marketing content
 * - Feature overview
 * - Redirect to dashboard if authenticated
 */

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">PulseFlow</h1>
        <p className="text-xl text-gray-600 mb-8">
          Distributed job processing platform
        </p>
        <div className="bg-gray-100 p-6 rounded-lg">
          <p className="text-sm text-gray-700">✅ Next.js 16.4.6 running</p>
          <p className="text-sm text-gray-700">✅ React 19 running</p>
          <p className="text-sm text-gray-700">✅ Tailwind CSS v4 configured</p>
          <p className="text-sm text-gray-700 mt-4">
            Health check:{' '}
            <a href="/api/health" className="text-blue-600 underline">
              /api/health
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
