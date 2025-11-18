'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Tier {
  id: string;
  key: string;
  name: string;
  descriptionMarkdown: string | null;
  priority: number;
  _count: {
    memberStatuses: number;
  };
}

export default function TiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityId, setCommunityId] = useState('default-community');

  useEffect(() => {
    fetchTiers();
  }, [communityId]);

  const fetchTiers = async () => {
    try {
      const response = await fetch(`/api/tiers?communityId=${communityId}`);
      if (response.ok) {
        const data = await response.json();
        setTiers(data);
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTier = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tier?')) return;

    try {
      const response = await fetch(`/api/tiers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTiers();
      }
    } catch (error) {
      console.error('Error deleting tier:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <p>Loading tiers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/" className="text-blue-600 hover:underline mb-4 block">
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-bold">Tier Management</h1>
          </div>
          <Link
            href="/admin/tiers/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create New Tier
          </Link>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Community ID</label>
          <input
            type="text"
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="px-4 py-2 border rounded-lg w-full max-w-md"
          />
        </div>

        {tiers.length === 0 ? (
          <div className="border rounded-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No tiers found for this community.
            </p>
            <Link
              href="/admin/tiers/new"
              className="text-blue-600 hover:underline"
            >
              Create your first tier
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h2 className="text-2xl font-semibold">{tier.name}</h2>
                      <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm">
                        {tier.key}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                        Priority: {tier.priority}
                      </span>
                    </div>
                    {tier.descriptionMarkdown && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {tier.descriptionMarkdown.substring(0, 200)}
                        {tier.descriptionMarkdown.length > 200 ? '...' : ''}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {tier._count.memberStatuses} member(s) assigned
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/tiers/${tier.id}`}
                      className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteTier(tier.id)}
                      className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
