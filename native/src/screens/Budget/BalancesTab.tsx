import { Text, View } from 'react-native';
import { type DebtBalance } from '../../api/debtMath';
import { useTranslation } from '../../i18n/TranslationContext';
import { fontFamily, useTheme } from '../../theme';
import { GlassCard } from '../../ui/chrome';

interface Props {
  balances: DebtBalance[];
}

export function BalancesTab({ balances }: Props) {
  const { t, locale } = useTranslation();
  const { m } = useTheme();

  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });

  if (!balances || balances.length === 0) {
    return (
      <GlassCard style={{ padding: 20 }}>
        <Text style={{ fontFamily: fontFamily.semibold, fontSize: 16, color: m.ink }}>
          {t('budget.noBalances') || 'Everybody is settled up!'}
        </Text>
      </GlassCard>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {balances.map((balance) => {
        const isOwed = balance.balance > 0;
        const color = isOwed ? '#34C759' : '#FF3B30'; // Assuming these exist, fallback to inline colors if not
        const sign = isOwed ? '+' : '';

        return (
          <GlassCard key={balance.userId} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: 16, color: m.ink }}>
              User {balance.userId}
            </Text>
            <View style={{ backgroundColor: color || (isOwed ? '#34C759' : '#FF3B30'), paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 14, color: '#FFFFFF' }}>
                {sign}{formatter.format(balance.balance)}
              </Text>
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
}
