import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Day, Place } from '@trek/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../i18n/TranslationContext';
import type { AppStackParamList } from '../../navigation/types';
import { pointsForMap } from '../../map/points';
import { TripMap } from '../../map/TripMap';
import { dayRepo } from '../../repo/dayRepo';
import { placeRepo } from '../../repo/placeRepo';
import { useTripStore } from '../../store/tripStore';
import { fontFamily, useTheme } from '../../theme';
import { DockSlot, GlassCard, GlassDock, IconButton, ScreenBackground, Sheet } from '../../ui/chrome';
import { dayChipLabel } from '../Dashboard/dashboardModel';
import { TripPanel } from './TripPanels';

type Props = NativeStackScreenProps<AppStackParamList, 'Trip'>;
type TripTab = 'plan' | 'transports' | 'buchungen' | 'finanzplan' | 'listen' | 'dateien' | 'collab';
type TravelMode = 'go' | 'edit' | 'browse';

const DOCK: { id: TripTab; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { id: 'plan', icon: 'map-outline', labelKey: 'trip.mobilePlan' },
  { id: 'transports', icon: 'train-outline', labelKey: 'transport.title' },
  { id: 'buchungen', icon: 'ticket-outline', labelKey: 'reservations.title' },
  { id: 'finanzplan', icon: 'wallet-outline', labelKey: 'budget.title' },
  { id: 'listen', icon: 'checkbox-outline', labelKey: 'packing.title' },
];

const MORE: { id: TripTab; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { id: 'dateien', icon: 'folder-outline', labelKey: 'files.title' },
  { id: 'collab', icon: 'chatbubble-outline', labelKey: 'collab.tabs.chat' },
];

export function TripScreen({ navigation, route }: Props) {
  const { tripId, title } = route.params;
  const { t, locale } = useTranslation();
  const { m } = useTheme();
  const insets = useSafeAreaInsets();
  const trip = useTripStore((state) => state.trips.find((item) => item.id === tripId));
  const [days, setDays] = useState<Day[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TripTab>('plan');
  const [mode, setMode] = useState<TravelMode>('go');
  const [mapFront, setMapFront] = useState(false);
  const [dayId, setDayId] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dayList, placeList] = await Promise.all([dayRepo.list(tripId), placeRepo.list(tripId)]);
        if (cancelled) return;
        setDays(dayList);
        setPlaces(placeList);
        setDayId(dayList[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('dashboard.loadErrorBanner'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId, t]);

  const selected = days.find((day) => day.id === dayId) ?? days[0] ?? null;
  const mapPoints = pointsForMap(selected, places);
  const showChips = tab === 'plan' && mode !== 'browse' && days.length > 0;
  const top = insets.top + 12;

  return (
    <View style={{ flex: 1, backgroundColor: m.bg }}>
      {mapFront && tab === 'plan' && !loading && !error ? <TripMap points={mapPoints} /> : <ScreenBackground />}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={m.ink} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontFamily: fontFamily.regular, color: m.danger, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : tab === 'plan' && mode === 'browse' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: top + 64, paddingBottom: insets.bottom + 110, paddingHorizontal: 16, gap: 8 }}>
          {places.length === 0 ? (
            <Text style={{ fontFamily: fontFamily.regular, color: m.muted, textAlign: 'center', marginTop: 24 }}>{t('places.noneFound')}</Text>
          ) : (
            places.map((place) => (
              <GlassCard key={place.id} style={{ paddingHorizontal: 14, paddingVertical: 14, gap: 4 }}>
                <Text style={{ fontFamily: fontFamily.semibold, fontSize: 15, color: m.ink }}>{place.name}</Text>
                {place.address ? <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted }}>{place.address}</Text> : null}
              </GlassCard>
            ))
          )}
        </ScrollView>
      ) : tab === 'plan' && !mapFront ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: top + (showChips ? 108 : 64), paddingBottom: insets.bottom + 110, paddingHorizontal: 16, gap: 12 }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 28, color: m.ink }} numberOfLines={2}>
            {trip?.title || title}
          </Text>
          {trip?.description ? <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: m.muted }}>{trip.description}</Text> : null}
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 16, color: m.ink }}>
            {selected?.title || t('planner.dayN', { n: selected?.day_number ?? 1 })}
          </Text>
          <GlassCard style={{ padding: 14, gap: 12 }}>
            {(selected?.assignments ?? []).length === 0 ? (
              <Text style={{ fontFamily: fontFamily.regular, color: m.muted }}>{t('planner.noPlacesForDay')}</Text>
            ) : (
              [...(selected?.assignments ?? [])]
                .sort((a, b) => a.order_index - b.order_index)
                .map((assignment, index) => (
                  <View key={assignment.id} style={{ flexDirection: 'row', gap: 12 }}>
                    <Text style={{ width: 22, fontFamily: fontFamily.bold, color: m.faint }}>{index + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fontFamily.semibold, fontSize: 15, color: m.ink }}>{assignment.place.name}</Text>
                      {assignment.place.address ? <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted, marginTop: 2 }}>{assignment.place.address}</Text> : null}
                    </View>
                  </View>
                ))
            )}
          </GlassCard>
        </ScrollView>
      ) : tab !== 'plan' ? (
        <TripPanel tripId={tripId} tab={tab} top={top} bottom={insets.bottom + 110} />
      ) : null}

      {showChips ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ position: 'absolute', top: top + 50, left: 16, right: 16, maxHeight: 40 }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            gap: 2,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: m.glassBorder,
            backgroundColor: m.glass,
            padding: 3,
          }}
        >
          {days.map((day, index) => {
            const active = day.id === (selected?.id ?? null);
            return (
              <Pressable
                key={day.id}
                onPress={() => setDayId(day.id)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  backgroundColor: active ? m.act : 'transparent',
                }}
              >
                <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: active ? m.actFg : m.ink }}>
                  {dayChipLabel(day.date, t('planner.dayN', { n: day.day_number ?? index + 1 }), locale)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={{ position: 'absolute', top, left: 16, right: 16, height: 40, flexDirection: 'row', alignItems: 'center' }}>
        <IconButton label={t('common.back')} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={19} color={m.ink} />
        </IconButton>
        <View style={{ flex: 1, alignItems: 'center' }}>
          {tab === 'plan' ? (
            <View style={{ flexDirection: 'row', borderRadius: 999, borderWidth: 1, borderColor: m.glassBorder, backgroundColor: m.glass, padding: 3 }}>
              {(
                [
                  ['go', t('mobileTrip.travel')],
                  ['edit', t('trip.mobilePlan')],
                  ['browse', t('trip.mobilePlaces')],
                ] as const
              ).map(([value, label]) => {
                const active = mode === value && !mapFront;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setMode(value);
                      setMapFront(false);
                    }}
                    style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: active ? m.act : 'transparent' }}
                  >
                    <Text style={{ fontFamily: active ? fontFamily.semibold : fontFamily.medium, fontSize: 13, color: active ? m.actFg : m.ink }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={{ borderRadius: 999, borderWidth: 1, borderColor: m.glassBorder, backgroundColor: m.glass, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.ink }} numberOfLines={1}>
                {t([...DOCK, ...MORE].find((item) => item.id === tab)?.labelKey ?? 'trip.mobilePlan')}
              </Text>
            </View>
          )}
        </View>
        {tab === 'plan' ? (
          <IconButton label={mapFront ? t('mobileTrip.listView') : t('mobileTrip.mapView')} onPress={() => setMapFront((value) => !value)}>
            <Ionicons name={mapFront ? 'list-outline' : 'map-outline'} size={18} color={m.ink} />
          </IconButton>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <GlassDock>
        {DOCK.map((item) => (
          <DockSlot
            key={item.id}
            label={t(item.labelKey)}
            icon={item.icon}
            active={tab === item.id}
            onPress={() => {
              setTab(item.id);
              if (item.id !== 'plan') setMapFront(false);
            }}
          />
        ))}
        <DockSlot
          label={t('mobileTrip.more')}
          icon="ellipsis-horizontal"
          active={MORE.some((item) => item.id === tab)}
          onPress={() => setMoreOpen(true)}
        />
      </GlassDock>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        {MORE.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              setTab(item.id);
              setMapFront(false);
              setMoreOpen(false);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginHorizontal: 12, marginBottom: 8, borderRadius: 18, backgroundColor: m.ic, paddingHorizontal: 16, paddingVertical: 14 }}
          >
            <Ionicons name={item.icon} size={20} color={m.ink} />
            <Text style={{ flex: 1, fontFamily: fontFamily.bold, fontSize: 15, color: m.ink }}>{t(item.labelKey)}</Text>
            <Ionicons name="chevron-forward" size={17} color={m.faint} />
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}
