import { describe, expect, it } from 'vitest';
import { calculateDebtResolution, type TripMemberInfo, type ExpenseItemInput } from './debtEngine';

describe('Debt Resolution Math Engine', () => {
  const members: TripMemberInfo[] = [
    { id: 1, name: 'Rayyan' },
    { id: 2, name: 'Junaid' },
    { id: 3, name: 'Alex' },
  ];

  it('calculates 2-person equal split correctly', () => {
    // Rayyan pays £100 for Dinner, split equally between Rayyan and Junaid
    const expenses: ExpenseItemInput[] = [
      {
        id: 1,
        name: 'Dinner',
        total_price: 100,
        currency: 'GBP',
        paid_by_user_id: 1,
        members: [{ user_id: 1 }, { user_id: 2 }],
      },
    ];

    const result = calculateDebtResolution({
      members: members.slice(0, 2),
      expenses,
      baseCurrency: 'GBP',
    });

    const rayyan = result.balances.find((b) => b.userId === 1)!;
    const junaid = result.balances.find((b) => b.userId === 2)!;

    expect(rayyan.balance).toBe(50);
    expect(rayyan.status).toBe('owed');
    expect(junaid.balance).toBe(-50);
    expect(junaid.status).toBe('owes');

    expect(result.simplifiedDebts).toHaveLength(1);
    expect(result.simplifiedDebts[0]).toEqual({
      fromUserId: 2,
      fromName: 'Junaid',
      toUserId: 1,
      toName: 'Rayyan',
      amount: 50,
    });
  });

  it('guarantees zero-sum balance identity across all members', () => {
    const expenses: ExpenseItemInput[] = [
      {
        id: 1,
        name: 'Hotel',
        total_price: 333.33,
        currency: 'EUR',
        paid_by_user_id: 1,
        members: [{ user_id: 1 }, { user_id: 2 }, { user_id: 3 }],
      },
      {
        id: 2,
        name: 'Train tickets',
        total_price: 150,
        currency: 'EUR',
        paid_by_user_id: 2,
        members: [{ user_id: 2 }, { user_id: 3 }],
      },
    ];

    const result = calculateDebtResolution({
      members,
      expenses,
      baseCurrency: 'EUR',
    });

    const totalBalance = result.balances.reduce((acc, b) => acc + b.balance, 0);
    // Integer cents ledger ensures exactly 0.00
    expect(Math.abs(totalBalance)).toBeLessThan(0.001);
  });

  it('handles custom split shares correctly', () => {
    // Junaid pays 100, Rayyan owes 70, Alex owes 30
    const expenses: ExpenseItemInput[] = [
      {
        id: 1,
        name: 'Concert Tickets',
        total_price: 100,
        currency: 'EUR',
        paid_by_user_id: 2,
        members: [
          { user_id: 1, amount: 70 },
          { user_id: 3, amount: 30 },
        ],
      },
    ];

    const result = calculateDebtResolution({
      members,
      expenses,
      baseCurrency: 'EUR',
    });

    const rayyan = result.balances.find((b) => b.userId === 1)!;
    const junaid = result.balances.find((b) => b.userId === 2)!;
    const alex = result.balances.find((b) => b.userId === 3)!;

    expect(rayyan.balance).toBe(-70);
    expect(alex.balance).toBe(-30);
    expect(junaid.balance).toBe(100);

    expect(result.simplifiedDebts).toHaveLength(2);
    expect(result.simplifiedDebts).toContainEqual({
      fromUserId: 1,
      fromName: 'Rayyan',
      toUserId: 2,
      toName: 'Junaid',
      amount: 70,
    });
    expect(result.simplifiedDebts).toContainEqual({
      fromUserId: 3,
      fromName: 'Alex',
      toUserId: 2,
      toName: 'Junaid',
      amount: 30,
    });
  });

  it('reduces debts when settlements are recorded', () => {
    // Rayyan pays 100, Junaid owes 50
    const expenses: ExpenseItemInput[] = [
      {
        id: 1,
        name: 'Brunch',
        total_price: 100,
        currency: 'EUR',
        paid_by_user_id: 1,
        members: [{ user_id: 1 }, { user_id: 2 }],
      },
    ];

    // Junaid already sent Rayyan 30
    const settlements = [
      {
        id: 10,
        from_user_id: 2,
        to_user_id: 1,
        amount: 30,
        currency: 'EUR',
      },
    ];

    const result = calculateDebtResolution({
      members: members.slice(0, 2),
      expenses,
      settlements,
      baseCurrency: 'EUR',
    });

    const rayyan = result.balances.find((b) => b.userId === 1)!;
    const junaid = result.balances.find((b) => b.userId === 2)!;

    expect(rayyan.balance).toBe(20);
    expect(junaid.balance).toBe(-20);

    expect(result.simplifiedDebts).toHaveLength(1);
    expect(result.simplifiedDebts[0].amount).toBe(20);
  });
});
