import { ApplicationService } from '../application.service';
import { prisma } from '@/lib/prisma';
import { eventBus } from '@/lib/events';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    membershipTier: {
      findUnique: jest.fn(),
    },
    membershipApplication: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    memberTierStatus: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    tierHistory: {
      create: jest.fn(),
    },
  },
}));

// Mock event bus
jest.mock('@/lib/events', () => ({
  eventBus: {
    emit: jest.fn(),
  },
  createEvent: jest.fn((type, data) => ({ type, data, timestamp: new Date().toISOString() })),
}));

describe('ApplicationService', () => {
  let service: ApplicationService;

  beforeEach(() => {
    service = new ApplicationService();
    jest.clearAllMocks();
  });

  describe('submitApplication', () => {
    it('should create an application when tier exists and no pending application', async () => {
      const mockTier = {
        id: 'tier-1',
        communityId: 'community-1',
        key: 'vip',
        name: 'VIP Members',
        community: { id: 'community-1' },
      };

      const mockApplication = {
        id: 'app-1',
        memberId: 'member-1',
        communityId: 'community-1',
        targetTierId: 'tier-1',
        reason: 'Test reason',
        status: 'pending',
        targetTier: mockTier,
      };

      (prisma.membershipTier.findUnique as jest.Mock).mockResolvedValue(mockTier);
      (prisma.membershipApplication.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.membershipApplication.create as jest.Mock).mockResolvedValue(mockApplication);

      const result = await service.submitApplication({
        memberId: 'member-1',
        communityId: 'community-1',
        targetTierId: 'tier-1',
        reason: 'Test reason',
      });

      expect(result).toEqual(mockApplication);
      expect(prisma.membershipApplication.create).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'application.submitted',
        })
      );
    });

    it('should throw error when tier does not exist', async () => {
      (prisma.membershipTier.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.submitApplication({
          memberId: 'member-1',
          communityId: 'community-1',
          targetTierId: 'tier-1',
          reason: 'Test reason',
        })
      ).rejects.toThrow('not found');
    });

    it('should throw conflict error when pending application exists', async () => {
      const mockTier = {
        id: 'tier-1',
        communityId: 'community-1',
        community: { id: 'community-1' },
      };

      const existingApp = { id: 'existing-app', status: 'pending' };

      (prisma.membershipTier.findUnique as jest.Mock).mockResolvedValue(mockTier);
      (prisma.membershipApplication.findFirst as jest.Mock).mockResolvedValue(existingApp);

      await expect(
        service.submitApplication({
          memberId: 'member-1',
          communityId: 'community-1',
          targetTierId: 'tier-1',
          reason: 'Test reason',
        })
      ).rejects.toThrow('already pending');
    });
  });

  describe('reviewApplication', () => {
    it('should approve application and assign tier', async () => {
      const mockApplication = {
        id: 'app-1',
        memberId: 'member-1',
        communityId: 'community-1',
        targetTierId: 'tier-1',
        status: 'pending',
        targetTier: { id: 'tier-1', key: 'vip', name: 'VIP' },
        community: { id: 'community-1' },
      };

      const updatedApplication = { ...mockApplication, status: 'approved' };

      (prisma.membershipApplication.findUnique as jest.Mock).mockResolvedValue(mockApplication);
      (prisma.membershipApplication.update as jest.Mock).mockResolvedValue(updatedApplication);
      (prisma.memberTierStatus.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.memberTierStatus.upsert as jest.Mock).mockResolvedValue({});
      (prisma.membershipTier.findUnique as jest.Mock).mockResolvedValue(mockApplication.targetTier);
      (prisma.tierHistory.create as jest.Mock).mockResolvedValue({});

      const result = await service.reviewApplication({
        applicationId: 'app-1',
        reviewerId: 'reviewer-1',
        status: 'approved',
        reviewNote: 'Good fit',
      });

      expect(result.status).toBe('approved');
      expect(prisma.memberTierStatus.upsert).toHaveBeenCalled();
      expect(prisma.tierHistory.create).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'application.reviewed',
        })
      );
    });

    it('should reject application without assigning tier', async () => {
      const mockApplication = {
        id: 'app-1',
        memberId: 'member-1',
        communityId: 'community-1',
        targetTierId: 'tier-1',
        status: 'pending',
        targetTier: { id: 'tier-1', key: 'vip', name: 'VIP' },
        community: { id: 'community-1' },
      };

      const updatedApplication = { ...mockApplication, status: 'rejected' };

      (prisma.membershipApplication.findUnique as jest.Mock).mockResolvedValue(mockApplication);
      (prisma.membershipApplication.update as jest.Mock).mockResolvedValue(updatedApplication);

      const result = await service.reviewApplication({
        applicationId: 'app-1',
        reviewerId: 'reviewer-1',
        status: 'rejected',
        reviewNote: 'Not enough activity',
      });

      expect(result.status).toBe('rejected');
      expect(prisma.memberTierStatus.upsert).not.toHaveBeenCalled();
    });

    it('should throw error when application not found', async () => {
      (prisma.membershipApplication.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.reviewApplication({
          applicationId: 'app-1',
          reviewerId: 'reviewer-1',
          status: 'approved',
        })
      ).rejects.toThrow('not found');
    });

    it('should throw error when application is not pending', async () => {
      const mockApplication = {
        id: 'app-1',
        status: 'approved', // Already processed
      };

      (prisma.membershipApplication.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      await expect(
        service.reviewApplication({
          applicationId: 'app-1',
          reviewerId: 'reviewer-1',
          status: 'approved',
        })
      ).rejects.toThrow('already approved');
    });
  });

  describe('getMemberApplications', () => {
    it('should return applications for a member', async () => {
      const mockApplications = [
        { id: 'app-1', memberId: 'member-1', status: 'pending' },
        { id: 'app-2', memberId: 'member-1', status: 'approved' },
      ];

      (prisma.membershipApplication.findMany as jest.Mock).mockResolvedValue(mockApplications);

      const result = await service.getMemberApplications('member-1', 'community-1');

      expect(result).toEqual(mockApplications);
      expect(prisma.membershipApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            memberId: 'member-1',
            communityId: 'community-1',
          },
        })
      );
    });
  });
});
