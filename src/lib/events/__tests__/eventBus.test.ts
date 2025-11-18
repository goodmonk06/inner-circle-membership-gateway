import { EventBus, createEvent, TierChangedEvent } from '../index';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('on and emit', () => {
    it('should call handler when event is emitted', async () => {
      const handler = jest.fn();
      eventBus.on('test.event', handler);

      const event = createEvent<any>('test.event', { foo: 'bar' });
      await eventBus.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should call multiple handlers for same event', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('test.event', handler1);
      eventBus.on('test.event', handler2);

      const event = createEvent<any>('test.event', { foo: 'bar' });
      await eventBus.emit(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('should not call handler for different event type', async () => {
      const handler = jest.fn();
      eventBus.on('test.event1', handler);

      const event = createEvent<any>('test.event2', { foo: 'bar' });
      await eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('onAll', () => {
    it('should call handler for any event type', async () => {
      const handler = jest.fn();
      eventBus.onAll(handler);

      const event1 = createEvent<any>('event1', { data: 1 });
      const event2 = createEvent<any>('event2', { data: 2 });

      await eventBus.emit(event1);
      await eventBus.emit(event2);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(event1);
      expect(handler).toHaveBeenCalledWith(event2);
    });
  });

  describe('unsubscribe', () => {
    it('should stop calling handler after unsubscribe', async () => {
      const handler = jest.fn();
      const unsubscribe = eventBus.on('test.event', handler);

      const event = createEvent<any>('test.event', { foo: 'bar' });
      await eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      await eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('error handling', () => {
    it('should continue emitting to other handlers even if one fails', async () => {
      const failingHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const workingHandler = jest.fn();

      eventBus.on('test.event', failingHandler);
      eventBus.on('test.event', workingHandler);

      const event = createEvent<any>('test.event', { foo: 'bar' });
      await eventBus.emit(event);

      expect(failingHandler).toHaveBeenCalled();
      expect(workingHandler).toHaveBeenCalled();
    });
  });

  describe('getHandlerCount', () => {
    it('should return correct handler count', () => {
      expect(eventBus.getHandlerCount('test.event')).toBe(0);

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('test.event', handler1);
      expect(eventBus.getHandlerCount('test.event')).toBe(1);

      eventBus.on('test.event', handler2);
      expect(eventBus.getHandlerCount('test.event')).toBe(2);
    });
  });

  describe('createEvent', () => {
    it('should create event with correct structure', () => {
      const event = createEvent<TierChangedEvent>('tier.changed', {
        memberId: 'member-1',
        communityId: 'community-1',
        fromTierId: null,
        toTierId: 'tier-1',
        fromTierName: null,
        toTierName: 'VIP',
        reason: 'Test',
      });

      expect(event.type).toBe('tier.changed');
      expect(event.data.memberId).toBe('member-1');
      expect(event.timestamp).toBeDefined();
    });
  });
});
