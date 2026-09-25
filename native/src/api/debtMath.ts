import type { BudgetItem } from '@trek/shared';

export interface DebtBalance {
  userId: number;
  balance: number; // Positive means they are owed money, negative means they owe money
}

export interface SettlementFlow {
  fromUserId: number;
  toUserId: number;
  amount: number;
}

/**
 * Computes net balances for all members based on budget items.
 * A positive balance means the user is owed money (they paid more than their share).
 * A negative balance means the user owes money (they paid less than their share).
 */
export function computeBalances(items: BudgetItem[]): DebtBalance[] {
  const balanceMap = new Map<number, number>();

  for (const item of items) {
    const total = item.total_price;
    // For simplicity, we assume `payers` has explicit amounts paid by each user.
    // If empty, and there's a `paid_by_user_id`, we use that.
    const payers = item.payers && item.payers.length > 0
      ? item.payers
      : item.paid_by_user_id
        ? [{ user_id: item.paid_by_user_id, amount: total }]
        : [];

    // Credit the payers
    for (const p of payers) {
      const current = balanceMap.get(p.user_id) || 0;
      balanceMap.set(p.user_id, current + p.amount);
    }

    // Debit the members who owe
    const members = item.members && item.members.length > 0 ? item.members : [];

    if (members.length > 0) {
      // Find explicitly set amounts
      const explicitMembers = members.filter((m) => m.amount !== null && m.amount !== undefined);
      const explicitTotal = explicitMembers.reduce((sum, m) => sum + (m.amount || 0), 0);

      const remainingTotal = total - explicitTotal;
      const equalShareMembers = members.filter((m) => m.amount === null || m.amount === undefined);

      const equalShareAmount = equalShareMembers.length > 0 ? remainingTotal / equalShareMembers.length : 0;

      for (const m of members) {
        const owed = m.amount !== null && m.amount !== undefined ? m.amount : equalShareAmount;
        const current = balanceMap.get(m.user_id) || 0;
        balanceMap.set(m.user_id, current - owed);
      }
    }
  }

  const result: DebtBalance[] = [];
  for (const [userId, balance] of balanceMap.entries()) {
    // Only include users with non-zero balances (using a small epsilon for floating point errors)
    if (Math.abs(balance) > 0.01) {
      result.push({ userId, balance: Number(balance.toFixed(2)) });
    }
  }

  return result;
}

/**
 * Calculates a minimal set of transactions to settle debts.
 */
export function calculateSettlements(balances: DebtBalance[]): SettlementFlow[] {
  const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b, balance: Math.abs(b.balance) })).sort((a, b) => b.balance - a.balance);
  const creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b })).sort((a, b) => b.balance - a.balance);

  const flows: SettlementFlow[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const amount = Math.min(debtor.balance, creditor.balance);

    // Round to 2 decimal places to avoid floating point issues
    const roundedAmount = Number(amount.toFixed(2));

    if (roundedAmount > 0) {
      flows.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: roundedAmount,
      });
    }

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance < 0.01) dIdx++;
    if (creditor.balance < 0.01) cIdx++;
  }

  return flows;
}
