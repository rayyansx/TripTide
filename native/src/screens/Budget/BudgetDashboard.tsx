import { Text, View } from 'react-native';
import { type BudgetRow } from '../../api/tripDetails';
import { useTranslation } from '../../i18n/TranslationContext';
import { fontFamily, useTheme } from '../../theme';
import { GlassCard } from '../../ui/chrome';

interface Props {
  budgetItems: BudgetRow[];
}

export function BudgetDashboard({ budgetItems }: Props) {
  const { t, locale } = useTranslation();
  const { m } = useTheme();

  const totalSpent = budgetItems.reduce((acc, item) => acc + item.total_price, 0);

  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });
  const formattedTotal = formatter.format(totalSpent);

  return (
    <View style={{ gap: 16, marginBottom: 16 }}>
      <GlassCard style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: m.muted }}>
          {t('budget.totalSpent') || 'Total Spent'}
        </Text>
        <Text style={{ fontFamily: fontFamily.bold, fontSize: 32, color: m.ink, marginTop: 4 }}>
          {formattedTotal}
        </Text>
      </GlassCard>


      <GlassCard style={{ padding: 16 }}>
        <Text style={{ fontFamily: fontFamily.semibold, fontSize: 16, color: m.ink, marginBottom: 12 }}>
          {t('budget.spendingBreakdown') || 'Spending Breakdown'}
        </Text>
        <View style={{ height: 16, borderRadius: 8, backgroundColor: m.glassBorder, overflow: 'hidden', flexDirection: 'row' }}>
          {budgetItems.length > 0 ? (
            budgetItems.slice(0, 3).map((item, index) => {
               const flex = totalSpent > 0 ? item.total_price / totalSpent : 1;
               const colors = [m.act, '#FF9500', '#FF3B30', '#4CD964'];
               return <View key={item.id} style={{ flex, backgroundColor: colors[index % colors.length] }} />
            })
          ) : (
            <View style={{ flex: 1, backgroundColor: m.glassBorder }} />
          )}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted }}>{budgetItems.length} items</Text>
        </View>
      </GlassCard>
    </View>
  );
}
