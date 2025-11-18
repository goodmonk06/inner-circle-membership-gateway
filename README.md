# Inner Circle Membership Gateway

インナーサークル・VIP層の条件・特典・導線を設計するメンバーシップゲートウェイ（universal-auth系と連携前提）

A sophisticated membership tier management system that enables communities to define, evaluate, and manage multi-tier access control based on reputation, token holdings, and custom rules.

## 🎯 Overview

The Inner Circle Membership Gateway is a full-stack TypeScript application built on Next.js that provides:

- **Flexible Tier Definitions**: Create multiple membership tiers (VIP, Core, Outer, etc.) with custom names, descriptions, and priorities
- **Rule-Based Evaluation**: Define eligibility rules based on:
  - Reputation scores from trust oracles
  - Currency/token balances
  - Manual assignments
  - Custom evaluation logic
- **Automated Assessment**: Automatically evaluate members against tier criteria
- **Real-time Dashboard**: View tier distribution and member statistics
- **Admin Interface**: Full CRUD operations for tiers and rules
- **RESTful API**: Integrate with other systems via HTTP endpoints

## 🏗️ Architecture

### Core Components

1. **Domain Models** (`prisma/schema.prisma`)
   - `MembershipTier`: Tier definitions with priority ordering
   - `TierEligibilityRule`: Rules that determine tier access
   - `MemberTierStatus`: Current tier assignments for members

2. **Evaluation Engine** (`src/lib/evaluation/`)
   - `RuleEvaluator`: Evaluates individual rules (reputation, balance, etc.)
   - `TierEvaluator`: Orchestrates full tier evaluation for members

3. **Service Adapters** (`src/lib/adapters/`)
   - `ReputationOracleAdapter`: Interfaces with reputation/trust systems
   - `CurrencyServiceAdapter`: Queries token/currency balances
   - Both include stub implementations for development

4. **API Endpoints** (`src/app/api/`)
   - Member tier status queries
   - Re-evaluation triggers
   - Tier and rule CRUD operations
   - Dashboard statistics

5. **UI Components** (`src/app/`)
   - Admin tier management interface
   - Distribution dashboard
   - Rule configuration forms

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Docker (optional, for containerized deployment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd inner-circle-membership-gateway
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database connection and service URLs
```

4. Set up the database:
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with example data
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

### Docker Deployment

```bash
# Start all services (PostgreSQL + App)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📖 Usage

### Creating Tiers

1. Navigate to **Tier Management** (`/admin/tiers`)
2. Click **Create New Tier**
3. Define:
   - **Key**: Unique identifier (e.g., `vip`, `core`, `outer`)
   - **Name**: Display name
   - **Priority**: Higher = more exclusive (e.g., VIP=100, Core=50, Outer=10)
   - **Description**: Markdown-formatted benefits and requirements

### Defining Eligibility Rules

For each tier, add rules that members must satisfy:

**Reputation Rule:**
```json
{
  "type": "reputation",
  "minScore": 80,
  "category": "trust"
}
```

**Currency Balance Rule:**
```json
{
  "type": "currency_balance",
  "currencyId": "community-token",
  "minBalance": 1000
}
```

**Manual Assignment Rule:**
```json
{
  "type": "manual"
}
```

**Custom Rule:**
```json
{
  "type": "custom",
  "expression": "age > 30 && posts > 10",
  "description": "Members over 30 with 10+ posts"
}
```

> **Note**: All rules for a tier must pass (AND logic) for a member to qualify.

### Evaluating Members

**Via Dashboard:**
1. Go to **Dashboard** (`/dashboard`)
2. Enter a member ID
3. Click **Evaluate**

**Via API:**
```bash
POST /api/re-evaluate/:memberId
Content-Type: application/json

{
  "communityId": "default-community",
  "force": true
}
```

**Checking Status:**
```bash
GET /api/members/:memberId/tier-status?communityId=default-community
```

### Viewing Distribution

The dashboard (`/dashboard`) displays:
- Total member count
- Members per tier
- Unassigned members
- Visual tier distribution chart

## 🔌 API Reference

### Core Endpoints

#### Get Member Tier Status
```
GET /api/members/:id/tier-status?communityId={communityId}
```

Response:
```json
{
  "memberId": "alice",
  "communityId": "default-community",
  "currentTier": {
    "id": "tier-123",
    "key": "vip",
    "name": "VIP Members",
    "priority": 100,
    "descriptionMarkdown": "..."
  },
  "evaluatedAt": "2025-01-15T10:30:00Z",
  "evaluationDetail": {
    "evaluatedTiers": [...],
    "assignedTier": "tier-123",
    "assignedTierName": "VIP Members",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

#### Re-evaluate Member
```
POST /api/re-evaluate/:memberId
Content-Type: application/json

{
  "communityId": "default-community",
  "force": false
}
```

Response:
```json
{
  "memberId": "alice",
  "previousTierId": "tier-123",
  "newTierId": "tier-456",
  "tierChanged": true,
  "evaluationDetail": {...}
}
```

#### List Tiers
```
GET /api/tiers?communityId={communityId}
```

#### Create Tier
```
POST /api/tiers
Content-Type: application/json

{
  "communityId": "default-community",
  "key": "premium",
  "name": "Premium Members",
  "priority": 75,
  "descriptionMarkdown": "..."
}
```

#### Add Rule to Tier
```
POST /api/rules
Content-Type: application/json

{
  "tierId": "tier-123",
  "ruleType": "reputation",
  "configJson": {
    "type": "reputation",
    "minScore": 50
  }
}
```

#### Get Tier Distribution
```
GET /api/dashboard/distribution?communityId={communityId}
```

## 🔗 Integration Guide

### Checking Member Access in Other Systems

Other systems can query the membership gateway to gate features:

```typescript
// In your application
async function checkMemberAccess(memberId: string) {
  const response = await fetch(
    `https://gateway.example.com/api/members/${memberId}/tier-status?communityId=my-community`
  );

  if (!response.ok) {
    // Member not evaluated yet
    return null;
  }

  const status = await response.json();

  // Check tier priority for access control
  if (status.currentTier && status.currentTier.priority >= 50) {
    // Grant VIP/Core access
    return 'premium';
  } else if (status.currentTier) {
    // Basic access
    return 'basic';
  } else {
    // No access
    return null;
  }
}
```

### Triggering Re-evaluation

Re-evaluate members when their reputation or balances change:

```typescript
// When reputation updates
await fetch(`https://gateway.example.com/api/re-evaluate/${memberId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    communityId: 'my-community',
    force: true
  })
});
```

### Connecting External Services

Replace the stub adapters with real implementations:

**src/lib/adapters/reputation-oracle.ts:**
```typescript
async getReputationScore(memberId: string, category?: string) {
  const response = await fetch(
    `${this.baseUrl}/api/reputation/${memberId}?category=${category || ''}`
  );
  if (!response.ok) return null;
  return await response.json();
}
```

**src/lib/adapters/currency-service.ts:**
```typescript
async getCurrencyBalance(memberId: string, currencyId: string) {
  const response = await fetch(
    `${this.baseUrl}/api/balances/${memberId}/${currencyId}`
  );
  if (!response.ok) return null;
  return await response.json();
}
```

## 🧪 Testing

Run the test suite:

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

Tests include:
- Rule evaluator unit tests
- Tier evaluation logic tests
- API endpoint integration tests (add as needed)

## 📊 Database Schema

```
MembershipTier
├─ id: string (PK)
├─ communityId: string
├─ key: string (unique per community)
├─ name: string
├─ descriptionMarkdown: text
├─ priority: integer
└─ eligibilityRules: TierEligibilityRule[]

TierEligibilityRule
├─ id: string (PK)
├─ tierId: string (FK)
├─ ruleType: enum (reputation, currency_balance, manual, custom)
└─ configJson: json

MemberTierStatus
├─ id: string (PK)
├─ memberId: string (unique per community)
├─ communityId: string
├─ currentTierId: string (FK, nullable)
├─ evaluatedAt: timestamp
└─ evaluationDetailJson: json
```

## 🛠️ Development

### Project Structure

```
inner-circle-membership-gateway/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── src/
│   ├── app/                   # Next.js app router
│   │   ├── api/              # API routes
│   │   ├── admin/            # Admin UI
│   │   └── dashboard/        # Dashboard UI
│   ├── lib/
│   │   ├── adapters/         # External service adapters
│   │   ├── evaluation/       # Evaluation engine
│   │   └── prisma.ts         # Database client
│   └── types/
│       └── index.ts          # TypeScript types
├── docker-compose.yml         # Docker orchestration
└── package.json
```

### Key Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Create migration
- `npm run db:seed` - Seed database
- `npm run db:studio` - Open Prisma Studio
- `npm test` - Run tests
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services

## 🔒 Security Considerations

- **Input Validation**: All API endpoints validate input parameters
- **Rate Limiting**: Consider adding rate limiting for re-evaluation endpoints
- **Authentication**: Add authentication middleware for admin routes
- **Authorization**: Verify user permissions before tier modifications
- **SQL Injection**: Prisma ORM provides protection by default
- **XSS Protection**: React escapes user input automatically

## 🚦 Production Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Set up PostgreSQL with proper credentials
4. Run migrations: `npm run db:migrate`
5. Deploy using your platform (Vercel, Docker, etc.)
6. Configure external service endpoints
7. Set up monitoring and logging

## 🤝 Contributing

This is a standalone membership gateway system designed to integrate with universal-auth and other community management systems.

When contributing:
- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Keep the evaluation engine modular and data-driven

## 📝 License

See LICENSE file for details.

## 🙋 Support

For issues, questions, or contributions, please refer to the project documentation or contact the maintainers.

---

**Built with**: Next.js, TypeScript, PostgreSQL, Prisma, TailwindCSS
