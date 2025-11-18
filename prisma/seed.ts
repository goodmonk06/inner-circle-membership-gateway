import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const communityId = 'default-community';

  // Clean up existing data for this community
  console.log('Cleaning up existing data...');
  await prisma.memberTierStatus.deleteMany({
    where: { communityId },
  });
  await prisma.tierEligibilityRule.deleteMany({
    where: {
      tier: { communityId },
    },
  });
  await prisma.membershipTier.deleteMany({
    where: { communityId },
  });

  // Create VIP Tier
  console.log('Creating VIP tier...');
  const vipTier = await prisma.membershipTier.create({
    data: {
      communityId,
      key: 'vip',
      name: 'VIP Members',
      descriptionMarkdown: `
# VIP Membership

The most exclusive tier with full access to all community features and benefits.

## Benefits
- Priority support
- Exclusive events access
- Early feature access
- Direct line to core team
- Special recognition badge

## Requirements
- High reputation score (80+)
- Significant token holdings (1000+)
      `.trim(),
      priority: 100,
      eligibilityRules: {
        create: [
          {
            ruleType: 'reputation',
            configJson: {
              type: 'reputation',
              minScore: 80,
              category: 'trust',
            },
          },
          {
            ruleType: 'currency_balance',
            configJson: {
              type: 'currency_balance',
              currencyId: 'community-token',
              minBalance: 1000,
            },
          },
        ],
      },
    },
  });

  // Create Core Tier
  console.log('Creating Core tier...');
  const coreTier = await prisma.membershipTier.create({
    data: {
      communityId,
      key: 'core',
      name: 'Core Team',
      descriptionMarkdown: `
# Core Team Membership

Active contributors and trusted members of the community.

## Benefits
- Access to core discussions
- Voting rights on proposals
- Contributor recognition
- Special channels access

## Requirements
- Good reputation score (50+)
- Moderate token holdings (500+)
      `.trim(),
      priority: 50,
      eligibilityRules: {
        create: [
          {
            ruleType: 'reputation',
            configJson: {
              type: 'reputation',
              minScore: 50,
              category: 'trust',
            },
          },
          {
            ruleType: 'currency_balance',
            configJson: {
              type: 'currency_balance',
              currencyId: 'community-token',
              minBalance: 500,
            },
          },
        ],
      },
    },
  });

  // Create Outer Circle Tier
  console.log('Creating Outer Circle tier...');
  const outerTier = await prisma.membershipTier.create({
    data: {
      communityId,
      key: 'outer',
      name: 'Outer Circle',
      descriptionMarkdown: `
# Outer Circle Membership

Welcome tier for new and general members.

## Benefits
- Access to public channels
- Community events
- Learning resources
- General support

## Requirements
- Basic reputation score (20+)
- Small token holdings (100+)
      `.trim(),
      priority: 10,
      eligibilityRules: {
        create: [
          {
            ruleType: 'reputation',
            configJson: {
              type: 'reputation',
              minScore: 20,
              category: 'trust',
            },
          },
          {
            ruleType: 'currency_balance',
            configJson: {
              type: 'currency_balance',
              currencyId: 'community-token',
              minBalance: 100,
            },
          },
        ],
      },
    },
  });

  // Create sample member evaluations
  console.log('Creating sample member evaluations...');

  const sampleMembers = [
    { id: 'alice', expectedTier: vipTier.id },
    { id: 'bob', expectedTier: coreTier.id },
    { id: 'charlie', expectedTier: outerTier.id },
    { id: 'dave', expectedTier: null }, // No tier assigned
  ];

  for (const member of sampleMembers) {
    await prisma.memberTierStatus.create({
      data: {
        memberId: member.id,
        communityId,
        currentTierId: member.expectedTier,
        evaluatedAt: new Date(),
        evaluationDetailJson: {
          evaluatedTiers: [],
          assignedTier: member.expectedTier,
          assignedTierName: member.expectedTier ? 'Sample Tier' : null,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('\nCreated tiers:');
  console.log(`- VIP Members (${vipTier.id})`);
  console.log(`- Core Team (${coreTier.id})`);
  console.log(`- Outer Circle (${outerTier.id})`);
  console.log(`\nCreated ${sampleMembers.length} sample member statuses`);
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
