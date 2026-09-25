import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import {
  listBudget,
  listFiles,
  listMessages,
  listNotes,
  listPacking,
  listReservations,
  type BudgetRow,
  type FileRow,
  type MessageRow,
  type NoteRow,
  type PackingRow,
  type ReservationRow,
} from '../../api/tripDetails';
import { useTranslation } from '../../i18n/TranslationContext';
import { fontFamily, useTheme } from '../../theme';
import { GlassCard } from '../../ui/chrome';

import { BudgetDashboard } from '../Budget/BudgetDashboard';
import { BalancesTab } from '../Budget/BalancesTab';
import { AddExpenseSheet } from '../Budget/AddExpenseSheet';
import { computeBalances } from '../../api/debtMath';
import { create as createBudget } from '../../repo/budgetRepo';


type TripTab = 'transports' | 'buchungen' | 'finanzplan' | 'listen' | 'dateien' | 'collab';

const TRANSPORT_TYPES = new Set(['flight', 'train', 'bus', 'ferry', 'car', 'transit', 'rideshare', 'transport', 'taxi', 'rental_car']);

export function TripPanel({ tripId, tab, top, bottom }: { tripId: number; tab: TripTab; top: number; bottom: number }) {
  const { t, locale } = useTranslation();
  const { m } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [budget, setBudget] = useState<BudgetRow[]>([]);
  const [packing, setPacking] = useState<PackingRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        if (tab === 'transports' || tab === 'buchungen') {
          const rows = await listReservations(tripId);
          if (!cancelled) setReservations(rows);
        } else if (tab === 'finanzplan') {
          const rows = await listBudget(tripId);
          if (!cancelled) setBudget(rows);
        } else if (tab === 'listen') {
          const rows = await listPacking(tripId);
          if (!cancelled) setPacking(rows);
        } else if (tab === 'dateien') {
          const rows = await listFiles(tripId);
          if (!cancelled) setFiles(rows);
        } else {
          const [noteRows, messageRows] = await Promise.all([listNotes(tripId), listMessages(tripId)]);
          if (!cancelled) {
            setNotes(noteRows);
            setMessages(messageRows);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('dashboard.loadErrorBanner'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId, tab, t]);

  const transportRows = reservations.filter((row) => TRANSPORT_TYPES.has(row.type));
  const bookingRows = reservations.filter((row) => !TRANSPORT_TYPES.has(row.type));
  const computedBalances = budget.length > 0 ? computeBalances(budget as import('@trek/shared').BudgetItem[]) : [];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: top + 72, paddingBottom: bottom, paddingHorizontal: 16, gap: 10 }}>
      {loading ? <ActivityIndicator color={m.ink} style={{ marginTop: 24 }} /> : null}
      {error ? <Text style={{ fontFamily: fontFamily.regular, color: m.danger }}>{error}</Text> : null}
      {!loading && !error && tab === 'transports' ? <ReservationList rows={transportRows} empty={t('transport.title')} /> : null}
      {!loading && !error && tab === 'buchungen' ? <ReservationList rows={bookingRows.length ? bookingRows : reservations} empty={t('reservations.title')} /> : null}
      {!loading && !error && tab === 'finanzplan' ? (
        budget.length === 0 ? (
          <View style={{ gap: 16 }}>
            <Empty label={t('budget.title')} />
            <GlassCard style={{ padding: 14, alignItems: 'center' }}>
               <Text onPress={() => setAddExpenseOpen(true)} style={{ fontFamily: fontFamily.bold, color: m.act }}>
                 + {t('budget.addExpense') || 'Add Expense'}
               </Text>
            </GlassCard>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <BudgetDashboard budgetItems={budget} />
            <BalancesTab balances={computedBalances} />
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 16, color: m.ink }}>
                {t('budget.expenses') || 'Expenses'}
              </Text>
              {budget.map((item) => (
                <GlassCard key={item.id} style={{ padding: 14, gap: 4 }}>
                  <Text style={{ fontFamily: fontFamily.semibold, fontSize: 15, color: m.ink }}>{item.name}</Text>
                  <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted }}>{money(item, locale)} · {item.category}</Text>
                </GlassCard>
              ))}
            </View>
            <GlassCard style={{ padding: 14, alignItems: 'center', marginTop: 8 }}>
               <Text onPress={() => setAddExpenseOpen(true)} style={{ fontFamily: fontFamily.bold, color: m.act }}>
                 + {t('budget.addExpense') || 'Add Expense'}
               </Text>
            </GlassCard>
          </View>
        )
      ) : null}
      {!loading && !error && tab === 'listen'
        ? packing.length === 0
          ? <Empty label={t('packing.title')} />
          : packing.map((item) => (
            <GlassCard key={item.id} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: item.checked ? m.act : m.faint, backgroundColor: item.checked ? m.act : 'transparent' }} />
              <Text style={{ flex: 1, fontFamily: fontFamily.medium, fontSize: 15, color: item.checked ? m.muted : m.ink, textDecorationLine: item.checked ? 'line-through' : 'none' }}>{item.name}</Text>
            </GlassCard>
          ))
        : null}
      {!loading && !error && tab === 'dateien'
        ? files.length === 0
          ? <Empty label={t('files.empty')} />
          : files.map((file) => (
            <GlassCard key={file.id} style={{ padding: 14 }}>
              <Text style={{ fontFamily: fontFamily.medium, fontSize: 15, color: m.ink }}>{file.original_name || file.filename}</Text>
            </GlassCard>
          ))
        : null}
      {!loading && !error && tab === 'collab' ? (
        <>
          {notes.length === 0 && messages.length === 0 ? <Empty label={t('collab.tabs.notes')} /> : null}
          {notes.map((note) => (
            <GlassCard key={`n-${note.id}`} style={{ padding: 14, gap: 4 }}>
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 15, color: m.ink }}>{note.title}</Text>
              {note.content ? <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted }}>{note.content}</Text> : null}
            </GlassCard>
          ))}
          {messages.map((message) => (
            <GlassCard key={`m-${message.id}`} style={{ padding: 14, gap: 4 }}>
              {message.username ? <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.muted }}>{message.username}</Text> : null}
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 15, color: m.ink }}>{message.text}</Text>
            </GlassCard>
          ))}
        </>
      ) : null}

      <AddExpenseSheet
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        onAdd={async (exp) => {
          try {
            await createBudget(tripId, {
              name: exp.name,
              total_price: exp.amount,
              currency: exp.currency
            });
            const rows = await listBudget(tripId);
            setBudget(rows);
          } catch (e) {
            console.warn(e);
          }
        }}
      />
    </ScrollView>

  );
}

function Empty({ label }: { label: string }) {
  const { m } = useTheme();
  return (
    <GlassCard style={{ padding: 20 }}>
      <Text style={{ fontFamily: fontFamily.semibold, fontSize: 16, color: m.ink }}>{label}</Text>
    </GlassCard>
  );
}

function ReservationList({ rows, empty }: { rows: ReservationRow[]; empty: string }) {
  const { m } = useTheme();
  if (rows.length === 0) return <Empty label={empty} />;
  return (
    <>
      {rows.map((row) => (
        <GlassCard key={row.id} style={{ padding: 14, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 15, color: m.ink }}>{row.title}</Text>
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted }}>
            {row.type}{row.location ? ` · ${row.location}` : ''}{row.status ? ` · ${row.status}` : ''}
          </Text>
        </GlassCard>
      ))}
    </>
  );
}

function money(item: BudgetRow, locale: string): string {
  const currency = item.currency || 'EUR';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(item.total_price);
  } catch {
    return `${item.total_price} ${currency}`;
  }
}
