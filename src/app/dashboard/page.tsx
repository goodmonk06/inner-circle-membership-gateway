'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TierDistribution } from '@/types';

export default function DashboardPage() {
  const [distribution, setDistribution] = useState<TierDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [communityId, setCommunityId] = useState('default-community');
  const [memberId, setMemberId] = useState('');
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    fetchDistribution();
  }, [communityId]);

  const fetchDistribution = async () => {
    try {
      const response = await fetch(`/api/dashboard/distribution?communityId=${communityId}`);
      if (response.ok) {
        const data = await response.json();
        setDistribution(data);
      }
    } catch (error) {
      console.error('Error fetching distribution:', error);
    } finally {
      setLoading(false);
    }
  };

  const evaluateMember = async () => {
    if (!memberId.trim()) return;

    setEvaluating(true);
    try {
      const response = await fetch(`/api/re-evaluate/${memberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId, force: true }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `Evaluation complete!\n` +
          `Previous tier: ${result.previousTierId || 'None'}\n` +
          `New tier: ${result.newTierId || 'None'}\n` +
          `Changed: ${result.tierChanged ? 'Yes' : 'No'}`
        );
        fetchDistribution();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error evaluating member:', error);
      alert('Failed to evaluate member');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 block">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-8">Membership Dashboard</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Community ID</label>
          <input
            type="text"
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="px-4 py-2 border rounded-lg w-full max-w-md"
          />
        </div>

        {/* Quick Evaluate Tool */}
        <div className="border rounded-lg p-6 mb-8 bg-gray-50 dark:bg-gray-900">
          <h2 className="text-2xl font-semibold mb-4">Evaluate Member</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="Enter member ID"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={evaluateMember}
              disabled={evaluating || !memberId.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {evaluating ? 'Evaluating...' : 'Evaluate'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Test tier evaluation for any member ID
          </p>
        </div>

        {/* Statistics */}
        {distribution && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="border rounded-lg p-6 bg-white dark:bg-gray-900">
                <h3 className="text-lg font-semibold mb-2">Total Members</h3>
                <p className="text-4xl font-bold">{distribution.totalMembers}</p>
              </div>

              <div className="border rounded-lg p-6 bg-white dark:bg-gray-900">
                <h3 className="text-lg font-semibold mb-2">Tier Count</h3>
                <p className="text-4xl font-bold">{distribution.tierCounts.length}</p>
              </div>

              <div className="border rounded-lg p-6 bg-white dark:bg-gray-900">
                <h3 className="text-lg font-semibold mb-2">Unassigned</h3>
                <p className="text-4xl font-bold">{distribution.unassignedCount}</p>
              </div>
            </div>

            {/* Tier Distribution Chart */}
            <div className="border rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-6">Tier Distribution</h2>

              {distribution.tierCounts.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">
                  No tiers configured for this community.{' '}
                  <Link href="/admin/tiers" className="text-blue-600 hover:underline">
                    Create tiers
                  </Link>
                </p>
              ) : (
                <div className="space-y-4">
                  {distribution.tierCounts.map((tier) => (
                    <div key={tier.tierId}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{tier.tierName}</span>
                          <span className="text-sm text-gray-500">({tier.tierKey})</span>
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                            Priority: {tier.priority}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {tier.count} members ({tier.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div
                          className="bg-blue-600 h-4 rounded-full transition-all"
                          style={{ width: `${tier.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Last Updated */}
            <p className="text-sm text-gray-500">
              Last updated: {new Date(distribution.lastUpdated).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
