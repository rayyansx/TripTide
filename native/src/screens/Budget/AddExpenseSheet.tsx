import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from '../../i18n/TranslationContext';
import { fontFamily, useTheme } from '../../theme';
import { Sheet } from '../../ui/chrome';
import { convertCurrency } from '../../api/fxSync';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (expense: { name: string; amount: number; currency: string }) => void;
}

export function AddExpenseSheet({ open, onClose, onAdd }: Props) {
  const { t } = useTranslation();
  const { m } = useTheme();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');

  const handleAdd = async () => {
    // Optionally trigger an FX conversion check to ensure rates are cached
    if (currency !== 'EUR') {
      try {
        await convertCurrency(1, currency, 'EUR');
      } catch (e) {
        console.warn('FX sync failed', e);
      }
    }
    const parsedAmount = parseFloat(amount);
    if (name && !isNaN(parsedAmount) && parsedAmount > 0) {
      onAdd({ name, amount: parsedAmount, currency });
      setName('');
      setAmount('');
      onClose();
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={{ fontFamily: fontFamily.bold, fontSize: 20, color: m.ink }}>
          {t('budget.addExpense') || 'Add Expense'}
        </Text>

        <TextInput
          placeholder={t('budget.expenseName') || 'What was it for?'}
          placeholderTextColor={m.muted}
          value={name}
          onChangeText={setName}
          style={{
            fontFamily: fontFamily.regular,
            fontSize: 16,
            color: m.ink,
            backgroundColor: m.glass,
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: m.glassBorder,
          }}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TextInput
            placeholder="0.00"
            placeholderTextColor={m.muted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={{
              flex: 1,
              fontFamily: fontFamily.semibold,
              fontSize: 24,
              color: m.ink,
              backgroundColor: m.glass,
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: m.glassBorder,
              textAlign: 'right',
            }}
          />
          <Pressable
            style={{
              justifyContent: 'center',
              backgroundColor: m.glass,
              paddingHorizontal: 20,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: m.glassBorder,
            }}
            onPress={() => setCurrency(currency === 'EUR' ? 'USD' : 'EUR')}
          >
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.ink }}>
              {currency}
            </Text>
          </Pressable>
        </View>


        <View style={{ backgroundColor: m.glass, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: m.glassBorder }}>
           <Text style={{ fontFamily: fontFamily.medium, fontSize: 14, color: m.muted }}>
             {t('budget.splitEqually') || 'Split equally among all members'}
           </Text>
        </View>

        <Pressable
          onPress={handleAdd}
          style={{
            backgroundColor: m.act,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.actFg }}>
            {t('common.add') || 'Add'}
          </Text>
        </Pressable>
      </View>
    </Sheet>
  );
}
