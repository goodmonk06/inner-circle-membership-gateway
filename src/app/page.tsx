import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Inner Circle Membership Gateway</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/dashboard"
            className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-400">
              View tier distribution and member statistics
            </p>
          </Link>

          <Link
            href="/admin/tiers"
            className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Tier Management</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Create and manage membership tiers
            </p>
          </Link>
        </div>

        <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
          <h3 className="text-xl font-semibold mb-4">About</h3>
          <p className="mb-4">
            This system manages multi-tier membership access for your community.
            Define tiers (VIP, Core, Outer) with configurable eligibility rules based on:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>Reputation scores from trust oracle</li>
            <li>Currency/token balances</li>
            <li>Manual assignments</li>
            <li>Custom evaluation logic</li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            API endpoints available for tier evaluation and status checking.
          </p>
        </div>
      </div>
    </div>
  );
}
