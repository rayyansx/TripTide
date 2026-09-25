import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Assignment, Day, Place } from '@trek/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRoute, type MultiStopRouteResult, type TravelMode as RouteMode } from '../../api/routing';
import type { SearchResultPlace } from '../../api/placeSearch';
import { useTranslation } from '../../i18n/TranslationContext';
import type { AppStackParamList } from '../../navigation/types';
import { pointsForMap } from '../../map/points';
import { TripMap } from '../../map/TripMap';
import { assignmentRepo } from '../../repo/assignmentRepo';
import { dayRepo } from '../../repo/dayRepo';
import { placeRepo } from '../../repo/placeRepo';
import { useTripStore } from '../../store/tripStore';
import { fontFamily, useTheme } from '../../theme';
import { DockSlot, GlassCard, GlassDock, IconButton, ScreenBackground, Sheet } from '../../ui/chrome';
import { dayChipLabel } from '../Dashboard/dashboardModel';
import { PlaceSearchSheet } from './PlaceSearchSheet';
import { StopDetailSheet } from './StopDetailSheet';
import { TripPanel } from './TripPanels';
import { BookingsPanel } from './BookingsPanel';
import { BudgetPanel } from './BudgetPanel';

type Props = NativeStackScreenProps<AppStackParamList, 'Trip'>;
type TripTab = 'plan' | 'transports' | 'buchungen' | 'finanzplan' | 'listen' | 'dateien' | 'collab';
type TravelViewMode = 'go' | 'edit' | 'browse';

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
  const [mode, setMode] = useState<TravelViewMode>('go');
  const [mapFront, setMapFront] = useState(false);
  const [dayId, setDayId] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  // Sprint 1 Sheets & Routing state
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [travelMode, setTravelMode] = useState<RouteMode>('driving');
  const [routeResult, setRouteResult] = useState<MultiStopRouteResult | null>(null);

  const reloadDays = useCallback(async () => {
    try {
      const [dayList, placeList] = await Promise.all([
        dayRepo.list(tripId),
        placeRepo.list(tripId),
      ]);
      setDays(dayList);
      setPlaces(placeList);
      if (!dayId && dayList.length > 0) {
        setDayId(dayList[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.loadErrorBanner'));
    }
  }, [tripId, dayId, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dayList, placeList] = await Promise.all([
          dayRepo.list(tripId),
          placeRepo.list(tripId),
        ]);
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
  const assignments = [...(selected?.assignments ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  // Calculate routes between consecutive stops on the selected day
  useEffect(() => {
    let cancelled = false;
    const coords = assignments
      .filter((a) => a.place.lat != null && a.place.lng != null)
      .map((a) => ({ latitude: a.place.lat!, longitude: a.place.lng! }));

    if (coords.length < 2) {
      setRouteResult(null);
      return;
    }

    getRoute(coords, travelMode)
      .then((res) => {
        if (!cancelled) setRouteResult(res);
      })
      .catch(() => {
        if (!cancelled) setRouteResult(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.assignments, travelMode]);

  const mapPoints = pointsForMap(selected, places);
  const showChips = tab === 'plan' && mode !== 'browse' && days.length > 0;
  const top = insets.top + 12;

function getCategoryLabel(category: unknown): string | null {
  if (!category) return null;
  if (typeof category === 'string') return category.replace(/_/g, ' ');
  if (typeof category === 'object' && 'name' in category && typeof (category as { name: unknown }).name === 'string') {
    return (category as { name: string }).name.replace(/_/g, ' ');
  }
  return null;
}

  // Stop & Day handlers
  async function handleAddPlace(placeResult: SearchResultPlace) {
    if (!selected) return;
    let place = places.find(
      (p) =>
        p.name.toLowerCase() === placeResult.name.toLowerCase() ||
        (placeResult.latitude && p.lat === placeResult.latitude && p.lng === placeResult.longitude)
    );
    if (!place) {
      place = await placeRepo.create(tripId, {
        name: placeResult.name,
        address: placeResult.address,
        lat: placeResult.latitude,
        lng: placeResult.longitude,
        category: placeResult.category,
      });
    }

    await assignmentRepo.create(tripId, selected.id, {
      place_id: place.id,
    });
    await reloadDays();
  }

  async function handleAddDay() {
    try {
      const nextNum = days.length + 1;
      const newDay = await dayRepo.create(tripId, { position: nextNum });
      setDays((prev) => [...prev, newDay]);
      setDayId(newDay.id);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not add day');
    }
  }

  async function handleSaveStop(params: { title: string; notes: string | null; time: string | null }) {
    if (!activeAssignment) return;
    const promises: Promise<unknown>[] = [];
    if (params.title && params.title !== activeAssignment.place.name) {
      promises.push(placeRepo.update(tripId, activeAssignment.place.id, { name: params.title }));
    }
    promises.push(
      assignmentRepo.setTimes(tripId, activeAssignment.id, {
        place_time: params.time ?? undefined,
      })
    );
    promises.push(assignmentRepo.setNotes(tripId, activeAssignment.id, params.notes));

    await Promise.all(promises);
    await reloadDays();
  }

  async function handleMoveToDay(targetDayId: number) {
    if (!activeAssignment) return;
    const targetDay = days.find((d) => d.id === targetDayId);
    const targetCount = targetDay?.assignments?.length ?? 0;
    await assignmentRepo.move(tripId, activeAssignment.id, {
      new_day_id: targetDayId,
      order_index: targetCount,
    });
    await reloadDays();
  }

  async function handleMoveUp(assignment: Assignment) {
    if (!selected) return;
    const list = [...assignments];
    const idx = list.findIndex((a) => a.id === assignment.id);
    if (idx <= 0) return;
    const prev = list[idx - 1];
    list[idx - 1] = assignment;
    list[idx] = prev;
    const orderedIds = list.map((a) => a.id);
    await assignmentRepo.reorder(tripId, selected.id, orderedIds);
    await reloadDays();
  }

  async function handleMoveDown(assignment: Assignment) {
    if (!selected) return;
    const list = [...assignments];
    const idx = list.findIndex((a) => a.id === assignment.id);
    if (idx < 0 || idx >= list.length - 1) return;
    const next = list[idx + 1];
    list[idx + 1] = assignment;
    list[idx] = next;
    const orderedIds = list.map((a) => a.id);
    await assignmentRepo.reorder(tripId, selected.id, orderedIds);
    await reloadDays();
  }

  async function handleDeleteStop(assignment: Assignment) {
    if (!selected) return;
    await assignmentRepo.delete(tripId, selected.id, assignment.id);
    await reloadDays();
  }

  return (
    <View style={{ flex: 1, backgroundColor: m.bg }}>
      {mapFront && tab === 'plan' && !loading && !error ? (
        <TripMap points={mapPoints} routeCoordinates={routeResult?.fullPolyline} />
      ) : (
        <ScreenBackground />
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={m.ink} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontFamily: fontFamily.regular, color: m.danger, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : tab === 'plan' && mode === 'browse' ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: top + 64,
            paddingBottom: insets.bottom + 110,
            paddingHorizontal: 16,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 20, color: m.ink }}>
              Saved Places ({places.length})
            </Text>
            <Pressable
              onPress={() => setSearchOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: m.act,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
              }}
            >
              <Ionicons name="add" size={16} color={m.actFg} />
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.actFg }}>Add Place</Text>
            </Pressable>
          </View>

          {places.length === 0 ? (
            <Text style={{ fontFamily: fontFamily.regular, color: m.muted, textAlign: 'center', marginTop: 24 }}>
              {t('places.noneFound')}
            </Text>
          ) : (
            places.map((place) => (
              <GlassCard key={place.id} style={{ paddingHorizontal: 14, paddingVertical: 14, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ flex: 1, fontFamily: fontFamily.semibold, fontSize: 15, color: m.ink }}>{place.name}</Text>
                  {getCategoryLabel(place.category) ? (
                    <View style={{ backgroundColor: m.glass, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontFamily: fontFamily.medium, fontSize: 11, color: m.faint, textTransform: 'capitalize' }}>
                        {getCategoryLabel(place.category)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {place.address ? (
                  <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted }}>{place.address}</Text>
                ) : null}
              </GlassCard>
            ))
          )}
        </ScrollView>
      ) : tab === 'plan' && !mapFront ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: top + (showChips ? 108 : 64),
            paddingBottom: insets.bottom + 110,
            paddingHorizontal: 16,
            gap: 14,
          }}
        >
          {/* Trip Header & Day Title */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 28, color: m.ink }} numberOfLines={2}>
              {trip?.title || title}
            </Text>
            {trip?.description ? (
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: m.muted }}>
                {trip.description}
              </Text>
            ) : null}
          </View>

          {/* Day Header with Add Stop action */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <View>
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 18, color: m.ink }}>
                {selected?.title || t('planner.dayN', { n: selected?.day_number ?? 1 })}
              </Text>
              {routeResult?.formattedTotalDuration ? (
                <Text style={{ fontFamily: fontFamily.medium, fontSize: 12, color: m.faint, marginTop: 2 }}>
                  {routeResult.formattedTotalDuration} total travel ({routeResult.formattedTotalDistance})
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => setSearchOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: m.act,
                paddingHorizontal: 13,
                paddingVertical: 7,
                borderRadius: 999,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
              }}
            >
              <Ionicons name="add" size={16} color={m.actFg} />
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 13, color: m.actFg }}>Add Stop</Text>
            </Pressable>
          </View>

          {/* Interactive Day Timeline */}
          {assignments.length === 0 ? (
            <GlassCard style={{ padding: 28, alignItems: 'center', gap: 12 }}>
              <Ionicons name="calendar-outline" size={40} color={m.faint} />
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 16, color: m.ink, textAlign: 'center' }}>
                {t('planner.noPlacesForDay') || 'No stops planned for this day'}
              </Text>
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted, textAlign: 'center' }}>
                Search for landmarks, restaurants, or hotels to build your daily itinerary.
              </Text>
              <Pressable
                onPress={() => setSearchOpen(true)}
                style={{
                  marginTop: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: m.glass,
                  borderWidth: 1,
                  borderColor: m.glassBorder,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 999,
                }}
              >
                <Ionicons name="search" size={15} color={m.act} />
                <Text style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: m.act }}>
                  Find places to add
                </Text>
              </Pressable>
            </GlassCard>
          ) : (
            <View style={{ gap: 0 }}>
              {assignments.map((assignment, index) => {
                const leg = routeResult?.legs[index];
                const hasNext = index < assignments.length - 1;

                return (
                  <View key={assignment.id}>
                    {/* Stop timeline card */}
                    <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                      {/* Timeline column */}
                      <View style={{ width: 36, alignItems: 'center' }}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: m.act,
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.15,
                            shadowRadius: 3,
                          }}
                        >
                          <Text style={{ fontFamily: fontFamily.bold, fontSize: 12, color: m.actFg }}>
                            {index + 1}
                          </Text>
                        </View>
                        {hasNext ? (
                          <View
                            style={{
                              flex: 1,
                              width: 2,
                              backgroundColor: m.glassBorder,
                              marginVertical: 4,
                            }}
                          />
                        ) : null}
                      </View>

                      {/* Card content */}
                      <Pressable
                        onPress={() => setActiveAssignment(assignment)}
                        style={({ pressed }) => ({
                          flex: 1,
                          marginLeft: 10,
                          marginBottom: hasNext ? 0 : 8,
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <GlassCard style={{ padding: 14, gap: 8 }}>
                          {/* Top row: Time pill + Category + Edit handle */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {assignment.assignment_time ? (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                    backgroundColor: m.ic,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Ionicons name="time-outline" size={13} color={m.ink} />
                                  <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.ink }}>
                                    {assignment.assignment_time}
                                  </Text>
                                </View>
                              ) : null}

                              {getCategoryLabel(assignment.place.category) ? (
                                <View
                                  style={{
                                    backgroundColor: m.glass,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: fontFamily.medium,
                                      fontSize: 11,
                                      color: m.faint,
                                      textTransform: 'capitalize',
                                    }}
                                  >
                                    {getCategoryLabel(assignment.place.category)}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Drag / reorder handles */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              <Pressable
                                disabled={index === 0}
                                onPress={() => handleMoveUp(assignment)}
                                hitSlop={6}
                                style={{ opacity: index === 0 ? 0.2 : 0.7, padding: 3 }}
                              >
                                <Ionicons name="chevron-up" size={18} color={m.ink} />
                              </Pressable>
                              <Pressable
                                disabled={index === assignments.length - 1}
                                onPress={() => handleMoveDown(assignment)}
                                hitSlop={6}
                                style={{ opacity: index === assignments.length - 1 ? 0.2 : 0.7, padding: 3 }}
                              >
                                <Ionicons name="chevron-down" size={18} color={m.ink} />
                              </Pressable>
                            </View>
                          </View>

                          {/* Stop Title & Address */}
                          <View style={{ gap: 2 }}>
                            <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.ink }}>
                              {assignment.place.name}
                            </Text>
                            {assignment.place.address ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="location-outline" size={13} color={m.muted} />
                                <Text
                                  style={{ flex: 1, fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}
                                  numberOfLines={1}
                                >
                                  {assignment.place.address}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          {/* Notes Preview if available */}
                          {assignment.notes ? (
                            <View
                              style={{
                                marginTop: 4,
                                backgroundColor: m.ic,
                                borderRadius: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderLeftWidth: 3,
                                borderLeftColor: m.act,
                              }}
                            >
                              <Text
                                style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.ink }}
                                numberOfLines={2}
                              >
                                {assignment.notes}
                              </Text>
                            </View>
                          ) : null}
                        </GlassCard>
                      </Pressable>
                    </View>

                    {/* Between-stops travel time indicator */}
                    {hasNext ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                        <View style={{ width: 36, alignItems: 'center' }}>
                          <View style={{ width: 2, height: 26, backgroundColor: m.glassBorder }} />
                        </View>
                        <Pressable
                          onPress={() =>
                            setTravelMode((prev) => (prev === 'driving' ? 'walking' : 'driving'))
                          }
                          style={{
                            marginLeft: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: m.glass,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: m.glassBorder,
                          }}
                        >
                          <Ionicons
                            name={travelMode === 'walking' ? 'walk-outline' : 'car-outline'}
                            size={14}
                            color={m.act}
                          />
                          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 11, color: m.muted }}>
                            {leg?.formattedDuration
                              ? `${leg.formattedDuration} (${leg.formattedDistance})`
                              : 'Calculating route...'}
                          </Text>
                          <Ionicons name="swap-horizontal" size={12} color={m.faint} />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (tab === 'buchungen' || tab === 'transports') ? (
        <BookingsPanel tripId={tripId} top={top} bottom={insets.bottom + 110} />
      ) : tab === 'finanzplan' ? (
        <BudgetPanel tripId={tripId} initialCurrency={trip?.currency || 'EUR'} top={top} bottom={insets.bottom + 110} />
      ) : tab !== 'plan' ? (
        <TripPanel tripId={tripId} tab={tab} top={top} bottom={insets.bottom + 110} />
      ) : null}

      {/* Day Selector Chips */}
      {showChips ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ position: 'absolute', top: top + 50, left: 16, right: 16, maxHeight: 40 }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            gap: 4,
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
                <Text
                  style={{
                    fontFamily: fontFamily.semibold,
                    fontSize: 12,
                    color: active ? m.actFg : m.ink,
                  }}
                >
                  {dayChipLabel(day.date, t('planner.dayN', { n: day.day_number ?? index + 1 }), locale)}
                </Text>
              </Pressable>
            );
          })}

          {/* Add Day Button */}
          <Pressable
            onPress={handleAddDay}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 6,
              gap: 4,
            }}
          >
            <Ionicons name="add" size={14} color={m.act} />
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.act }}>
              Day
            </Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {/* Top Header Bar */}
      <View
        style={{
          position: 'absolute',
          top,
          left: 16,
          right: 16,
          height: 40,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <IconButton label={t('common.back')} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={19} color={m.ink} />
        </IconButton>
        <View style={{ flex: 1, alignItems: 'center' }}>
          {tab === 'plan' ? (
            <View
              style={{
                flexDirection: 'row',
                borderRadius: 999,
                borderWidth: 1,
                borderColor: m.glassBorder,
                backgroundColor: m.glass,
                padding: 3,
              }}
            >
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
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: active ? m.act : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: active ? fontFamily.semibold : fontFamily.medium,
                        fontSize: 13,
                        color: active ? m.actFg : m.ink,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: m.glassBorder,
                backgroundColor: m.glass,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.ink }} numberOfLines={1}>
                {t([...DOCK, ...MORE].find((item) => item.id === tab)?.labelKey ?? 'trip.mobilePlan')}
              </Text>
            </View>
          )}
        </View>
        {tab === 'plan' ? (
          <IconButton
            label={mapFront ? t('mobileTrip.listView') : t('mobileTrip.mapView')}
            onPress={() => setMapFront((value) => !value)}
          >
            <Ionicons name={mapFront ? 'list-outline' : 'map-outline'} size={18} color={m.ink} />
          </IconButton>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Floating Bottom Dock */}
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

      {/* More Sheet */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        {MORE.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              setTab(item.id);
              setMapFront(false);
              setMoreOpen(false);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 13,
              marginHorizontal: 12,
              marginBottom: 8,
              borderRadius: 18,
              backgroundColor: m.ic,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Ionicons name={item.icon} size={20} color={m.ink} />
            <Text style={{ flex: 1, fontFamily: fontFamily.bold, fontSize: 15, color: m.ink }}>
              {t(item.labelKey)}
            </Text>
            <Ionicons name="chevron-forward" size={17} color={m.faint} />
          </Pressable>
        ))}
      </Sheet>

      {/* Place Search Modal Sheet */}
      <PlaceSearchSheet
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectPlace={handleAddPlace}
      />

      {/* Stop Detail / Editor Sheet */}
      <StopDetailSheet
        open={activeAssignment !== null}
        assignment={activeAssignment}
        days={days}
        currentDayId={selected?.id ?? null}
        isFirst={assignments.findIndex((a) => a.id === activeAssignment?.id) === 0}
        isLast={assignments.findIndex((a) => a.id === activeAssignment?.id) === assignments.length - 1}
        onClose={() => setActiveAssignment(null)}
        onSave={handleSaveStop}
        onMoveToDay={handleMoveToDay}
        onMoveUp={() => (activeAssignment ? handleMoveUp(activeAssignment) : Promise.resolve())}
        onMoveDown={() => (activeAssignment ? handleMoveDown(activeAssignment) : Promise.resolve())}
        onDelete={() => (activeAssignment ? handleDeleteStop(activeAssignment) : Promise.resolve())}
      />
    </View>
  );
}
