import { BenefitService } from '../benefit.service';
import { prisma } from '@/lib/prisma';
import { BenefitType } from '@prisma/client';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    membershipTier: {
      findUnique: jest.fn(),
    },
    tierBenefit: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    memberTierStatus: {
      findUnique: jest.fn(),
    },
  },
}));

describe('BenefitService', () => {
  let service: BenefitService;

  beforeEach(() => {
    service = new BenefitService();
    jest.clearAllMocks();
  });

  describe('checkBenefitAccess', () => {
    it('should return access true when member has benefit', async () => {
      const mockStatus = {
        memberId: 'member-1',
        communityId: 'community-1',
        currentTier: {
          id: 'tier-1',
          benefits: [
            {
              id: 'benefit-1',
              key: 'api_rate_limit',
              benefitType: 'quota' as BenefitType,
              configJson: { limit: 1000 },
            },
          ],
        },
      };

      (prisma.memberTierStatus.findUnique as jest.Mock).mockResolvedValue(mockStatus);

      const result = await service.checkBenefitAccess(
        'member-1',
        'community-1',
        'api_rate_limit'
      );

      expect(result.hasAccess).toBe(true);
      expect(result.benefit).toBeDefined();
      expect(result.config).toEqual({ limit: 1000 });
    });

    it('should return access false when member has no tier', async () => {
      (prisma.memberTierStatus.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.checkBenefitAccess(
        'member-1',
        'community-1',
        'api_rate_limit'
      );

      expect(result.hasAccess).toBe(false);
      expect(result.benefit).toBeUndefined();
    });

    it('should return access false when tier does not have benefit', async () => {
      const mockStatus = {
        memberId: 'member-1',
        communityId: 'community-1',
        currentTier: {
          id: 'tier-1',
          benefits: [],
        },
      };

      (prisma.memberTierStatus.findUnique as jest.Mock).mockResolvedValue(mockStatus);

      const result = await service.checkBenefitAccess(
        'member-1',
        'community-1',
        'api_rate_limit'
      );

      expect(result.hasAccess).toBe(false);
    });
  });

  describe('hasFeature', () => {
    it('should return true for enabled feature flag', async () => {
      const mockStatus = {
        currentTier: {
          benefits: [
            {
              key: 'beta_features',
              benefitType: 'feature_flag',
              configJson: { enabled: true },
            },
          ],
        },
      };

      (prisma.memberTierStatus.findUnique as jest.Mock).mockResolvedValue(mockStatus);

      const result = await service.hasFeature('member-1', 'community-1', 'beta_features');

      expect(result).toBe(true);
    });

    it('should return false for disabled feature flag', async () => {
      const mockStatus = {
        currentTier: {
          benefits: [
            {
              key: 'beta_features',
              benefitType: 'feature_flag',
              configJson: { enabled: false },
            },
          ],
        },
      };

      (prisma.memberTierStatus.findUnique as jest.Mock).mockResolvedValue(mockStatus);

      const result = await service.hasFeature('member-1', 'community-1', 'beta_features');

      expect(result).toBe(false);
    });

    it('should return false when benefit is not a feature flag', async () => {
      const mockStatus = {
        currentTier: {
          benefits: [
            {
              key: 'api_quota',
              benefitType: 'quota',
              configJson: { limit: 1000 },
            },
          ],
        },
      };

      (prisma.memberTierStatus.findUnique as jest.Mock).mockResolvedValue(mockStatus);

      const result = await service.hasFeature('member-1', 'community-1', 'api_quota');

      expect(result).toBe(false);
    });
  });

  describe('getQuota', () => {
    it('should return quota limit for quota benefit', async () => {
      const mockStatus = {
        currentTier: {
          benefits: [
            {
              key: 'api_rate_limit',
              benefitType: 'quota',
              configJson: { limit: 5000 },
            },
          ],
        },
      };

      (prisma.memberTierStatus.findUnique as jest.Mock).mockResolvedValue(mockStatus);

      const result = await service.getQuota('member-1', 'community-1', 'api_rate_limit');

      expect(result).toBe(5000);
    });

    it('should return null when benefit does not exist', async () => {
      const mockStatus = {
        currentTier: {
          benefits: [],
        },
      };

      (prisma.memberTierStatus.findUnique as jest.Mock).mockResolvedValue(mockStatus);

      const result = await service.getQuota('member-1', 'community-1', 'api_rate_limit');

      expect(result).toBeNull();
    });

    it('should return null when benefit is not a quota', async () => {
      const mockStatus = {
        currentTier: {
          benefits: [
            {
              key: 'beta_features',
              benefitType: 'feature_flag',
              configJson: { enabled: true },
            },
          ],
        },
      };

      (prisma.memberTierStatus.findUnique as jest.Mock).mockResolvedValue(mockStatus);

      const result = await service.getQuota('member-1', 'community-1', 'beta_features');

      expect(result).toBeNull();
    });
  });
});
