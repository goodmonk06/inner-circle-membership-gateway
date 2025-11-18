import { PrismaClient, BenefitType, ApplicationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed...');

  // Create multiple communities
  console.log('\n📦 Creating communities...');

  const techCommunity = await prisma.community.upsert({
    where: { key: 'tech-innovators' },
    update: {},
    create: {
      key: 'tech-innovators',
      name: 'Tech Innovators Network',
      description: 'A community of technology enthusiasts and innovators',
      autoReEvalEnabled: true,
      autoReEvalIntervalDays: 30,
      settingsJson: {
        features: ['forums', 'events', 'marketplace'],
        theme: 'dark',
      },
    },
  });

  const gamingCommunity = await prisma.community.upsert({
    where: { key: 'elite-gamers' },
    update: {},
    create: {
      key: 'elite-gamers',
      name: 'Elite Gamers Guild',
      description: 'Professional and competitive gaming community',
      autoReEvalEnabled: false,
      settingsJson: {
        features: ['tournaments', 'voice-chat', 'streaming'],
        theme: 'gaming',
      },
    },
  });

  console.log(`✓ Created ${techCommunity.name}`);
  console.log(`✓ Created ${gamingCommunity.name}`);

  // Clean up existing data for tech community
  console.log('\n🧹 Cleaning up existing tier data...');
  await prisma.webhook.deleteMany({ where: { communityId: techCommunity.id } });
  await prisma.memberActivity.deleteMany({ where: { communityId: techCommunity.id } });
  await prisma.tierHistory.deleteMany({ where: { communityId: techCommunity.id } });
  await prisma.membershipApplication.deleteMany({ where: { communityId: techCommunity.id } });
  await prisma.memberTierStatus.deleteMany({ where: { communityId: techCommunity.id } });
  await prisma.tierBenefit.deleteMany({ where: { tier: { communityId: techCommunity.id } } });
  await prisma.tierEligibilityRule.deleteMany({ where: { tier: { communityId: techCommunity.id } } });
  await prisma.membershipTier.deleteMany({ where: { communityId: techCommunity.id } });

  // Create tiers for Tech Innovators
  console.log('\n🎯 Creating membership tiers...');

  const vipTier = await prisma.membershipTier.create({
    data: {
      communityId: techCommunity.id,
      key: 'vip',
      name: 'VIP Innovators',
      descriptionMarkdown: `
# VIP Innovators

The most exclusive tier for top contributors and thought leaders.

## Benefits
- Priority support (< 1 hour response time)
- Exclusive quarterly meetups with founders
- Early access to all new features
- Private VIP-only channels
- Custom profile badges and recognition
- Free tickets to annual conference

## Requirements
- Reputation score 80+
- Token holdings 1000+
      `.trim(),
      priority: 100,
      color: '#FFD700',
      icon: 'crown',
      maxMembers: 50,
    },
  });

  const coreTier = await prisma.membershipTier.create({
    data: {
      communityId: techCommunity.id,
      key: 'core',
      name: 'Core Contributors',
      descriptionMarkdown: `
# Core Contributors

Active members who regularly contribute to the community.

## Benefits
- Enhanced support (< 4 hour response time)
- Access to beta features
- Voting rights on community proposals
- Contributor badge
- Monthly virtual meetups

## Requirements
- Reputation score 50+
- Token holdings 500+
      `.trim(),
      priority: 50,
      color: '#C0C0C0',
      icon: 'star',
      maxMembers: 200,
    },
  });

  const activeTier = await prisma.membershipTier.create({
    data: {
      communityId: techCommunity.id,
      key: 'active',
      name: 'Active Members',
      descriptionMarkdown: `
# Active Members

Engaged community members with regular participation.

## Benefits
- Standard support
- Access to community events
- Member badge
- Learning resources

## Requirements
- Reputation score 20+
- Token holdings 100+
      `.trim(),
      priority: 25,
      color: '#CD7F32',
      icon: 'user-check',
    },
  });

  const observerTier = await prisma.membershipTier.create({
    data: {
      communityId: techCommunity.id,
      key: 'observer',
      name: 'Observers',
      descriptionMarkdown: `
# Observers

Welcome tier for new members and learners.

## Benefits
- Access to public channels
- Community guidelines
- Basic resources

## Requirements
- Reputation score 5+
      `.trim(),
      priority: 5,
      color: '#808080',
      icon: 'eye',
    },
  });

  console.log(`✓ Created ${vipTier.name}`);
  console.log(`✓ Created ${coreTier.name}`);
  console.log(`✓ Created ${activeTier.name}`);
  console.log(`✓ Created ${observerTier.name}`);

  // Create eligibility rules
  console.log('\n📋 Creating eligibility rules...');

  await prisma.tierEligibilityRule.createMany({
    data: [
      // VIP rules
      {
        tierId: vipTier.id,
        ruleType: 'reputation',
        configJson: { type: 'reputation', minScore: 80, category: 'trust' },
      },
      {
        tierId: vipTier.id,
        ruleType: 'currency_balance',
        configJson: { type: 'currency_balance', currencyId: 'tech-token', minBalance: 1000 },
      },
      // Core rules
      {
        tierId: coreTier.id,
        ruleType: 'reputation',
        configJson: { type: 'reputation', minScore: 50, category: 'trust' },
      },
      {
        tierId: coreTier.id,
        ruleType: 'currency_balance',
        configJson: { type: 'currency_balance', currencyId: 'tech-token', minBalance: 500 },
      },
      // Active rules
      {
        tierId: activeTier.id,
        ruleType: 'reputation',
        configJson: { type: 'reputation', minScore: 20, category: 'trust' },
      },
      {
        tierId: activeTier.id,
        ruleType: 'currency_balance',
        configJson: { type: 'currency_balance', currencyId: 'tech-token', minBalance: 100 },
      },
      // Observer rules
      {
        tierId: observerTier.id,
        ruleType: 'reputation',
        configJson: { type: 'reputation', minScore: 5, category: 'trust' },
      },
    ],
  });

  console.log('✓ Created eligibility rules for all tiers');

  // Create benefits
  console.log('\n🎁 Creating tier benefits...');

  await prisma.tierBenefit.createMany({
    data: [
      // VIP benefits
      {
        tierId: vipTier.id,
        key: 'api_rate_limit',
        name: 'API Rate Limit',
        description: 'Higher API rate limit for integrations',
        benefitType: 'quota' as BenefitType,
        configJson: { limit: 10000, period: 'hourly' },
      },
      {
        tierId: vipTier.id,
        key: 'priority_support',
        name: 'Priority Support',
        description: 'Sub-1-hour response time guarantee',
        benefitType: 'perk' as BenefitType,
        configJson: { responseTime: 60, guarantee: true },
      },
      {
        tierId: vipTier.id,
        key: 'beta_features',
        name: 'Beta Features Access',
        description: 'Early access to experimental features',
        benefitType: 'feature_flag' as BenefitType,
        configJson: { enabled: true, features: ['ai-assistant', 'advanced-analytics'] },
      },
      {
        tierId: vipTier.id,
        key: 'private_channels',
        name: 'Private Channels',
        description: 'Access to VIP-only discussion channels',
        benefitType: 'access' as BenefitType,
        configJson: { resources: ['vip-lounge', 'founders-circle', 'investor-talks'] },
      },
      // Core benefits
      {
        tierId: coreTier.id,
        key: 'api_rate_limit',
        name: 'API Rate Limit',
        description: 'Standard API rate limit',
        benefitType: 'quota' as BenefitType,
        configJson: { limit: 5000, period: 'hourly' },
      },
      {
        tierId: coreTier.id,
        key: 'voting_rights',
        name: 'Voting Rights',
        description: 'Vote on community proposals',
        benefitType: 'feature_flag' as BenefitType,
        configJson: { enabled: true },
      },
      {
        tierId: coreTier.id,
        key: 'core_channels',
        name: 'Core Channels',
        description: 'Access to contributor channels',
        benefitType: 'access' as BenefitType,
        configJson: { resources: ['contributors', 'beta-testing', 'feature-requests'] },
      },
      // Active benefits
      {
        tierId: activeTier.id,
        key: 'api_rate_limit',
        name: 'API Rate Limit',
        description: 'Basic API rate limit',
        benefitType: 'quota' as BenefitType,
        configJson: { limit: 1000, period: 'hourly' },
      },
      {
        tierId: activeTier.id,
        key: 'event_access',
        name: 'Event Access',
        description: 'Access to community events',
        benefitType: 'access' as BenefitType,
        configJson: { resources: ['webinars', 'workshops', 'hackathons'] },
      },
    ],
  });

  console.log('✓ Created benefits for all tiers');

  // Create sample members with different tier statuses
  console.log('\n👥 Creating sample members...');

  const members = [
    { id: 'alice_vip', tierId: vipTier.id, tierName: vipTier.name },
    { id: 'bob_vip', tierId: vipTier.id, tierName: vipTier.name },
    { id: 'carol_core', tierId: coreTier.id, tierName: coreTier.name },
    { id: 'dave_core', tierId: coreTier.id, tierName: coreTier.name },
    { id: 'eve_core', tierId: coreTier.id, tierName: coreTier.name },
    { id: 'frank_active', tierId: activeTier.id, tierName: activeTier.name },
    { id: 'grace_active', tierId: activeTier.id, tierName: activeTier.name },
    { id: 'henry_observer', tierId: observerTier.id, tierName: observerTier.name },
    { id: 'iris_observer', tierId: observerTier.id, tierName: observerTier.name },
    { id: 'jack_new', tierId: null, tierName: null }, // Not yet evaluated
  ];

  for (const member of members) {
    await prisma.memberTierStatus.create({
      data: {
        memberId: member.id,
        communityId: techCommunity.id,
        currentTierId: member.tierId,
        evaluatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random time in last 30 days
        evaluationDetailJson: {
          evaluatedTiers: [],
          assignedTier: member.tierId,
          assignedTierName: member.tierName,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  console.log(`✓ Created ${members.length} member tier statuses`);

  // Create sample tier history
  console.log('\n📜 Creating tier change history...');

  await prisma.tierHistory.createMany({
    data: [
      {
        memberId: 'alice_vip',
        communityId: techCommunity.id,
        fromTierId: coreTier.id,
        toTierId: vipTier.id,
        reason: 'Reached reputation threshold',
        triggeredBy: 'system',
        changedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        memberId: 'carol_core',
        communityId: techCommunity.id,
        fromTierId: activeTier.id,
        toTierId: coreTier.id,
        reason: 'Increased token holdings',
        triggeredBy: 'system',
        changedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        memberId: 'frank_active',
        communityId: techCommunity.id,
        fromTierId: observerTier.id,
        toTierId: activeTier.id,
        reason: 'Regular participation',
        triggeredBy: 'system',
        changedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✓ Created sample tier history records');

  // Create sample activities
  console.log('\n⚡ Creating member activities...');

  const activityTypes = [
    'post_created', 'comment_added', 'vote_cast', 'event_attended',
    'code_contributed', 'issue_resolved', 'review_completed', 'tutorial_published'
  ];

  const activityData = [];
  for (const member of members.slice(0, 7)) { // First 7 members
    const activityCount = Math.floor(Math.random() * 20) + 5;
    for (let i = 0; i < activityCount; i++) {
      activityData.push({
        memberId: member.id,
        communityId: techCommunity.id,
        activityType: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        points: Math.floor(Math.random() * 50) + 10,
        metadata: { source: 'seed', randomValue: Math.random() },
        occurredAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Random time in last 60 days
      });
    }
  }

  await prisma.memberActivity.createMany({ data: activityData });
  console.log(`✓ Created ${activityData.length} activity records`);

  // Create sample applications
  console.log('\n📝 Creating membership applications...');

  await prisma.membershipApplication.createMany({
    data: [
      {
        memberId: 'frank_active',
        communityId: techCommunity.id,
        targetTierId: coreTier.id,
        status: 'pending' as ApplicationStatus,
        reason: 'I have been actively contributing to the community for the past 3 months with over 50 posts and 20 code contributions. I believe I meet the criteria for Core membership.',
        metadata: { source: 'web-form' },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        memberId: 'grace_active',
        communityId: techCommunity.id,
        targetTierId: coreTier.id,
        status: 'approved' as ApplicationStatus,
        reason: 'Active participant with strong technical contributions',
        metadata: { source: 'web-form' },
        reviewedBy: 'admin_user',
        reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        reviewNote: 'Approved based on consistent high-quality contributions',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        memberId: 'henry_observer',
        communityId: techCommunity.id,
        targetTierId: activeTier.id,
        status: 'rejected' as ApplicationStatus,
        reason: 'Requesting active member status',
        metadata: { source: 'web-form' },
        reviewedBy: 'admin_user',
        reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        reviewNote: 'Need more participation before approval - current activity is below threshold',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✓ Created sample applications');

  // Create webhooks
  console.log('\n🔗 Creating webhooks...');

  await prisma.webhook.createMany({
    data: [
      {
        communityId: techCommunity.id,
        url: 'https://example.com/webhooks/tier-changes',
        events: ['tier.changed', 'application.submitted', 'application.reviewed'],
        secret: 'webhook_secret_12345',
        active: true,
        successCount: 42,
        failureCount: 3,
        lastTriggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        communityId: techCommunity.id,
        url: 'https://analytics.example.com/events',
        events: ['member.evaluated', 'activity.logged'],
        active: true,
        successCount: 156,
        failureCount: 0,
        lastTriggeredAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    ],
  });

  console.log('✓ Created sample webhooks');

  // Create tier template
  console.log('\n📐 Creating tier template...');

  await prisma.tierTemplate.create({
    data: {
      key: 'standard-three-tier',
      name: 'Standard Three-Tier System',
      description: 'A simple three-tier system (Premium, Standard, Basic) suitable for most communities',
      category: 'general',
      isPublic: true,
      usageCount: 0,
      templateJson: {
        tiers: [
          {
            key: 'premium',
            name: 'Premium Members',
            priority: 100,
            rules: [
              { type: 'reputation', config: { minScore: 70 } },
              { type: 'currency_balance', config: { minBalance: 1000 } },
            ],
          },
          {
            key: 'standard',
            name: 'Standard Members',
            priority: 50,
            rules: [
              { type: 'reputation', config: { minScore: 30 } },
              { type: 'currency_balance', config: { minBalance: 100 } },
            ],
          },
          {
            key: 'basic',
            name: 'Basic Members',
            priority: 10,
            rules: [
              { type: 'reputation', config: { minScore: 1 } },
            ],
          },
        ],
      },
    },
  });

  console.log('✓ Created tier template');

  // Summary
  console.log('\n✅ Seed completed successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Communities: 2`);
  console.log(`  • ${techCommunity.name} (${techCommunity.key})`);
  console.log(`  • ${gamingCommunity.name} (${gamingCommunity.key})`);
  console.log(`\nTiers: 4`);
  console.log(`  • ${vipTier.name} (priority: ${vipTier.priority})`);
  console.log(`  • ${coreTier.name} (priority: ${coreTier.priority})`);
  console.log(`  • ${activeTier.name} (priority: ${activeTier.priority})`);
  console.log(`  • ${observerTier.name} (priority: ${observerTier.priority})`);
  console.log(`\nMembers: ${members.length}`);
  console.log(`  • VIP: 2`);
  console.log(`  • Core: 3`);
  console.log(`  • Active: 2`);
  console.log(`  • Observer: 2`);
  console.log(`  • Not evaluated: 1`);
  console.log(`\nBenefits: 9 across all tiers`);
  console.log(`Activities: ${activityData.length} logged`);
  console.log(`Applications: 3 (1 pending, 1 approved, 1 rejected)`);
  console.log(`Tier History: 3 change records`);
  console.log(`Webhooks: 2 configured`);
  console.log(`Templates: 1`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎉 You can now explore the membership gateway!');
  console.log('\n💡 Try these:');
  console.log('  • View dashboard: http://localhost:3000/dashboard');
  console.log('  • Manage tiers: http://localhost:3000/admin/tiers');
  console.log('  • Check member status: GET /api/members/alice_vip/tier-status?communityId=' + techCommunity.id);
  console.log('  • View tier history: GET /api/history?communityId=' + techCommunity.id);
  console.log('  • Check activities: GET /api/activities?communityId=' + techCommunity.id + '&action=leaderboard');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
