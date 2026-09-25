import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { Reservation, ReservationCreateRequest, ReservationUpdateRequest } from '@trek/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { lookupFlight, type FlightLeg } from '../../api/flightLookup';
import { launchDirections } from '../../api/navigation';
import { isActivity, isStay, isTransport, bookingsRepo } from '../../repo/bookingsRepo';
import { useTranslation } from '../../i18n/TranslationContext';
import { fontFamily, useTheme } from '../../theme';
import { GlassCard, Sheet } from '../../ui/chrome';

// ─── Type helpers ─────────────────────────────────────────────────────────────

const BOOKING_TYPES: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'flight', label: 'Flight', icon: 'airplane-outline' },
  { value: 'train', label: 'Train', icon: 'train-outline' },
  { value: 'bus', label: 'Bus', icon: 'bus-outline' },
  { value: 'ferry', label: 'Ferry', icon: 'boat-outline' },
  { value: 'rental_car', label: 'Rental Car', icon: 'car-outline' },
  { value: 'hotel', label: 'Hotel / Stay', icon: 'bed-outline' },
  { value: 'accommodation', label: 'Accommodation', icon: 'home-outline' },
  { value: 'restaurant', label: 'Restaurant', icon: 'restaurant-outline' },
  { value: 'activity', label: 'Activity / Tour', icon: 'ticket-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

function typeIcon(type: string): keyof typeof Ionicons.glyphMap {
  return BOOKING_TYPES.find((t) => t.value === type)?.icon ?? 'receipt-outline';
}

function typeLabel(type: string): string {
  return BOOKING_TYPES.find((t) => t.value === type)?.label ?? type;
}

function formatLocalDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

// ─── Toast notification ───────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2200);
  }

  return { toast, showToast };
}

// ─── Booking Hub Panel ────────────────────────────────────────────────────────

const TABS = [
  { id: 'stays', label: 'Stays', icon: 'bed-outline' as const },
  { id: 'flights', label: 'Transit', icon: 'airplane-outline' as const },
  { id: 'activities', label: 'Activities', icon: 'ticket-outline' as const },
];

export function BookingsPanel({
  tripId,
  top,
  bottom,
}: {
  tripId: number;
  top: number;
  bottom: number;
}) {
  const { m } = useTheme();
  const { toast, showToast } = useToast();
  const [tab, setTab] = useState<'stays' | 'flights' | 'activities'>('flights');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [adding, setAdding] = useState(false);
  const [addType, setAddType] = useState<string>('flight');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await bookingsRepo.list(tripId);
      setReservations(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  const stays = reservations.filter(isStay);
  const transports = reservations.filter(isTransport);
  const activities = reservations.filter(isActivity);
  const tabRows = tab === 'stays' ? stays : tab === 'flights' ? transports : activities;

  function handleCopyCode(code: string) {
    Clipboard.setString(code);
    showToast('Copied to clipboard!');
  }

  function handleDelete(res: Reservation) {
    Alert.alert(
      'Delete Booking',
      `Remove "${res.title}" from your trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await bookingsRepo.delete(tripId, res.id);
            await load();
          },
        },
      ]
    );
  }

  const defaultAddType = tab === 'stays' ? 'hotel' : tab === 'activities' ? 'activity' : 'flight';

  return (
    <View style={{ flex: 1 }}>
      {/* Tab Selector */}
      <View
        style={{
          position: 'absolute',
          top: top + 50,
          left: 16,
          right: 16,
          zIndex: 10,
          flexDirection: 'row',
          backgroundColor: m.glass,
          borderWidth: 1,
          borderColor: m.glassBorder,
          borderRadius: 999,
          padding: 3,
        }}
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id as typeof tab)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active ? m.act : 'transparent',
              }}
            >
              <Ionicons name={t.icon} size={14} color={active ? m.actFg : m.ink} />
              <Text
                style={{
                  fontFamily: active ? fontFamily.bold : fontFamily.medium,
                  fontSize: 13,
                  color: active ? m.actFg : m.ink,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: top + 104,
          paddingBottom: bottom,
          paddingHorizontal: 16,
          gap: 12,
        }}
      >
        {loading ? (
          <ActivityIndicator color={m.ink} style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={{ fontFamily: fontFamily.regular, color: m.danger }}>{error}</Text>
        ) : tabRows.length === 0 ? (
          <BookingEmptyState
            tab={tab}
            onAdd={() => { setAddType(defaultAddType); setAdding(true); }}
          />
        ) : (
          <>
            {tabRows.map((res) =>
              isTransport(res) ? (
                <TransportCard
                  key={res.id}
                  res={res}
                  onCopy={handleCopyCode}
                  onEdit={() => setEditing(res)}
                  onDelete={() => handleDelete(res)}
                />
              ) : isStay(res) ? (
                <StayCard
                  key={res.id}
                  res={res}
                  onCopy={handleCopyCode}
                  onDirections={() =>
                    launchDirections({
                      address: res.location ?? undefined,
                      label: res.title,
                      prompt: true,
                    })
                  }
                  onEdit={() => setEditing(res)}
                  onDelete={() => handleDelete(res)}
                />
              ) : (
                <ActivityCard
                  key={res.id}
                  res={res}
                  onCopy={handleCopyCode}
                  onEdit={() => setEditing(res)}
                  onDelete={() => handleDelete(res)}
                />
              )
            )}
          </>
        )}
      </ScrollView>

      {/* Add button */}
      {!loading && !error ? (
        <Pressable
          onPress={() => { setAddType(defaultAddType); setAdding(true); }}
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

      {/* Toast */}
      {toast ? (
        <View
          style={{
            position: 'absolute',
            bottom: bottom + 12,
            alignSelf: 'center',
            backgroundColor: m.ink,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 20,
          }}
        >
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: m.actFg }}>
            {toast}
          </Text>
        </View>
      ) : null}

      {/* Add Sheet */}
      <BookingFormSheet
        open={adding}
        tripId={tripId}
        reservation={null}
        defaultType={addType}
        onClose={() => setAdding(false)}
        onSave={async (body) => {
          await bookingsRepo.create(tripId, body);
          setAdding(false);
          await load();
        }}
      />

      {/* Edit Sheet */}
      <BookingFormSheet
        open={editing !== null}
        tripId={tripId}
        reservation={editing}
        defaultType={editing?.type ?? 'flight'}
        onClose={() => setEditing(null)}
        onSave={async (body) => {
          if (!editing) return;
          await bookingsRepo.update(tripId, editing.id, body as ReservationUpdateRequest);
          setEditing(null);
          await load();
        }}
      />
    </View>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function CardActions({
  onEdit,
  onDelete,
  copyCode,
  onCopy,
  onDirections,
}: {
  onEdit: () => void;
  onDelete: () => void;
  copyCode?: string | null;
  onCopy?: (code: string) => void;
  onDirections?: () => void;
}) {
  const { m } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      {copyCode && onCopy ? (
        <Pressable
          onPress={() => onCopy(copyCode)}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: m.glass,
            borderRadius: 10,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: m.glassBorder,
          }}
        >
          <Ionicons name="copy-outline" size={14} color={m.ink} />
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.ink }}>
            {copyCode}
          </Text>
        </Pressable>
      ) : null}
      {onDirections ? (
        <Pressable
          onPress={onDirections}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: m.glass,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: m.glassBorder,
          }}
        >
          <Ionicons name="navigate-outline" size={14} color={m.act} />
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.act }}>
            Maps
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={onEdit}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: m.glass,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: m.glassBorder,
        }}
      >
        <Ionicons name="pencil-outline" size={14} color={m.ink} />
      </Pressable>
      <Pressable
        onPress={onDelete}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: m.glass,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: m.danger,
        }}
      >
        <Ionicons name="trash-outline" size={14} color={m.danger} />
      </Pressable>
    </View>
  );
}

/** Boarding-pass style flight/transit card */
function TransportCard({
  res,
  onCopy,
  onEdit,
  onDelete,
}: {
  res: Reservation;
  onCopy: (code: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { m } = useTheme();

  const endpoints = res.endpoints ?? [];
  const from = endpoints.find((e) => e.role === 'from');
  const to = endpoints.find((e) => e.role === 'to');

  const isFlight = res.type === 'flight';
  const metadata = (() => {
    try { return res.metadata ? JSON.parse(res.metadata) : null; } catch { return null; }
  })();
  const legs: Array<{ flight_number?: string; airline?: string; seat?: string }> =
    Array.isArray(metadata?.legs) ? metadata.legs : [];
  const firstLeg = legs[0];

  return (
    <GlassCard style={{ overflow: 'hidden' }}>
      {/* Header strip */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: m.ic,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: m.glassBorder,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: m.glass,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={typeIcon(res.type)} size={16} color={m.act} />
          </View>
          <View>
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: m.ink }}>
              {res.title}
            </Text>
            {firstLeg?.airline ? (
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
                {firstLeg.airline}
                {firstLeg.flight_number ? ` · ${firstLeg.flight_number}` : ''}
              </Text>
            ) : (
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
                {typeLabel(res.type)}
              </Text>
            )}
          </View>
        </View>
        {res.status && res.status !== 'none' ? (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: res.status === 'confirmed' ? '#16a34a22' : m.glass,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.semibold,
                fontSize: 11,
                color: res.status === 'confirmed' ? '#16a34a' : m.muted,
                textTransform: 'capitalize',
              }}
            >
              {res.status}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Boarding pass route */}
      {(from || to) ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 18,
            paddingVertical: 16,
            gap: 0,
          }}
        >
          {/* Departure */}
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 26, color: m.ink, letterSpacing: 1 }}>
              {from?.code ?? from?.name?.slice(0, 3).toUpperCase() ?? '???'}
            </Text>
            <Text style={{ fontFamily: fontFamily.regular, fontSize: 11, color: m.muted }} numberOfLines={1}>
              {from?.name ?? ''}
            </Text>
            {from?.local_time ? (
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.act, marginTop: 4 }}>
                {from.local_time}
              </Text>
            ) : null}
          </View>

          {/* Route line */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: m.glassBorder }} />
              <Ionicons name={isFlight ? 'airplane' : 'swap-horizontal'} size={16} color={m.faint} />
              <View style={{ flex: 1, height: 1, backgroundColor: m.glassBorder }} />
            </View>
          </View>

          {/* Arrival */}
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 26, color: m.ink, letterSpacing: 1 }}>
              {to?.code ?? to?.name?.slice(0, 3).toUpperCase() ?? '???'}
            </Text>
            <Text style={{ fontFamily: fontFamily.regular, fontSize: 11, color: m.muted }} numberOfLines={1}>
              {to?.name ?? ''}
            </Text>
            {to?.local_time ? (
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.act, marginTop: 4 }}>
                {to.local_time}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 14, paddingVertical: 14, gap: 4 }}>
          {res.location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="location-outline" size={13} color={m.muted} />
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted }}>
                {res.location}
              </Text>
            </View>
          ) : null}
          {res.reservation_time ? (
            <Text style={{ fontFamily: fontFamily.medium, fontSize: 13, color: m.ink }}>
              {res.reservation_time}
            </Text>
          ) : null}
        </View>
      )}

      {/* Seat / terminal row */}
      {(firstLeg?.seat || to?.timezone) ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 14,
            paddingHorizontal: 18,
            paddingBottom: 12,
          }}
        >
          {firstLeg?.seat ? (
            <View>
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 10, color: m.muted, textTransform: 'uppercase' }}>Seat</Text>
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 14, color: m.ink }}>{firstLeg.seat}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Divider */}
      <View
        style={{
          height: 1,
          marginHorizontal: 14,
          backgroundColor: m.glassBorder,
          borderStyle: 'dashed',
        }}
      />

      {/* Actions */}
      <View style={{ paddingHorizontal: 14, paddingBottom: 12, paddingTop: 8 }}>
        <CardActions
          onEdit={onEdit}
          onDelete={onDelete}
          copyCode={res.confirmation_number}
          onCopy={onCopy}
        />
      </View>
    </GlassCard>
  );
}

/** Hotel / Stay card with check-in/out dates */
function StayCard({
  res,
  onCopy,
  onDirections,
  onEdit,
  onDelete,
}: {
  res: Reservation;
  onCopy: (code: string) => void;
  onDirections: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { m } = useTheme();
  const checkin = res.reservation_time;
  const checkout = res.reservation_end_time;

  return (
    <GlassCard style={{ overflow: 'hidden' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 14,
          borderBottomWidth: 1,
          borderBottomColor: m.glassBorder,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: m.glass,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="bed-outline" size={20} color={m.act} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.ink }}>
            {res.title}
          </Text>
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
            {typeLabel(res.type)}
          </Text>
        </View>
        {res.status && res.status !== 'none' ? (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: res.status === 'confirmed' ? '#16a34a22' : m.glass,
            }}
          >
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: 11, color: res.status === 'confirmed' ? '#16a34a' : m.muted, textTransform: 'capitalize' }}>
              {res.status}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Check-in / check-out */}
      {(checkin || checkout) ? (
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 14,
            paddingVertical: 14,
            gap: 16,
          }}
        >
          {checkin ? (
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 10, color: m.muted, textTransform: 'uppercase', marginBottom: 3 }}>
                Check-in
              </Text>
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: m.ink }}>
                {formatLocalDate(checkin)}
              </Text>
            </View>
          ) : null}
          {checkout ? (
            <>
              <View style={{ width: 1, backgroundColor: m.glassBorder }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fontFamily.regular, fontSize: 10, color: m.muted, textTransform: 'uppercase', marginBottom: 3 }}>
                  Check-out
                </Text>
                <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: m.ink }}>
                  {formatLocalDate(checkout)}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {res.location ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingBottom: checkin || checkout ? 0 : 10,
          }}
        >
          <Ionicons name="location-outline" size={13} color={m.muted} />
          <Text style={{ flex: 1, fontFamily: fontFamily.regular, fontSize: 13, color: m.muted }} numberOfLines={1}>
            {res.location}
          </Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={{ paddingHorizontal: 14, paddingBottom: 12, paddingTop: 10 }}>
        <CardActions
          onEdit={onEdit}
          onDelete={onDelete}
          copyCode={res.confirmation_number}
          onCopy={onCopy}
          onDirections={res.location ? onDirections : undefined}
        />
      </View>
    </GlassCard>
  );
}

/** Activity / restaurant / event card */
function ActivityCard({
  res,
  onCopy,
  onEdit,
  onDelete,
}: {
  res: Reservation;
  onCopy: (code: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { m } = useTheme();
  return (
    <GlassCard style={{ padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: m.glass,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={typeIcon(res.type)} size={17} color={m.act} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: m.ink }}>
            {res.title}
          </Text>
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
            {typeLabel(res.type)}{res.location ? ` · ${res.location}` : ''}
          </Text>
        </View>
      </View>

      {(res.reservation_time || res.notes) ? (
        <View style={{ gap: 4 }}>
          {res.reservation_time ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time-outline" size={13} color={m.muted} />
              <Text style={{ fontFamily: fontFamily.medium, fontSize: 13, color: m.ink }}>
                {res.reservation_time}
              </Text>
            </View>
          ) : null}
          {res.notes ? (
            <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted }} numberOfLines={2}>
              {res.notes}
            </Text>
          ) : null}
        </View>
      ) : null}

      <CardActions
        onEdit={onEdit}
        onDelete={onDelete}
        copyCode={res.confirmation_number}
        onCopy={onCopy}
      />
    </GlassCard>
  );
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function BookingEmptyState({
  tab,
  onAdd,
}: {
  tab: 'stays' | 'flights' | 'activities';
  onAdd: () => void;
}) {
  const { m } = useTheme();
  const icon = tab === 'stays' ? 'bed-outline' : tab === 'flights' ? 'airplane-outline' : 'ticket-outline';
  const title =
    tab === 'stays'
      ? 'No accommodation booked'
      : tab === 'flights'
      ? 'No flights or transit'
      : 'No activities planned';
  const desc =
    tab === 'stays'
      ? 'Add hotels, Airbnbs, or any place you\'ll be staying.'
      : tab === 'flights'
      ? 'Add flights, trains, ferries, or rental cars.'
      : 'Add tours, restaurants, events, or anything ticketed.';

  return (
    <GlassCard style={{ padding: 32, alignItems: 'center', gap: 14 }}>
      <Ionicons name={icon} size={44} color={m.faint} />
      <View style={{ gap: 6, alignItems: 'center' }}>
        <Text style={{ fontFamily: fontFamily.bold, fontSize: 17, color: m.ink, textAlign: 'center' }}>
          {title}
        </Text>
        <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: m.muted, textAlign: 'center' }}>
          {desc}
        </Text>
      </View>
      <Pressable
        onPress={onAdd}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: m.act,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 999,
        }}
      >
        <Ionicons name="add" size={16} color={m.actFg} />
        <Text style={{ fontFamily: fontFamily.bold, fontSize: 14, color: m.actFg }}>
          Add Booking
        </Text>
      </Pressable>
    </GlassCard>
  );
}

// ─── Add / Edit Booking Sheet ─────────────────────────────────────────────────

function BookingFormSheet({
  open,
  tripId,
  reservation,
  defaultType,
  onClose,
  onSave,
}: {
  open: boolean;
  tripId: number;
  reservation: Reservation | null;
  defaultType: string;
  onClose: () => void;
  onSave: (body: ReservationCreateRequest) => Promise<void>;
}) {
  const { m } = useTheme();
  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [flightInfo, setFlightInfo] = useState<FlightLeg | null>(null);

  // Date picker state
  const [checkinDate, setCheckinDate] = useState<Date | null>(null);
  const [checkoutDate, setCheckoutDate] = useState<Date | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(reservation?.type ?? defaultType);
    setTitle(reservation?.title ?? '');
    setLocation(reservation?.location ?? '');
    setConfirmation(reservation?.confirmation_number ?? '');
    setNotes(reservation?.notes ?? '');
    setUrl(reservation?.url ?? '');
    setFlightNumber('');
    setFlightInfo(null);
    setCheckinDate(
      reservation?.reservation_time ? new Date(reservation.reservation_time) : null
    );
    setCheckoutDate(
      reservation?.reservation_end_time ? new Date(reservation.reservation_end_time) : null
    );
    setError(null);
    setSaving(false);
    setShowTypePicker(false);
  }, [open, reservation, defaultType]);

  async function handleFlightLookup() {
    if (!flightNumber.trim()) return;
    setLookingUp(true);
    const info = await lookupFlight(flightNumber.trim());
    setFlightInfo(info);
    setLookingUp(false);
    if (!title && info.flightNumber) setTitle(`Flight ${info.flightNumber}`);
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const body: ReservationCreateRequest = {
        title: title.trim(),
        type,
        location: location.trim() || undefined,
        confirmation_number: confirmation.trim() || undefined,
        notes: notes.trim() || undefined,
        url: url.trim() || undefined,
        reservation_time: checkinDate ? checkinDate.toISOString() : undefined,
        reservation_end_time: checkoutDate ? checkoutDate.toISOString() : undefined,
      };

      // Attach flight endpoints if looked up
      if (flightInfo?.from && flightInfo?.to) {
        (body as Record<string, unknown>).endpoints = [
          { role: 'from', name: flightInfo.fromName ?? flightInfo.from, code: flightInfo.from, lat: 0, lng: 0, sequence: 0, local_time: flightInfo.departureTime },
          { role: 'to', name: flightInfo.toName ?? flightInfo.to, code: flightInfo.to, lat: 0, lng: 0, sequence: 1, local_time: flightInfo.arrivalTime },
        ];
      }

      await onSave(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }

  const isFlight = type === 'flight' || type === 'train' || type === 'ferry' || type === 'bus';
  const isStayType = type === 'hotel' || type === 'accommodation' || type === 'airbnb' || type === 'hostel' || type === 'stay';

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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 18, color: m.ink }}>
            {reservation ? 'Edit Booking' : 'Add Booking'}
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={24} color={m.muted} />
          </Pressable>
        </View>

        {/* Type Picker */}
        <View>
          <Text style={labelStyle}>Booking Type</Text>
          <Pressable
            onPress={() => setShowTypePicker((v) => !v)}
            style={{
              ...inputStyle,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={typeIcon(type)} size={16} color={m.act} />
              <Text style={{ fontFamily: fontFamily.medium, fontSize: 14, color: m.ink }}>
                {typeLabel(type)}
              </Text>
            </View>
            <Ionicons name={showTypePicker ? 'chevron-up' : 'chevron-down'} size={16} color={m.muted} />
          </Pressable>

          {showTypePicker ? (
            <View
              style={{
                marginTop: 6,
                borderRadius: 12,
                backgroundColor: m.ic,
                borderWidth: 1,
                borderColor: m.glassBorder,
                overflow: 'hidden',
              }}
            >
              {BOOKING_TYPES.map((bt) => (
                <Pressable
                  key={bt.value}
                  onPress={() => { setType(bt.value); setShowTypePicker(false); }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    backgroundColor: pressed ? m.glass : type === bt.value ? m.glass : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: m.glassBorder,
                  })}
                >
                  <Ionicons name={bt.icon} size={16} color={type === bt.value ? m.act : m.muted} />
                  <Text
                    style={{
                      fontFamily: type === bt.value ? fontFamily.bold : fontFamily.regular,
                      fontSize: 14,
                      color: type === bt.value ? m.act : m.ink,
                    }}
                  >
                    {bt.label}
                  </Text>
                  {type === bt.value ? <Ionicons name="checkmark" size={14} color={m.act} style={{ marginLeft: 'auto' }} /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* Flight number lookup row */}
        {isFlight ? (
          <View>
            <Text style={labelStyle}>Flight / Train Number</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={flightNumber}
                onChangeText={setFlightNumber}
                placeholder="e.g. BA117, TGV9854"
                placeholderTextColor={m.faint}
                autoCapitalize="characters"
                style={{ ...inputStyle, flex: 1 }}
              />
              <Pressable
                onPress={handleFlightLookup}
                disabled={lookingUp || !flightNumber.trim()}
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: m.act,
                  opacity: !flightNumber.trim() ? 0.4 : 1,
                }}
              >
                {lookingUp ? (
                  <ActivityIndicator size="small" color={m.actFg} />
                ) : (
                  <Text style={{ fontFamily: fontFamily.bold, fontSize: 13, color: m.actFg }}>
                    Look up
                  </Text>
                )}
              </Pressable>
            </View>
            {flightInfo ? (
              <View
                style={{
                  marginTop: 8,
                  backgroundColor: m.glass,
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: m.glassBorder,
                  gap: 4,
                }}
              >
                <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.ink }}>
                  {flightInfo.from ?? '?'} → {flightInfo.to ?? '?'}
                  {flightInfo.departureTime ? ` · Dep ${flightInfo.departureTime}` : ''}
                  {flightInfo.arrivalTime ? ` · Arr ${flightInfo.arrivalTime}` : ''}
                </Text>
                {flightInfo.airline ? (
                  <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
                    {flightInfo.airline}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Title */}
        <View>
          <Text style={labelStyle}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Flight to Tokyo, Park Hyatt Tokyo"
            placeholderTextColor={m.faint}
            style={inputStyle}
          />
        </View>

        {/* Location */}
        <View>
          <Text style={labelStyle}>Location / Address</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Hotel address or airport"
            placeholderTextColor={m.faint}
            style={inputStyle}
          />
        </View>

        {/* Date pickers for stays */}
        {isStayType ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Check-in</Text>
              <Pressable onPress={() => setShowCheckin(true)} style={inputStyle}>
                <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: checkinDate ? m.ink : m.faint }}>
                  {checkinDate ? formatLocalDate(checkinDate.toISOString()) : 'Select date'}
                </Text>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Check-out</Text>
              <Pressable onPress={() => setShowCheckout(true)} style={inputStyle}>
                <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: checkoutDate ? m.ink : m.faint }}>
                  {checkoutDate ? formatLocalDate(checkoutDate.toISOString()) : 'Select date'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {showCheckin ? (
          <DateTimePicker
            value={checkinDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => { setShowCheckin(false); if (date) setCheckinDate(date); }}
          />
        ) : null}
        {showCheckout ? (
          <DateTimePicker
            value={checkoutDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => { setShowCheckout(false); if (date) setCheckoutDate(date); }}
          />
        ) : null}

        {/* Confirmation Number */}
        <View>
          <Text style={labelStyle}>Confirmation / PNR</Text>
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="e.g. XYZABC, 1234567890"
            placeholderTextColor={m.faint}
            autoCapitalize="characters"
            style={inputStyle}
          />
        </View>

        {/* Booking URL */}
        <View>
          <Text style={labelStyle}>Booking URL</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            placeholderTextColor={m.faint}
            autoCapitalize="none"
            keyboardType="url"
            style={inputStyle}
          />
        </View>

        {/* Notes */}
        <View>
          <Text style={labelStyle}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Seat numbers, special requests, access info..."
            placeholderTextColor={m.faint}
            style={{ ...inputStyle, minHeight: 70, textAlignVertical: 'top' }}
          />
        </View>

        {error ? (
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.danger }}>{error}</Text>
        ) : null}

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: m.act,
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          {saving ? (
            <ActivityIndicator color={m.actFg} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.actFg }}>
              {reservation ? 'Save Changes' : 'Add Booking'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}
