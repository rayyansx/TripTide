import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppStackParamList } from '../../navigation/types';
import { fontFamily, useTheme } from '../../theme';
import { IconButton, GlassCard } from '../../ui/chrome';
import { getExchangeRates } from '../../api/currency';

type Props = NativeStackScreenProps<AppStackParamList, 'Toolkit'>;

// Simple Open-Meteo current weather implementation for demonstration
function WeatherCard() {
  const { m } = useTheme();
  const [weather, setWeather] = useState<{ temp?: number; desc?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hardcoded to Paris (lat: 48.85, lon: 2.35) for demo, in reality we'd use current trip's destination
    fetch('https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current=temperature_2m,weather_code')
      .then(res => res.json())
      .then(data => {
        setWeather({
          temp: data.current?.temperature_2m,
          desc: data.current?.weather_code !== undefined ? `Code: ${data.current.weather_code}` : 'Clear',
        });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <GlassCard style={{ padding: 16 }}>
      <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.ink, marginBottom: 8 }}>Destination Weather</Text>
      {loading ? (
        <ActivityIndicator color={m.ink} />
      ) : weather ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="partly-sunny-outline" size={32} color={m.ink} />
          <View>
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: 24, color: m.ink }}>{weather.temp}°C</Text>
            <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: m.muted }}>{weather.desc} (Paris)</Text>
          </View>
        </View>
      ) : (
        <Text style={{ fontFamily: fontFamily.regular, color: m.muted }}>Weather unavailable</Text>
      )}
    </GlassCard>
  );
}

// Dual time zone clock implementation
function TimeZoneClock() {
  const { m } = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const homeTime = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  // Hardcoded offset for demo, in reality use destination timezone offset
  const destTimeObj = new Date(time.getTime() + 6 * 60 * 60 * 1000);
  const destTime = destTimeObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <GlassCard style={{ padding: 16 }}>
      <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.ink, marginBottom: 12 }}>Time Zones</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.medium, fontSize: 13, color: m.muted }}>Home</Text>
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 22, color: m.ink }}>{homeTime}</Text>
        </View>
        <Ionicons name="swap-horizontal-outline" size={24} color={m.faint} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.medium, fontSize: 13, color: m.muted }}>Destination (+6h)</Text>
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 22, color: m.ink }}>{destTime}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

// Quick offline currency converter implementation
function CurrencyConverter() {
  const { m } = useTheme();
  const [amount, setAmount] = useState('100');
  const [base, setBase] = useState('EUR');
  const [target, setTarget] = useState('USD');
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1, USD: 1.08, GBP: 0.85, JPY: 160.5 });

  useEffect(() => {
    getExchangeRates().then(data => {
      if (data && Object.keys(data).length > 0) {
        setRates(data.rates);
      }
    }).catch(() => {}); // Fallback to hardcoded demo rates if offline and cache is empty
  }, []);

  const parsed = parseFloat(amount) || 0;
  const baseRate = rates[base] || 1;
  const targetRate = rates[target] || 1;
  const result = (parsed / baseRate) * targetRate;

  return (
    <GlassCard style={{ padding: 16 }}>
      <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.ink, marginBottom: 12 }}>Currency Converter</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: m.ic, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ fontFamily: fontFamily.medium, fontSize: 12, color: m.muted }}>{base}</Text>
          <TextInput
            style={{ fontFamily: fontFamily.semibold, fontSize: 18, color: m.ink, padding: 0 }}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        </View>
        <Ionicons name="arrow-forward-outline" size={20} color={m.faint} />
        <View style={{ flex: 1, backgroundColor: m.ic, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ fontFamily: fontFamily.medium, fontSize: 12, color: m.muted }}>{target}</Text>
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 18, color: m.ink }}>{result.toFixed(2)}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

export function ToolkitScreen({ navigation }: Props) {
  const { m } = useTheme();
  const insets = useSafeAreaInsets();

  const top = insets.top + 12;

  return (
    <View style={{ flex: 1, backgroundColor: m.bg }}>
      <View style={{ position: 'absolute', top, left: 16, right: 16, height: 40, flexDirection: 'row', alignItems: 'center', zIndex: 10 }}>
        <IconButton label="Back" onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={19} color={m.ink} />
        </IconButton>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 16, color: m.ink }}>Traveler Toolkit</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingTop: top + 64,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 16,
          gap: 16,
        }}
      >
        <WeatherCard />
        <TimeZoneClock />
        <CurrencyConverter />
      </ScrollView>
    </View>
  );
}
