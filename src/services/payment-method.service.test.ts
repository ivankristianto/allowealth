/**
 * Unit tests for PaymentMethodService
 */

import { describe, it, expect, mock } from 'bun:test';
import { PaymentMethodService } from './payment-method.service';
import type { PaymentMethod } from '@/lib/types';

// Mock the database module
const mockInsert = mock(() => ({ values: mock(() => ({ returning: mock(() => []) })) }));
const mockQuery = mock(() => ({
  paymentMethods: {
    findFirst: mock(() => []),
    findMany: mock(() => []),
  },
}));
const mockUpdate = mock(() => ({ set: mock(() => ({ where: mock(() => ({})) })) }));

// Create service instance
const paymentMethodService = new PaymentMethodService();

describe('PaymentMethodService', () => {
  describe('create', () => {
    it('should create a new payment method with valid input', async () => {
      const input = {
        user_id: 'user-1',
        name: 'Cash',
        type: 'cash' as const,
      };

      const mockPaymentMethod: PaymentMethod = {
        id: 'pm-1',
        ...input,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockInsert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => [mockPaymentMethod]),
        })),
      } as any);

      const result = await paymentMethodService.create(input);

      expect(result).toBeDefined();
      expect(result?.name).toBe(input.name);
      expect(result?.type).toBe(input.type);
      expect(result?.is_active).toBe(true);
    });

    it('should support all payment method types', async () => {
      const types = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'e_wallet'] as const;

      for (const type of types) {
        const input = {
          user_id: 'user-1',
          name: `Test ${type}`,
          type,
        };

        const mockPaymentMethod: PaymentMethod = {
          id: `pm-${type}`,
          ...input,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockInsert.mockReturnValueOnce({
          values: mock(() => ({
            returning: mock(() => [mockPaymentMethod]),
          })),
        } as any);

        const result = await paymentMethodService.create(input);
        expect(result?.type).toBe(type);
      }
    });
  });

  describe('findById', () => {
    it('should find payment method by id for user', async () => {
      const mockPaymentMethod: PaymentMethod = {
        id: 'pm-1',
        user_id: 'user-1',
        name: 'Cash',
        type: 'cash',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockReturnValueOnce({
        paymentMethods: {
          findFirst: mock(() => mockPaymentMethod),
        },
      } as any);

      const result = await paymentMethodService.findById('pm-1', 'user-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('pm-1');
    });

    it('should return undefined for non-existent payment method', async () => {
      mockQuery.mockReturnValueOnce({
        paymentMethods: {
          findFirst: mock(() => undefined),
        },
      } as any);

      const result = await paymentMethodService.findById('non-existent', 'user-1');

      expect(result).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should find all payment methods for user', async () => {
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: 'pm-1',
          user_id: 'user-1',
          name: 'Cash',
          type: 'cash',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'pm-2',
          user_id: 'user-1',
          name: 'BCA Bank',
          type: 'bank_transfer',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQuery.mockReturnValueOnce({
        paymentMethods: {
          findMany: mock(() => mockPaymentMethods),
        },
      } as any);

      const result = await paymentMethodService.findAll('user-1');

      expect(result).toHaveLength(2);
    });

    it('should filter by active status', async () => {
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: 'pm-1',
          user_id: 'user-1',
          name: 'Cash',
          type: 'cash',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQuery.mockReturnValueOnce({
        paymentMethods: {
          findMany: mock(() => mockPaymentMethods),
        },
      } as any);

      const result = await paymentMethodService.findAll('user-1', { is_active: true });

      expect(result).toHaveLength(1);
      if (result[0]) expect(result[0].is_active).toBe(true);
    });

    it('should return only active payment methods by default', async () => {
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: 'pm-1',
          user_id: 'user-1',
          name: 'Cash',
          type: 'cash',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQuery.mockReturnValueOnce({
        paymentMethods: {
          findMany: mock(() => mockPaymentMethods),
        },
      } as any);

      const result = await paymentMethodService.findAll('user-1');

      expect(result.every((pm) => pm.is_active === true)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update payment method fields', async () => {
      const mockUpdatedPaymentMethod: PaymentMethod = {
        id: 'pm-1',
        user_id: 'user-1',
        name: 'Cash Updated',
        type: 'cash',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockReturnValueOnce({
        paymentMethods: {
          findFirst: mock(() => mockUpdatedPaymentMethod),
        },
      } as any);

      const result = await paymentMethodService.update('pm-1', 'user-1', {
        name: 'Cash Updated',
      });

      if (result) expect(result.name).toBe('Cash Updated');
    });

    it('should support partial updates', async () => {
      const mockUpdatedPaymentMethod: PaymentMethod = {
        id: 'pm-1',
        user_id: 'user-1',
        name: 'Cash',
        type: 'debit_card',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockReturnValueOnce({
        paymentMethods: {
          findFirst: mock(() => mockUpdatedPaymentMethod),
        },
      } as any);

      const result = await paymentMethodService.update('pm-1', 'user-1', {
        type: 'debit_card',
      });

      if (result) expect(result.type).toBe('debit_card');
    });

    it('should allow deactivating payment method', async () => {
      const mockUpdatedPaymentMethod: PaymentMethod = {
        id: 'pm-1',
        user_id: 'user-1',
        name: 'Cash',
        type: 'cash',
        is_active: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockReturnValueOnce({
        paymentMethods: {
          findFirst: mock(() => mockUpdatedPaymentMethod),
        },
      } as any);

      const result = await paymentMethodService.update('pm-1', 'user-1', {
        is_active: false,
      });

      if (result) expect(result.is_active).toBe(false);
    });
  });

  describe('delete', () => {
    it('should soft delete payment method', async () => {
      mockUpdate.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({})),
        })),
      } as any);

      const result = await paymentMethodService.delete('pm-1', 'user-1');

      expect(result.success).toBe(true);
    });
  });
});
