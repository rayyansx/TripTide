import { Ionicons } from '@expo/vector-icons';
import type {
  BudgetItem,
  BudgetCreateItemRequest,
  BudgetUpdateItemRequest,
  BudgetSettlement,
  BudgetCreateSettlementRequest,
} from '@trek/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  COMMON_CURRENCIES,
  convertCurrency,
  formatMoney,
  getExchangeRates,
  type ExchangeRates,
} from '../../api/currency';
import {
  calculateDebtResolution,
  type DebtResolutionResult,
  type TripMemberInfo,
} from '../../api/debtEngine';
import { useTranslation } from '../../i18n/TranslationContext';
import { budgetRepo } from '../../repo/budgetRepo';
import { useAuthStore } from '../../store/authStore';
import { fontFamily, useTheme } from '../../theme';
import { GlassCard, Sheet } from '../../ui/chrome';

// ─── Categories ───────────────────────────────────────────────────────────────

interface CategoryConfig {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'food', label: 'Food & Drinks', icon: 'restaurant-outline', color: '#f59e0b' },
  { key: 'accommodation', label: 'Stays', icon: 'bed-outline', color: '#3b82f6' },
  { key: 'transport', label: 'Transit', icon: 'car-outline', color: '#8b5cf6' },
  { key: 'flights', label: 'Flights', icon: 'airplane-outline', color: '#06b6d4' },
  { key: 'activities', label: 'Activities', icon: 'ticket-outline', color: '#ec4899' },
  { key: 'shopping', label: 'Shopping', icon: 'bag-handle-outline', color: '#10b981' },
  { key: 'other', label: 'Other', icon: 'receipt-outline', color: '#64748b' },
];

function getCategoryConfig(key: string): CategoryConfig {
  const normalized = key.toLowerCase();
  return (
    CATEGORIES.find((c) => c.key === normalized) ?? {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      icon: 'receipt-outline',
      color: '#64748b',
    }
  );
}

// ─── Main Budget Panel Component ──────────────────────────────────────────────

export function BudgetPanel({
  tripId,
  initialCurrency = 'EUR',
  top,
  bottom,
}: {
  tripId: number;
  initialCurrency?: string;
  top: number;
  bottom: number;
}) {
  const { m } = useTheme();
  const { t, locale } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');
  const [baseCurrency, setBaseCurrency] = useState<string>(initialCurrency || 'EUR');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Data state
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [settlements, setSettlements] = useState<BudgetSettlement[]>([]);
  const [members, setMembers] = useState<TripMemberInfo[]>([]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [addingExpense, setAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BudgetItem | null>(null);
  const [settlingDebt, setSettlingDebt] = useState<{
    fromUserId: number;
    toUserId: number;
    fromName: string;
    toName: string;
    amount: number;
  } | null>(null);

  // Load exchange rates
  const loadRates = useCallback(async (curr: string) => {
    const fx = await getExchangeRates(curr);
    setRates(fx);
  }, []);

  // Main data load
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedItems, fetchedSettlements, fetchedMembers] = await Promise.all([
        budgetRepo.listItems(tripId),
        budgetRepo.listSettlements(tripId),
        budgetRepo.listMembers(tripId),
      ]);

      setItems(fetchedItems);
      setSettlements(fetchedSettlements);

      // If no members returned, seed with current user
      if (fetchedMembers.length === 0 && currentUser) {
        setMembers([{ id: currentUser.id, name: currentUser.username }]);
      } else {
        setMembers(fetchedMembers);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }, [tripId, currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadRates(baseCurrency);
  }, [baseCurrency, loadRates]);

  // Debt Engine Calculation
  const debtResolution: DebtResolutionResult = useMemo(() => {
    return calculateDebtResolution({
      members,
      expenses: items,
      settlements,
      baseCurrency,
      rates: rates?.rates,
    });
  }, [members, items, settlements, baseCurrency, rates]);

  // Spending by Category
  const categorySpending = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const cat = (item.category || 'other').toLowerCase();
      const inBase = convertCurrency(
        item.total_price,
        item.currency || baseCurrency,
        baseCurrency,
        rates?.rates,
        baseCurrency
      );
      map.set(cat, (map.get(cat) || 0) + inBase);
    }
    return Array.from(map.entries()).map(([catKey, amount]) => ({
      config: getCategoryConfig(catKey),
      amount,
    }));
  }, [items, baseCurrency, rates]);

  // Delete expense confirmation
  const handleDeleteItem = (item: BudgetItem) => {
    Alert.alert('Delete Expense', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await budgetRepo.deleteItem(tripId, item.id);
          await loadData();
        },
      },
    ]);
  };

  // Delete settlement confirmation
  const handleDeleteSettlement = (settlement: BudgetSettlement) => {
    Alert.alert('Delete Transfer', 'Undo this recorded settlement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await budgetRepo.deleteSettlement(tripId, settlement.id);
          await loadData();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Top Header Card */}
      <View
        style={{
          position: 'absolute',
          top: top + 44,
          left: 16,
          right: 16,
          zIndex: 10,
          gap: 8,
        }}
      >
        <GlassCard style={{ padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontFamily: fontFamily.medium, fontSize: 12, color: m.muted, textTransform: 'uppercase' }}>
                Total Trip Spent
              </Text>
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 24, color: m.ink }}>
                {formatMoney(debtResolution.totalTripSpent, baseCurrency, locale)}
              </Text>
            </View>

            {/* Currency Switcher Pill */}
            <Pressable
              onPress={() => setShowCurrencyPicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: m.glass,
                borderWidth: 1,
                borderColor: m.glassBorder,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 13, color: m.act }}>
                {baseCurrency}
              </Text>
              <Ionicons name="chevron-down" size={14} color={m.act} />
            </Pressable>
          </View>

          {/* Visual Category Breakdown Bar */}
          {debtResolution.totalTripSpent > 0 ? (
            <View style={{ gap: 6 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: m.faint, flexDirection: 'row', overflow: 'hidden' }}>
                {categorySpending.map(({ config, amount }) => {
                  const pct = Math.max(2, (amount / debtResolution.totalTripSpent) * 100);
                  return (
                    <View
                      key={config.key}
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: config.color,
                      }}
                    />
                  );
                })}
              </View>

              {/* Legend preview */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {categorySpending.map(({ config, amount }) => (
                  <View key={config.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: config.color }} />
                    <Text style={{ fontFamily: fontFamily.regular, fontSize: 11, color: m.muted }}>
                      {config.label} ({formatMoney(amount, baseCurrency, locale)})
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </GlassCard>

        {/* Tab Switcher: Expenses vs Who Owes Who */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: m.glass,
            borderWidth: 1,
            borderColor: m.glassBorder,
            borderRadius: 999,
            padding: 3,
          }}
        >
          <Pressable
            onPress={() => setActiveTab('expenses')}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 999,
              alignItems: 'center',
              backgroundColor: activeTab === 'expenses' ? m.act : 'transparent',
            }}
          >
            <Text
              style={{
                fontFamily: activeTab === 'expenses' ? fontFamily.bold : fontFamily.medium,
                fontSize: 13,
                color: activeTab === 'expenses' ? m.actFg : m.ink,
              }}
            >
              Expenses ({items.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('balances')}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 999,
              alignItems: 'center',
              backgroundColor: activeTab === 'balances' ? m.act : 'transparent',
            }}
          >
            <Text
              style={{
                fontFamily: activeTab === 'balances' ? fontFamily.bold : fontFamily.medium,
                fontSize: 13,
                color: activeTab === 'balances' ? m.actFg : m.ink,
              }}
            >
              Who Owes Who
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: top + 195,
          paddingBottom: bottom + 20,
          paddingHorizontal: 16,
          gap: 10,
        }}
      >
        {loading ? (
          <ActivityIndicator color={m.ink} style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={{ fontFamily: fontFamily.regular, color: m.danger }}>{error}</Text>
        ) : activeTab === 'expenses' ? (
          /* Expenses Tab */
          items.length === 0 ? (
            <GlassCard style={{ padding: 28, alignItems: 'center', gap: 10 }}>
              <Ionicons name="wallet-outline" size={40} color={m.faint} />
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.ink }}>
                No expenses logged yet
              </Text>
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted, textAlign: 'center' }}>
                Tap the + button below to log your first trip expense, choose who paid, and split it with the group.
              </Text>
            </GlassCard>
          ) : (
            items.map((item) => {
              const cat = getCategoryConfig(item.category || 'other');
              const itemCurr = item.currency || baseCurrency;
              const isDifferentCurrency = itemCurr.toUpperCase() !== baseCurrency.toUpperCase();
              const inBase = convertCurrency(
                item.total_price,
                itemCurr,
                baseCurrency,
                rates?.rates,
                baseCurrency
              );

              // Resolve payer name
              const payer = members.find((mem) => mem.id === item.paid_by_user_id);
              const payerName = payer ? payer.name : 'Unknown';

              return (
                <GlassCard key={item.id} style={{ padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: `${cat.color}22`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name={cat.icon} size={18} color={cat.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: m.ink }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
                          Paid by {payerName} · {cat.label}
                        </Text>
                      </View>
                    </View>

                    {/* Price */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.ink }}>
                        {formatMoney(item.total_price, itemCurr, locale)}
                      </Text>
                      {isDifferentCurrency ? (
                        <Text style={{ fontFamily: fontFamily.regular, fontSize: 11, color: m.muted }}>
                          ≈ {formatMoney(inBase, baseCurrency, locale)}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {item.note ? (
                    <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
                      {item.note}
                    </Text>
                  ) : null}

                  {/* Actions row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <Pressable
                      onPress={() => setEditingExpense(item)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: m.glass,
                      }}
                    >
                      <Ionicons name="pencil-outline" size={14} color={m.ink} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteItem(item)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: m.glass,
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color={m.danger} />
                    </Pressable>
                  </View>
                </GlassCard>
              );
            })
          )
        ) : (
          /* Who Owes Who Tab */
          <View style={{ gap: 14 }}>
            {/* Member Net Balances */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.muted, textTransform: 'uppercase' }}>
                Member Balances
              </Text>
              {debtResolution.balances.map((mb) => {
                const isPositive = mb.balance > 0.005;
                const isNegative = mb.balance < -0.005;

                return (
                  <GlassCard key={mb.userId} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: m.act,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: fontFamily.bold, fontSize: 14, color: m.actFg }}>
                          {mb.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: m.ink }}>
                          {mb.name}
                        </Text>
                        <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
                          Paid {formatMoney(mb.paidTotal, baseCurrency, locale)} · Share {formatMoney(mb.shareTotal, baseCurrency, locale)}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: isPositive ? '#16a34a22' : isNegative ? '#dc262622' : m.glass,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamily.bold,
                          fontSize: 13,
                          color: isPositive ? '#16a34a' : isNegative ? '#dc2626' : m.muted,
                        }}
                      >
                        {isPositive ? `+${formatMoney(mb.balance, baseCurrency, locale)}` : isNegative ? formatMoney(mb.balance, baseCurrency, locale) : 'Settled'}
                      </Text>
                    </View>
                  </GlassCard>
                );
              })}
            </View>

            {/* Suggested Transfers */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.muted, textTransform: 'uppercase' }}>
                Suggested Debt Settlement
              </Text>
              {debtResolution.simplifiedDebts.length === 0 ? (
                <GlassCard style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: '#16a34a' }}>
                    ✓ Everyone is settled up!
                  </Text>
                </GlassCard>
              ) : (
                debtResolution.simplifiedDebts.map((d, index) => (
                  <GlassCard key={index} style={{ padding: 14, gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: m.ink }}>
                          {d.fromName} owes {d.toName}
                        </Text>
                        <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
                          Direct simplified transfer
                        </Text>
                      </View>
                      <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: '#dc2626' }}>
                        {formatMoney(d.amount, baseCurrency, locale)}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => setSettlingDebt(d)}
                      style={{
                        backgroundColor: m.act,
                        borderRadius: 10,
                        paddingVertical: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontFamily: fontFamily.bold, fontSize: 13, color: m.actFg }}>
                        Record Settlement
                      </Text>
                    </Pressable>
                  </GlassCard>
                ))
              )}
            </View>

            {/* Settle-up History */}
            {settlements.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.muted, textTransform: 'uppercase' }}>
                  Past Settlements
                </Text>
                {settlements.map((s) => (
                  <GlassCard key={s.id} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ gap: 2 }}>
                      <Text style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: m.ink }}>
                        {s.from_username || `User ${s.from_user_id}`} paid {s.to_username || `User ${s.to_user_id}`}
                      </Text>
                      <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
                        {formatMoney(s.amount, s.currency || baseCurrency, locale)}
                      </Text>
                    </View>
                    <Pressable onPress={() => handleDeleteSettlement(s)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={m.danger} />
                    </Pressable>
                  </GlassCard>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Expense Button */}
      {activeTab === 'expenses' ? (
        <Pressable
          onPress={() => setAddingExpense(true)}
          style={{
            position: 'absolute',
            right: 20,
            bottom: bottom - 20,
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: m.act,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
          }}
        >
          <Ionicons name="add" size={26} color={m.actFg} />
        </Pressable>
      ) : null}

      {/* Currency Switcher Modal Sheet */}
      <CurrencyPickerSheet
        open={showCurrencyPicker}
        current={baseCurrency}
        onSelect={(code) => {
          setBaseCurrency(code);
          setShowCurrencyPicker(false);
        }}
        onClose={() => setShowCurrencyPicker(false)}
      />

      {/* Add / Edit Expense Sheet */}
      <ExpenseFormSheet
        open={addingExpense || editingExpense !== null}
        tripId={tripId}
        item={editingExpense}
        members={members}
        baseCurrency={baseCurrency}
        rates={rates?.rates}
        onClose={() => {
          setAddingExpense(false);
          setEditingExpense(null);
        }}
        onSave={async (body) => {
          if (editingExpense) {
            await budgetRepo.updateItem(tripId, editingExpense.id, body as BudgetUpdateItemRequest);
          } else {
            await budgetRepo.createItem(tripId, body as BudgetCreateItemRequest);
          }
          setAddingExpense(false);
          setEditingExpense(null);
          await loadData();
        }}
      />

      {/* Record Settlement Modal Sheet */}
      {settlingDebt ? (
        <SettleUpSheet
          open={settlingDebt !== null}
          debt={settlingDebt}
          currency={baseCurrency}
          onClose={() => setSettlingDebt(null)}
          onConfirm={async (amount) => {
            await budgetRepo.createSettlement(tripId, {
              from_user_id: settlingDebt.fromUserId,
              to_user_id: settlingDebt.toUserId,
              amount,
              currency: baseCurrency,
              settled_at: new Date().toISOString().slice(0, 10),
            });
            setSettlingDebt(null);
            await loadData();
          }}
        />
      ) : null}
    </View>
  );
}

// ─── Currency Picker Sheet ───────────────────────────────────────────────────

function CurrencyPickerSheet({
  open,
  current,
  onSelect,
  onClose,
}: {
  open: boolean;
  current: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const { m } = useTheme();

  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 18, color: m.ink }}>
            Select Base Currency
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={24} color={m.muted} />
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 4 }}>
          {COMMON_CURRENCIES.map((c) => {
            const active = c.code === current.toUpperCase();
            return (
              <Pressable
                key={c.code}
                onPress={() => onSelect(c.code)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: active ? m.act : pressed ? m.glass : 'transparent',
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: active ? m.actFg : m.ink }}>
                    {c.symbol} {c.code}
                  </Text>
                  <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: active ? m.actFg : m.muted }}>
                    {c.name}
                  </Text>
                </View>
                {active ? <Ionicons name="checkmark" size={18} color={m.actFg} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Sheet>
  );
}

// ─── Expense Add / Edit Sheet ─────────────────────────────────────────────────

function ExpenseFormSheet({
  open,
  tripId,
  item,
  members,
  baseCurrency,
  rates,
  onClose,
  onSave,
}: {
  open: boolean;
  tripId: number;
  item: BudgetItem | null;
  members: TripMemberInfo[];
  baseCurrency: string;
  rates?: Record<string, number>;
  onClose: () => void;
  onSave: (body: BudgetCreateItemRequest | BudgetUpdateItemRequest) => Promise<void>;
}) {
  const { m } = useTheme();

  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [category, setCategory] = useState('food');
  const [payerId, setPayerId] = useState<number>(members[0]?.id || 1);
  const [note, setNote] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>(members.map((m) => m.id));
  const [customShares, setCustomShares] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setName(item.name);
      setAmountStr(String(item.total_price));
      setCurrency(item.currency || baseCurrency);
      setCategory(item.category || 'food');
      setPayerId(item.paid_by_user_id || members[0]?.id || 1);
      setNote(item.note || '');

      if (item.members && item.members.some((mb) => mb.amount != null)) {
        setSplitType('custom');
        const shares: Record<number, string> = {};
        item.members.forEach((mb) => {
          shares[mb.user_id] = String(mb.amount || 0);
        });
        setCustomShares(shares);
      } else {
        setSplitType('equal');
        setSelectedMemberIds(
          item.members && item.members.length > 0
            ? item.members.map((mb) => mb.user_id)
            : members.map((m) => m.id)
        );
      }
    } else {
      setName('');
      setAmountStr('');
      setCurrency(baseCurrency);
      setCategory('food');
      setPayerId(members[0]?.id || 1);
      setNote('');
      setSplitType('equal');
      setSelectedMemberIds(members.map((m) => m.id));
      setCustomShares({});
    }
    setError(null);
    setSaving(false);
  }, [open, item, baseCurrency, members]);

  // Real-time conversion preview
  const enteredAmount = parseFloat(amountStr) || 0;
  const convertedPreview = convertCurrency(enteredAmount, currency, baseCurrency, rates, baseCurrency);

  const handleToggleMember = (id: number) => {
    if (selectedMemberIds.includes(id)) {
      if (selectedMemberIds.length > 1) {
        setSelectedMemberIds(selectedMemberIds.filter((mId) => mId !== id));
      }
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Expense title is required');
      return;
    }
    if (enteredAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: BudgetCreateItemRequest = {
        name: name.trim(),
        total_price: enteredAmount,
        currency,
        category,
        note: note.trim() || undefined,
        payers: [{ user_id: payerId, amount: enteredAmount }],
      };

      if (splitType === 'equal') {
        payload.member_ids = selectedMemberIds;
      } else {
        payload.members = Object.entries(customShares).map(([uId, shareStr]) => ({
          user_id: parseInt(uId, 10),
          amount: parseFloat(shareStr) || 0,
        }));
      }

      await onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: m.ic,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: m.ink,
    borderWidth: 1,
    borderColor: m.glassBorder,
  };

  const labelStyle = {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: m.muted,
    textTransform: 'uppercase' as const,
    marginBottom: 5,
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 18, color: m.ink }}>
            {item ? 'Edit Expense' : 'Add Expense'}
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={24} color={m.muted} />
          </Pressable>
        </View>

        {/* Title */}
        <View>
          <Text style={labelStyle}>Expense Title *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Dinner, Train Tickets, Museum"
            placeholderTextColor={m.faint}
            style={inputStyle}
          />
        </View>

        {/* Amount & Currency Row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2 }}>
            <Text style={labelStyle}>Amount *</Text>
            <TextInput
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="0.00"
              placeholderTextColor={m.faint}
              keyboardType="decimal-pad"
              style={{ ...inputStyle, fontFamily: fontFamily.bold, fontSize: 18 }}
            />
          </View>

          <View style={{ flex: 1.2 }}>
            <Text style={labelStyle}>Currency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
              {COMMON_CURRENCIES.slice(0, 5).map((c) => {
                const active = c.code === currency.toUpperCase();
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => setCurrency(c.code)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: active ? m.act : m.ic,
                      borderWidth: 1,
                      borderColor: active ? m.act : m.glassBorder,
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontFamily: fontFamily.bold, fontSize: 13, color: active ? m.actFg : m.ink }}>
                      {c.code}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Conversion preview */}
        {currency.toUpperCase() !== baseCurrency.toUpperCase() && enteredAmount > 0 ? (
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
            ≈ {formatMoney(convertedPreview, baseCurrency)} in trip base currency
          </Text>
        ) : null}

        {/* Category Picker */}
        <View>
          <Text style={labelStyle}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.map((cat) => {
              const active = cat.key === category.toLowerCase();
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setCategory(cat.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? cat.color : m.ic,
                    borderWidth: 1,
                    borderColor: active ? cat.color : m.glassBorder,
                  }}
                >
                  <Ionicons name={cat.icon} size={14} color={active ? '#fff' : cat.color} />
                  <Text
                    style={{
                      fontFamily: active ? fontFamily.bold : fontFamily.medium,
                      fontSize: 12,
                      color: active ? '#fff' : m.ink,
                    }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Who Paid */}
        <View>
          <Text style={labelStyle}>Who Paid?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {members.map((mem) => {
              const active = mem.id === payerId;
              return (
                <Pressable
                  key={mem.id}
                  onPress={() => setPayerId(mem.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: active ? m.act : m.ic,
                    borderWidth: 1,
                    borderColor: active ? m.act : m.glassBorder,
                  }}
                >
                  <Text style={{ fontFamily: fontFamily.bold, fontSize: 13, color: active ? m.actFg : m.ink }}>
                    {mem.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Split Options */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={labelStyle}>Split Between</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                onPress={() => setSplitType('equal')}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: splitType === 'equal' ? m.act : m.glass,
                }}
              >
                <Text style={{ fontFamily: fontFamily.medium, fontSize: 11, color: splitType === 'equal' ? m.actFg : m.ink }}>
                  Equally
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSplitType('custom')}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: splitType === 'custom' ? m.act : m.glass,
                }}
              >
                <Text style={{ fontFamily: fontFamily.medium, fontSize: 11, color: splitType === 'custom' ? m.actFg : m.ink }}>
                  Custom
                </Text>
              </Pressable>
            </View>
          </View>

          {splitType === 'equal' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {members.map((mem) => {
                const checked = selectedMemberIds.includes(mem.id);
                return (
                  <Pressable
                    key={mem.id}
                    onPress={() => handleToggleMember(mem.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: checked ? `${m.act}22` : m.ic,
                      borderWidth: 1,
                      borderColor: checked ? m.act : m.glassBorder,
                    }}
                  >
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={16}
                      color={checked ? m.act : m.muted}
                    />
                    <Text style={{ fontFamily: fontFamily.medium, fontSize: 13, color: m.ink }}>
                      {mem.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {members.map((mem) => (
                <View key={mem.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ flex: 1, fontFamily: fontFamily.medium, fontSize: 14, color: m.ink }}>
                    {mem.name}
                  </Text>
                  <TextInput
                    value={customShares[mem.id] || ''}
                    onChangeText={(val) => setCustomShares({ ...customShares, [mem.id]: val })}
                    placeholder="0.00"
                    placeholderTextColor={m.faint}
                    keyboardType="decimal-pad"
                    style={{ ...inputStyle, width: 90, paddingVertical: 6 }}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Notes */}
        <View>
          <Text style={labelStyle}>Notes (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Receipt info, items, etc."
            placeholderTextColor={m.faint}
            style={inputStyle}
          />
        </View>

        {error ? (
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.danger }}>{error}</Text>
        ) : null}

        {/* Submit Button */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: m.act,
            alignItems: 'center',
            marginTop: 6,
          }}
        >
          {saving ? (
            <ActivityIndicator color={m.actFg} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.actFg }}>
              {item ? 'Save Changes' : 'Add Expense'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

// ─── Settle Up Modal Sheet ────────────────────────────────────────────────────

function SettleUpSheet({
  open,
  debt,
  currency,
  onClose,
  onConfirm,
}: {
  open: boolean;
  debt: { fromName: string; toName: string; amount: number };
  currency: string;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
}) {
  const { m } = useTheme();
  const [amountStr, setAmountStr] = useState(String(debt.amount));
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    const val = parseFloat(amountStr) || 0;
    if (val <= 0) return;
    setSubmitting(true);
    await onConfirm(val);
    setSubmitting(false);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 18, color: m.ink }}>
            Record Settle Up
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={24} color={m.muted} />
          </Pressable>
        </View>

        <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: m.muted }}>
          Record payment from <Text style={{ fontFamily: fontFamily.bold, color: m.ink }}>{debt.fromName}</Text> to{' '}
          <Text style={{ fontFamily: fontFamily.bold, color: m.ink }}>{debt.toName}</Text>.
        </Text>

        <View>
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.muted, textTransform: 'uppercase', marginBottom: 5 }}>
            Amount ({currency})
          </Text>
          <TextInput
            value={amountStr}
            onChangeText={setAmountStr}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: m.ic,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: fontFamily.bold,
              fontSize: 20,
              color: m.ink,
              borderWidth: 1,
              borderColor: m.glassBorder,
            }}
          />
        </View>

        <Pressable
          onPress={handleConfirm}
          disabled={submitting}
          style={{
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: m.act,
            alignItems: 'center',
            marginTop: 6,
          }}
        >
          {submitting ? (
            <ActivityIndicator color={m.actFg} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.actFg }}>
              Confirm Payment
            </Text>
          )}
        </Pressable>
      </View>
    </Sheet>
  );
}
