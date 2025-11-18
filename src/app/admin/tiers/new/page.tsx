'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewTierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    communityId: 'default-community',
    key: '',
    name: '',
    descriptionMarkdown: '',
    priority: 50,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/admin/tiers');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating tier:', error);
      alert('Failed to create tier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/tiers" className="text-blue-600 hover:underline mb-4 block">
          ← Back to Tiers
        </Link>

        <h1 className="text-4xl font-bold mb-8">Create New Tier</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Community ID *
            </label>
            <input
              type="text"
              required
              value={formData.communityId}
              onChange={(e) =>
                setFormData({ ...formData, communityId: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="text-sm text-gray-500 mt-1">
              The community this tier belongs to
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tier Key *
            </label>
            <input
              type="text"
              required
              value={formData.key}
              onChange={(e) =>
                setFormData({ ...formData, key: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="e.g., vip, core, outer"
            />
            <p className="text-sm text-gray-500 mt-1">
              Unique identifier within the community (lowercase, no spaces)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tier Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="e.g., VIP Members, Core Team, Outer Circle"
            />
            <p className="text-sm text-gray-500 mt-1">
              Display name for the tier
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Priority *
            </label>
            <input
              type="number"
              required
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value) })
              }
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="text-sm text-gray-500 mt-1">
              Higher numbers = more inner circle (e.g., VIP=100, Core=50, Outer=10)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description (Markdown)
            </label>
            <textarea
              value={formData.descriptionMarkdown}
              onChange={(e) =>
                setFormData({ ...formData, descriptionMarkdown: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg h-32"
              placeholder="Describe the benefits and requirements for this tier..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Tier'}
            </button>
            <Link
              href="/admin/tiers"
              className="px-6 py-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
