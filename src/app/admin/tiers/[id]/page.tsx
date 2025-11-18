'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RuleType } from '@prisma/client';

interface Tier {
  id: string;
  key: string;
  name: string;
  descriptionMarkdown: string | null;
  priority: number;
  communityId: string;
  eligibilityRules: Rule[];
}

interface Rule {
  id: string;
  ruleType: RuleType;
  configJson: any;
}

export default function EditTierPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [tier, setTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    descriptionMarkdown: '',
    priority: 50,
  });

  useEffect(() => {
    fetchTier();
  }, [params.id]);

  const fetchTier = async () => {
    try {
      const response = await fetch(`/api/tiers/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTier(data);
        setFormData({
          name: data.name,
          descriptionMarkdown: data.descriptionMarkdown || '',
          priority: data.priority,
        });
      }
    } catch (error) {
      console.error('Error fetching tier:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/tiers/${params.id}`, {
        method: 'PATCH',
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
      console.error('Error updating tier:', error);
      alert('Failed to update tier');
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTier();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <p>Loading tier...</p>
        </div>
      </div>
    );
  }

  if (!tier) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <p>Tier not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/tiers" className="text-blue-600 hover:underline mb-4 block">
          ← Back to Tiers
        </Link>

        <h1 className="text-4xl font-bold mb-8">Edit Tier: {tier.name}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tier Details Form */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Tier Details</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                />
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
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Eligibility Rules */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Eligibility Rules</h2>
              <button
                onClick={() => setShowAddRule(!showAddRule)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Rule
              </button>
            </div>

            {showAddRule && (
              <AddRuleForm
                tierId={tier.id}
                onSuccess={() => {
                  setShowAddRule(false);
                  fetchTier();
                }}
                onCancel={() => setShowAddRule(false)}
              />
            )}

            {tier.eligibilityRules.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">
                No rules defined. Add rules to control tier eligibility.
              </p>
            ) : (
              <div className="space-y-4">
                {tier.eligibilityRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-lg">
                        {rule.ruleType}
                      </span>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                      {JSON.stringify(rule.configJson, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddRuleForm({
  tierId,
  onSuccess,
  onCancel,
}: {
  tierId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [ruleType, setRuleType] = useState<RuleType>('reputation');
  const [config, setConfig] = useState('{\n  "minScore": 50\n}');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const configJson = JSON.parse(config);
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId,
          ruleType,
          configJson: { ...configJson, type: ruleType },
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      alert('Failed to create rule. Check JSON syntax.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 mb-4 bg-gray-50 dark:bg-gray-900">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Rule Type</label>
          <select
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as RuleType)}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="reputation">Reputation</option>
            <option value="currency_balance">Currency Balance</option>
            <option value="manual">Manual</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Configuration (JSON)
          </label>
          <textarea
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg h-32 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Example for reputation: {`{"minScore": 50, "category": "trust"}`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Rule'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
