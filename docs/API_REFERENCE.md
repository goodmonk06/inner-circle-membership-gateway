# API Reference

Complete API documentation for the Inner Circle Membership Gateway.

## Table of Contents

- [Authentication](#authentication)
- [Core Endpoints](#core-endpoints)
- [Applications](#applications)
- [Benefits](#benefits)
- [Activities](#activities)
- [Webhooks](#webhooks)
- [History](#history)

## Authentication

Currently, the API does not enforce authentication. In production, you should add authentication middleware to protect these endpoints.

## Core Endpoints

### Member Tier Status

#### Get Member Tier Status
```
GET /api/members/:id/tier-status?communityId={communityId}
```

Get the current tier status for a member.

**Parameters:**
- `id` (path): Member ID
- `communityId` (query): Community ID

**Response:**
```json
{
  "memberId": "alice_vip",
  "communityId": "tech-innovators",
  "currentTier": {
    "id": "tier-123",
    "key": "vip",
    "name": "VIP Innovators",
    "priority": 100,
    "descriptionMarkdown": "..."
  },
  "evaluatedAt": "2025-01-15T10:30:00Z",
  "evaluationDetail": {
    "evaluatedTiers": [...],
    "assignedTier": "tier-123",
    "assignedTierName": "VIP Innovators",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

#### Re-evaluate Member
```
POST /api/re-evaluate/:memberId
```

Trigger a re-evaluation of a member's tier eligibility.

**Body:**
```json
{
  "communityId": "tech-innovators",
  "force": false
}
```

**Response:**
```json
{
  "memberId": "alice_vip",
  "previousTierId": "tier-core",
  "newTierId": "tier-vip",
  "tierChanged": true,
  "evaluationDetail": {...}
}
```

### Tiers

#### List Tiers
```
GET /api/tiers?communityId={communityId}
```

#### Get Tier
```
GET /api/tiers/:id
```

#### Create Tier
```
POST /api/tiers
```

**Body:**
```json
{
  "communityId": "tech-innovators",
  "key": "premium",
  "name": "Premium Members",
  "priority": 75,
  "descriptionMarkdown": "Premium tier description",
  "color": "#FFD700",
  "icon": "star",
  "maxMembers": 100
}
```

#### Update Tier
```
PATCH /api/tiers/:id
```

#### Delete Tier
```
DELETE /api/tiers/:id
```

### Rules

#### Create Rule
```
POST /api/rules
```

**Body:**
```json
{
  "tierId": "tier-123",
  "ruleType": "reputation",
  "configJson": {
    "type": "reputation",
    "minScore": 50,
    "category": "trust"
  }
}
```

#### Delete Rule
```
DELETE /api/rules/:id
```

## Applications

### Submit Application
```
POST /api/applications
```

Submit a new application for tier membership.

**Body:**
```json
{
  "memberId": "frank_active",
  "communityId": "tech-innovators",
  "targetTierId": "tier-core",
  "reason": "I have been actively contributing for 3 months...",
  "metadata": {
    "source": "web-form"
  }
}
```

### List Applications
```
GET /api/applications?communityId={communityId}&memberId={memberId}&status={status}
```

Get applications filtered by query parameters.

**Query Parameters:**
- `communityId` (required): Filter by community
- `memberId` (optional): Filter by member
- `status` (optional): Filter by status (pending, approved, rejected, withdrawn)

### Review Application
```
POST /api/applications/:id/review
```

Review an application (approve or reject).

**Body:**
```json
{
  "status": "approved",
  "reviewNote": "Approved based on consistent contributions",
  "reviewerId": "admin_user"
}
```

## Benefits

### Create Benefit
```
POST /api/benefits
```

Create a new benefit for a tier.

**Body:**
```json
{
  "tierId": "tier-vip",
  "key": "api_rate_limit",
  "name": "API Rate Limit",
  "description": "Higher API rate limit",
  "benefitType": "quota",
  "configJson": {
    "limit": 10000,
    "period": "hourly"
  }
}
```

### List Benefits
```
GET /api/benefits?tierId={tierId}
GET /api/benefits?memberId={memberId}&communityId={communityId}
```

Get benefits by tier or by member.

### Check Benefit Access
```
GET /api/benefits/:id/check?memberId={memberId}&communityId={communityId}&benefitKey={benefitKey}
```

Check if a member has access to a specific benefit.

**Response:**
```json
{
  "hasAccess": true,
  "benefit": {
    "id": "benefit-123",
    "key": "api_rate_limit",
    "name": "API Rate Limit",
    "benefitType": "quota"
  },
  "config": {
    "limit": 10000,
    "period": "hourly"
  }
}
```

## Activities

### Log Activity
```
POST /api/activities
```

Log a member activity.

**Body:**
```json
{
  "memberId": "alice_vip",
  "communityId": "tech-innovators",
  "activityType": "post_created",
  "points": 10,
  "metadata": {
    "postId": "post-123"
  }
}
```

### Get Member Activities
```
GET /api/activities?memberId={memberId}&communityId={communityId}&activityType={type}&limit={limit}&offset={offset}
```

### Get Activity Leaderboard
```
GET /api/activities?communityId={communityId}&action=leaderboard&limit={limit}
```

**Response:**
```json
[
  {
    "memberId": "alice_vip",
    "totalPoints": 1250,
    "activityCount": 87
  },
  {
    "memberId": "bob_vip",
    "totalPoints": 980,
    "activityCount": 65
  }
]
```

### Get Activity Summary
```
GET /api/activities?communityId={communityId}&action=summary
```

**Response:**
```json
[
  {
    "activityType": "post_created",
    "count": 342,
    "totalPoints": 3420
  },
  {
    "activityType": "comment_added",
    "count": 567,
    "totalPoints": 2835
  }
]
```

## Webhooks

### Create Webhook
```
POST /api/webhooks
```

**Body:**
```json
{
  "communityId": "tech-innovators",
  "url": "https://example.com/webhook",
  "events": ["tier.changed", "application.submitted"],
  "secret": "your-webhook-secret",
  "active": true
}
```

### List Webhooks
```
GET /api/webhooks?communityId={communityId}
```

## History

### Get Tier Change History
```
GET /api/history?memberId={memberId}&communityId={communityId}&limit={limit}&offset={offset}
```

Get tier change history records.

**Response:**
```json
[
  {
    "id": "history-1",
    "memberId": "alice_vip",
    "communityId": "tech-innovators",
    "fromTier": {
      "id": "tier-core",
      "name": "Core Contributors"
    },
    "toTier": {
      "id": "tier-vip",
      "name": "VIP Innovators"
    },
    "reason": "Reached reputation threshold",
    "triggeredBy": "system",
    "changedAt": "2025-01-01T10:00:00Z"
  }
]
```

## Event Types

The following events are emitted by the system and can be subscribed to via webhooks:

- `tier.changed`: When a member's tier changes
- `application.submitted`: When a new application is submitted
- `application.reviewed`: When an application is reviewed
- `member.evaluated`: When a member is evaluated
- `activity.logged`: When an activity is logged

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error message here",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "details": {},
    "timestamp": "2025-01-15T10:30:00Z",
    "path": "/api/endpoint"
  }
}
```

Common error codes:
- `VALIDATION_ERROR` (400): Input validation failed
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict (e.g., duplicate key)
- `RATE_LIMIT_EXCEEDED` (429): Rate limit exceeded
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error
