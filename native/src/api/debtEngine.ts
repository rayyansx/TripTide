import { convertCurrency } from './currency';

export interface TripMemberInfo {
  id: number;
  name: string;
  avatarUrl?: string | null;
}

export interface ExpensePayer {
  user_id: number;
  amount: number;
}

export interface ExpenseSplitMember {
  user_id: number;
  amount?: number | null;
}

export interface ExpenseItemInput {
  id: number;
  name: string;
  total_price: number;
  currency?: string | null;
  paid_by_user_id?: number | null;
  payers?: ExpensePayer[];
  members?: ExpenseSplitMember[];
}

export interface SettlementInput {
  id: number;
  from_user_id: number;
  to_user_id: number;
  amount: number;
  currency?: string | null;
}

export interface MemberBalance {
  userId: number;
  name: string;
  avatarUrl: string | null;
  balance: number; // Positive = is owed money, Negative = owes money
  paidTotal: number; // Gross amount paid out of pocket
  shareTotal: number; // Gross share of expenses
  status: 'owed' | 'owes' | 'settled';
}

export interface SimplifiedDebt {
  fromUserId: number;
  fromName: string;
  toUserId: number;
  toName: string;
  amount: number;
}

export interface DebtResolutionResult {
  balances: MemberBalance[];
  simplifiedDebts: SimplifiedDebt[];
  totalTripSpent: number;
}

/**
 * Net balance and debt resolution engine.
 * Computes net balances for all trip members and simplifies debts
 * into the minimum number of direct transfers.
 */
export function calculateDebtResolution(params: {
  members: TripMemberInfo[];
  expenses: ExpenseItemInput[];
  settlements?: SettlementInput[];
  baseCurrency?: string;
  rates?: Record<string, number>;
}): DebtResolutionResult {
  const { members, expenses, settlements = [], baseCurrency = 'EUR', rates } = params;

  const memberMap = new Map<number, TripMemberInfo>();
  members.forEach((m) => memberMap.set(m.id, m));

  // Integer cents ledger to prevent floating point drift
  const netCents: Record<number, number> = {};
  const paidCents: Record<number, number> = {};
  const shareCents: Record<number, number> = {};

  members.forEach((m) => {
    netCents[m.id] = 0;
    paidCents[m.id] = 0;
    shareCents[m.id] = 0;
  });

  let totalSpentCents = 0;

  // 1. Process Expenses
  for (const exp of expenses) {
    const itemCurrency = exp.currency || baseCurrency;

    // Determine payers
    let payers: ExpensePayer[] = exp.payers || [];
    if (payers.length === 0 && exp.paid_by_user_id != null) {
      payers = [{ user_id: exp.paid_by_user_id, amount: exp.total_price }];
    } else if (payers.length === 0 && members.length > 0) {
      // Default to first member (e.g. trip owner) if no payer specified
      payers = [{ user_id: members[0].id, amount: exp.total_price }];
    }

    // Convert each payer amount to base currency cents
    let expenseTotalInBaseCents = 0;
    for (const p of payers) {
      const converted = convertCurrency(p.amount, itemCurrency, baseCurrency, rates, baseCurrency);
      const cents = Math.round(converted * 100);
      expenseTotalInBaseCents += cents;

      if (!memberMap.has(p.user_id)) {
        memberMap.set(p.user_id, { id: p.user_id, name: `User ${p.user_id}` });
        netCents[p.user_id] = 0;
        paidCents[p.user_id] = 0;
        shareCents[p.user_id] = 0;
      }

      netCents[p.user_id] = (netCents[p.user_id] || 0) + cents;
      paidCents[p.user_id] = (paidCents[p.user_id] || 0) + cents;
    }

    totalSpentCents += expenseTotalInBaseCents;

    // Determine split participants
    let splitMembers = exp.members || [];
    if (splitMembers.length === 0) {
      // Default to all members sharing equally
      splitMembers = members.map((m) => ({ user_id: m.id }));
    }

    const hasCustomShares = splitMembers.some((m) => m.amount != null);

    if (hasCustomShares) {
      for (const sm of splitMembers) {
        if (!memberMap.has(sm.user_id)) {
          memberMap.set(sm.user_id, { id: sm.user_id, name: `User ${sm.user_id}` });
          netCents[sm.user_id] = 0;
          paidCents[sm.user_id] = 0;
          shareCents[sm.user_id] = 0;
        }

        const shareAmt = sm.amount || 0;
        const converted = convertCurrency(shareAmt, itemCurrency, baseCurrency, rates, baseCurrency);
        const cents = Math.round(converted * 100);

        netCents[sm.user_id] = (netCents[sm.user_id] || 0) - cents;
        shareCents[sm.user_id] = (shareCents[sm.user_id] || 0) + cents;
      }
    } else if (splitMembers.length > 0) {
      // Equal split using largest-remainder distribution
      const count = splitMembers.length;
      const baseShare = Math.floor(expenseTotalInBaseCents / count);
      const remainder = expenseTotalInBaseCents % count;

      splitMembers.forEach((sm, index) => {
        if (!memberMap.has(sm.user_id)) {
          memberMap.set(sm.user_id, { id: sm.user_id, name: `User ${sm.user_id}` });
          netCents[sm.user_id] = 0;
          paidCents[sm.user_id] = 0;
          shareCents[sm.user_id] = 0;
        }

        // Allocate remainder cent to first N members so total matches exactly
        const cents = baseShare + (index < remainder ? 1 : 0);
        netCents[sm.user_id] = (netCents[sm.user_id] || 0) - cents;
        shareCents[sm.user_id] = (shareCents[sm.user_id] || 0) + cents;
      });
    }
  }

  // 2. Process Settlements (Transfers already completed between members)
  for (const s of settlements) {
    const sCurrency = s.currency || baseCurrency;
    const converted = convertCurrency(s.amount, sCurrency, baseCurrency, rates, baseCurrency);
    const inCents = Math.round(converted * 100);

    // The person who paid money (from_user_id) satisfies part of their debt or gives credit
    netCents[s.from_user_id] = (netCents[s.from_user_id] || 0) + inCents;
    // The person who received money (to_user_id) has their credit reduced
    netCents[s.to_user_id] = (netCents[s.to_user_id] || 0) - inCents;
  }

  // 3. Compile Member Balances
  const allUserIds = Array.from(memberMap.keys());
  const balances: MemberBalance[] = allUserIds.map((userId) => {
    const member = memberMap.get(userId)!;
    const cents = netCents[userId] || 0;
    const balance = cents / 100;

    let status: 'owed' | 'owes' | 'settled' = 'settled';
    if (cents > 0) status = 'owed';
    else if (cents < 0) status = 'owes';

    return {
      userId,
      name: member.name,
      avatarUrl: member.avatarUrl ?? null,
      balance,
      paidTotal: (paidCents[userId] || 0) / 100,
      shareTotal: (shareCents[userId] || 0) / 100,
      status,
    };
  });

  // 4. Greedy Debt Simplification
  // Separate into debtors (< 0) and creditors (> 0)
  interface Party {
    userId: number;
    name: string;
    cents: number;
  }

  const debtors: Party[] = [];
  const creditors: Party[] = [];

  for (const b of balances) {
    const cents = netCents[b.userId] || 0;
    if (cents < 0) {
      debtors.push({ userId: b.userId, name: b.name, cents: -cents });
    } else if (cents > 0) {
      creditors.push({ userId: b.userId, name: b.name, cents });
    }
  }

  // Sort descending for minimal transactions
  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);

  const simplifiedDebts: SimplifiedDebt[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const transferCents = Math.min(debtor.cents, creditor.cents);

    if (transferCents > 0) {
      simplifiedDebts.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amount: transferCents / 100,
      });

      debtor.cents -= transferCents;
      creditor.cents -= transferCents;
    }

    if (debtor.cents === 0) dIdx++;
    if (creditor.cents === 0) cIdx++;
  }

  return {
    balances,
    simplifiedDebts,
    totalTripSpent: totalSpentCents / 100,
  };
}
