import { describe, expect, it } from 'vitest';
import { calculateSettlements, computeBalances } from './debtMath';

describe('debtMath', () => {
  describe('computeBalances', () => {
    it('handles equal split correctly', () => {
      const items = [
        {
          id: 1,
          trip_id: 1,
          category: 'food',
          name: 'Dinner',
          total_price: 90,
          paid_by_user_id: 1,
          members: [
            { user_id: 1, amount: null },
            { user_id: 2, amount: null },
            { user_id: 3, amount: null },
          ],
        },
      ] as unknown as import('@trek/shared').BudgetItem[];

      const balances = computeBalances(items);
      expect(balances).toContainEqual({ userId: 1, balance: 60 });
      expect(balances).toContainEqual({ userId: 2, balance: -30 });
      expect(balances).toContainEqual({ userId: 3, balance: -30 });
    });

    it('handles explicit multi-payers and explicit splits', () => {
      const items = [
        {
          id: 1,
          trip_id: 1,
          category: 'food',
          name: 'Dinner',
          total_price: 100,
          payers: [
            { user_id: 1, amount: 60 },
            { user_id: 2, amount: 40 },
          ],
          members: [
            { user_id: 1, amount: 50 },
            { user_id: 2, amount: null },
            { user_id: 3, amount: null },
          ],
        },
      ] as unknown as import('@trek/shared').BudgetItem[];

      const balances = computeBalances(items);
      // User 1 paid 60, owes 50 -> +10
      // Remaining 50 split among 2 and 3 -> 25 each. User 2 paid 40, owes 25 -> +15
      // User 3 owes 25 -> -25
      expect(balances).toContainEqual({ userId: 1, balance: 10 });
      expect(balances).toContainEqual({ userId: 2, balance: 15 });
      expect(balances).toContainEqual({ userId: 3, balance: -25 });
    });
  });

  describe('calculateSettlements', () => {
    it('simplifies debts efficiently', () => {
      const balances = [
        { userId: 1, balance: 60 },
        { userId: 2, balance: -30 },
        { userId: 3, balance: -30 },
      ];

      const flows = calculateSettlements(balances);
      expect(flows).toHaveLength(2);
      expect(flows).toContainEqual({ fromUserId: 2, toUserId: 1, amount: 30 });
      expect(flows).toContainEqual({ fromUserId: 3, toUserId: 1, amount: 30 });
    });
  });
});
