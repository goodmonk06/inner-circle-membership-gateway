# Integration Guide

This guide explains how to integrate the Inner Circle Membership Gateway with other systems in your ecosystem.

## Table of Contents

- [Overview](#overview)
- [Checking Member Access](#checking-member-access)
- [Event-Driven Integration](#event-driven-integration)
- [Webhooks](#webhooks)
- [Service Adapters](#service-adapters)
- [Common Integration Patterns](#common-integration-patterns)

## Overview

The Membership Gateway is designed to integrate seamlessly with other services in a larger ecosystem:

- **Authentication Systems**: Check member tier status after login
- **API Gateways**: Enforce rate limits based on tier
- **Feature Flags**: Enable/disable features based on tier benefits
- **Notification Systems**: React to tier changes
- **Analytics**: Track tier distribution and progression

## Checking Member Access

### Basic Tier Check

```typescript
async function checkMemberTier(memberId: string, communityId: string) {
  const response = await fetch(
    `https://gateway.example.com/api/members/${memberId}/tier-status?communityId=${communityId}`
  );

  if (!response.ok) {
    return null; // Member not evaluated yet
  }

  const status = await response.json();
  return status.currentTier;
}
```

### Priority-Based Access Control

```typescript
async function hasMinimumTier(
  memberId: string,
  communityId: string,
  minPriority: number
): Promise<boolean> {
  const response = await fetch(
    `https://gateway.example.com/api/members/${memberId}/tier-status?communityId=${communityId}`
  );

  if (!response.ok) {
    return false;
  }

  const status = await response.json();
  return status.currentTier && status.currentTier.priority >= minPriority;
}

// Usage
if (await hasMinimumTier('alice', 'tech-innovators', 50)) {
  // Grant access to core features
}
```

### Benefit-Based Access Control

```typescript
async function checkBenefit(
  memberId: string,
  communityId: string,
  benefitKey: string
): Promise<{ hasAccess: boolean; config?: any }> {
  const response = await fetch(
    `https://gateway.example.com/api/benefits/check?` +
    `memberId=${memberId}&communityId=${communityId}&benefitKey=${benefitKey}`
  );

  if (!response.ok) {
    return { hasAccess: false };
  }

  return await response.json();
}

// Usage: Check API rate limit
const rateLimit = await checkBenefit('alice', 'tech-innovators', 'api_rate_limit');
if (rateLimit.hasAccess) {
  const limit = rateLimit.config.limit; // e.g., 10000
  // Apply rate limit
}

// Usage: Check feature flag
const betaAccess = await checkBenefit('alice', 'tech-innovators', 'beta_features');
if (betaAccess.hasAccess && betaAccess.config.enabled) {
  // Show beta features
}
```

## Event-Driven Integration

### Event Bus Integration

If you're running the Membership Gateway in the same process, you can subscribe to events directly:

```typescript
import { eventBus } from '@/lib/events';

// Subscribe to tier changes
eventBus.on('tier.changed', async (event) => {
  console.log(`Tier changed for ${event.data.memberId}`);
  console.log(`From: ${event.data.fromTierName} → To: ${event.data.toTierName}`);

  // Update user profile
  await updateUserProfile(event.data.memberId, {
    tier: event.data.toTierName,
    tierPriority: event.data.toTierId,
  });

  // Send notification
  await sendNotification(event.data.memberId, {
    type: 'tier_upgrade',
    message: `Congratulations! You've been upgraded to ${event.data.toTierName}`,
  });
});

// Subscribe to all events
eventBus.onAll(async (event) => {
  // Log to analytics
  await logToAnalytics(event.type, event.data);
});
```

## Webhooks

For distributed systems, use webhooks to receive events:

### Creating a Webhook

```typescript
const webhook = await fetch('https://gateway.example.com/api/webhooks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    communityId: 'tech-innovators',
    url: 'https://your-app.com/webhooks/membership',
    events: ['tier.changed', 'application.submitted', 'application.reviewed'],
    secret: 'your-webhook-secret-key',
    active: true,
  }),
});
```

### Receiving Webhooks

```typescript
import crypto from 'crypto';

app.post('/webhooks/membership', async (req, res) => {
  // Verify signature
  const signature = req.headers['x-webhook-signature'];
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', 'your-webhook-secret-key')
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process event
  const event = req.body;
  console.log(`Received event: ${event.type}`);

  switch (event.type) {
    case 'tier.changed':
      await handleTierChange(event.data);
      break;
    case 'application.submitted':
      await notifyReviewers(event.data);
      break;
    case 'application.reviewed':
      await notifyApplicant(event.data);
      break;
  }

  res.status(200).json({ received: true });
});
```

## Service Adapters

### Reputation Oracle Integration

Replace the stub implementation in `src/lib/adapters/reputation-oracle.ts`:

```typescript
async getReputationScore(memberId: string, category?: string) {
  const response = await fetch(
    `${this.baseUrl}/api/reputation/${memberId}?category=${category || ''}`
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return {
    memberId,
    score: data.score,
    category: data.category,
    lastUpdated: data.lastUpdated,
  };
}
```

### Currency Service Integration

Replace the stub in `src/lib/adapters/currency-service.ts`:

```typescript
async getCurrencyBalance(memberId: string, currencyId: string) {
  const response = await fetch(
    `${this.baseUrl}/api/balances/${memberId}/${currencyId}`
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return {
    memberId,
    currencyId,
    balance: data.balance,
    lastUpdated: data.lastUpdated,
  };
}
```

## Common Integration Patterns

### Pattern 1: Authentication Middleware

Add tier information to user sessions after authentication:

```typescript
// In your auth middleware
app.use(async (req, res, next) => {
  if (req.user) {
    const tierStatus = await fetchTierStatus(req.user.id, req.communityId);
    req.user.tier = tierStatus.currentTier;
  }
  next();
});

// In your routes
app.get('/api/protected', requireMinTier(50), async (req, res) => {
  // Only accessible to members with tier priority >= 50
  res.json({ message: 'Welcome, core member!' });
});
```

### Pattern 2: API Rate Limiting

Adjust rate limits based on tier benefits:

```typescript
import rateLimit from 'express-rate-limit';

const createRateLimiter = async (req) => {
  const benefit = await checkBenefit(
    req.user.id,
    req.communityId,
    'api_rate_limit'
  );

  const limit = benefit.hasAccess ? benefit.config.limit : 100; // Default 100

  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: limit,
  });
};

app.use('/api', async (req, res, next) => {
  const limiter = await createRateLimiter(req);
  limiter(req, res, next);
});
```

### Pattern 3: Feature Flags

Gate features based on tier benefits:

```typescript
async function canAccessFeature(
  memberId: string,
  communityId: string,
  featureName: string
): Promise<boolean> {
  const benefit = await checkBenefit(memberId, communityId, featureName);
  return benefit.hasAccess && benefit.config?.enabled === true;
}

// Usage in React
function BetaFeature() {
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    canAccessFeature(user.id, communityId, 'beta_features').then(setHasAccess);
  }, [user.id]);

  if (!hasAccess) {
    return <UpgradePrompt />;
  }

  return <BetaFeatureContent />;
}
```

### Pattern 4: Activity Tracking

Track user actions to influence tier evaluation:

```typescript
// After significant user actions
async function trackAction(memberId: string, action: string) {
  const pointsMap = {
    post_created: 10,
    comment_added: 5,
    code_contributed: 50,
    issue_resolved: 25,
  };

  await fetch('https://gateway.example.com/api/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberId,
      communityId: 'tech-innovators',
      activityType: action,
      points: pointsMap[action] || 0,
      metadata: { timestamp: new Date().toISOString() },
    }),
  });

  // Optionally trigger re-evaluation after significant milestones
  const activityCount = await getActivityCount(memberId);
  if (activityCount % 10 === 0) {
    await triggerReEvaluation(memberId);
  }
}
```

### Pattern 5: Automatic Re-evaluation

Schedule periodic re-evaluations:

```typescript
// Cron job to re-evaluate members
cron.schedule('0 0 * * *', async () => {
  // Daily at midnight
  const communities = await getCommunities();

  for (const community of communities) {
    if (!community.autoReEvalEnabled) continue;

    const members = await getMembersDueForReEval(
      community.id,
      community.autoReEvalIntervalDays
    );

    for (const member of members) {
      await fetch(`https://gateway.example.com/api/re-evaluate/${member.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id, force: true }),
      });
    }
  }
});
```

### Pattern 6: Tier-Based UI Customization

Customize the user interface based on tier:

```typescript
function DashboardLayout({ user }) {
  const tier = user.currentTier;

  return (
    <div>
      <Header
        badge={tier?.icon}
        badgeColor={tier?.color}
        userName={user.name}
        tierName={tier?.name}
      />

      {tier?.priority >= 100 && <VIPDashboard />}
      {tier?.priority >= 50 && tier?.priority < 100 && <CoreDashboard />}
      {tier?.priority < 50 && <StandardDashboard />}

      <Benefits benefits={user.benefits} />
    </div>
  );
}
```

## Best Practices

1. **Cache Tier Status**: Cache tier information in user sessions to avoid repeated API calls
2. **Handle Failures Gracefully**: If the gateway is unavailable, provide default/fallback access
3. **Use Webhooks for Real-time Updates**: Don't poll - use webhooks to stay updated
4. **Validate Webhook Signatures**: Always verify webhook signatures for security
5. **Log Integration Events**: Track all tier checks and changes for audit purposes
6. **Test Tier Transitions**: Test what happens when users move between tiers
7. **Rate Limit Re-evaluations**: Prevent abuse of the re-evaluation endpoint
8. **Monitor Tier Distribution**: Watch for unexpected tier distribution changes

## Example: Full Integration

Here's a complete example integrating all patterns:

```typescript
// src/middleware/tier.middleware.ts
export async function enrichWithTier(req, res, next) {
  if (!req.user) return next();

  try {
    const tierStatus = await gatewayClient.getTierStatus(
      req.user.id,
      req.communityId
    );

    req.user.tier = tierStatus.currentTier;
    req.user.benefits = await gatewayClient.getMemberBenefits(
      req.user.id,
      req.communityId
    );

    next();
  } catch (error) {
    console.error('Failed to fetch tier:', error);
    // Continue without tier info - don't block the request
    next();
  }
}

// src/controllers/action.controller.ts
export async function performAction(req, res) {
  const { action } = req.body;

  // Track activity
  await gatewayClient.logActivity({
    memberId: req.user.id,
    communityId: req.communityId,
    activityType: action,
    points: calculatePoints(action),
  });

  // Perform the actual action
  const result = await executeAction(action);

  // Check if re-evaluation is needed
  if (shouldTriggerReEval(req.user.activityCount)) {
    await gatewayClient.reEvaluate(req.user.id, req.communityId);
  }

  res.json({ success: true, result });
}

// src/webhooks/membership.webhook.ts
export async function handleMembershipWebhook(req, res) {
  const event = req.body;

  switch (event.type) {
    case 'tier.changed':
      await Promise.all([
        updateUserCache(event.data.memberId, event.data.toTier),
        sendEmail(event.data.memberId, 'tier-upgrade', event.data),
        notifySlack(`User ${event.data.memberId} upgraded to ${event.data.toTierName}`),
      ]);
      break;

    case 'application.submitted':
      await notifyAdmins('new-application', event.data);
      break;
  }

  res.status(200).json({ received: true });
}
```

## Troubleshooting

### Member not found
- Ensure the member has been evaluated at least once
- Call `/api/re-evaluate/:memberId` to create initial status

### Tier not updating
- Check that eligibility rules are correctly configured
- Verify reputation/currency data is available from adapters
- Review evaluation logs for rule failures

### Webhooks not receiving events
- Verify webhook URL is publicly accessible
- Check webhook secret matches
- Review webhook failure count in dashboard
- Ensure webhook is marked as active

### Rate limit errors
- Check tier priority level
- Verify benefit configuration
- Implement exponential backoff in your client
