import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Trip } from '@trek/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../i18n/TranslationContext';
import type { AppStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useTripStore } from '../../store/tripStore';
import { fontFamily, useTheme } from '../../theme';
import { tripErrorMessage } from '../../api/trips';
import { DockSlot, Fab, GlassCard, GlassDock, IconButton, ScreenBackground, Segmented, Sheet } from '../../ui/chrome';
import { CoverPicker } from '../../ui/CoverSearch';
import { coverGradient } from '../../ui/covers';
import { mediaUrl } from '../../ui/media';
import { daysUntil, getTripStatus, shortDate, splitDashboard, type TripFilter } from './dashboardModel';
import { TripFormSheet } from './TripFormSheet';
import mark from '../../../assets/icon.png';

type Props = NativeStackScreenProps<AppStackParamList, 'Dashboard'>;

type CardAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function DashboardScreen({ navigation }: Props) {
  const { t, locale } = useTranslation();
  const { m } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const preference = useTheme().preference;
  const setPreference = useTheme().setPreference;
  const { trips, status, error, loadTrips, saveTrip, setCover, setArchived, removeTrip, copyTrip } = useTripStore();
  const [filter, setFilter] = useState<TripFilter>('planned');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formTrip, setFormTrip] = useState<Trip | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [coverTrip, setCoverTrip] = useState<Trip | null>(null);
  const [savingCover, setSavingCover] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Trip | null>(null);
  const [pendingCopy, setPendingCopy] = useState<Trip | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const { spotlight, grid } = splitDashboard(trips, filter);
  const showEmpty = filter === 'planned' && !spotlight && grid.length === 0 && status !== 'loading' && status !== 'error';

  function statusLabel(trip: Trip): string {
    if (trip.is_archived) return t('dashboard.archived');
    const tripStatus = getTripStatus(trip);
    const until = daysUntil(trip.start_date);
    if (tripStatus === 'ongoing') return t('dashboard.mobile.liveNow');
    if (tripStatus === 'today') return t('dashboard.status.today');
    if (tripStatus === 'tomorrow') return t('dashboard.status.tomorrow');
    if (tripStatus === 'future' && until !== null) {
      return until > 60 ? t('dashboard.mobile.inMonths', { count: Math.round(until / 30) }) : t('dashboard.mobile.inDays', { count: until });
    }
    if (tripStatus === 'past') return t('dashboard.mobile.completed');
    return t('dashboard.card.idea');
  }

  function openTrip(trip: Trip) {
    navigation.navigate('Trip', { tripId: trip.id, title: trip.title });
  }

  function openCreate() {
    setFormTrip(null);
    setFormOpen(true);
  }

  function openEdit(trip: Trip) {
    setFormTrip(trip);
    setFormOpen(true);
  }

  function actionsFor(trip: Trip, layout: 'grid' | 'list'): CardAction[] {
    const cover: CardAction = { key: 'cover', label: t('dashboard.searchUnsplash'), icon: 'image-outline', onPress: () => setCoverTrip(trip) };
    const copy: CardAction = {
      key: 'copy',
      label: t('dashboard.aria.duplicate'),
      icon: 'copy-outline',
      onPress: () => setPendingCopy(trip),
    };
    const remove: CardAction = { key: 'delete', label: t('common.delete'), icon: 'trash-outline', onPress: () => setPendingDelete(trip) };
    if (filter === 'archive') {
      return [
        cover,
        copy,
        { key: 'restore', label: t('dashboard.restore'), icon: 'archive-outline', onPress: () => runAction(() => setArchived(trip.id, false), t('dashboard.toast.restoreError')) },
        remove,
      ];
    }
    const actions: CardAction[] = [
      cover,
      { key: 'edit', label: t('common.edit'), icon: 'pencil-outline', onPress: () => openEdit(trip) },
      copy,
    ];
    if (layout === 'list') {
      actions.push({
        key: 'archive',
        label: t('dashboard.archive'),
        icon: 'archive-outline',
        onPress: () => runAction(() => setArchived(trip.id, true), t('dashboard.toast.archiveError')),
      });
    }
    actions.push(remove);
    return actions;
  }

  async function runAction(work: () => Promise<void>, fallback: string) {
    setActionError(null);
    try {
      await work();
    } catch (err) {
      setActionError(tripErrorMessage(err, fallback));
    }
  }

  async function submitForm(body: Parameters<typeof saveTrip>[1], coverUrl: string | null) {
    const editing = formTrip;
    try {
      const trip = await saveTrip(editing, body, coverUrl);
      setFormOpen(false);
      setFormTrip(null);
      if (!editing) navigation.navigate('Trip', { tripId: trip.id, title: trip.title });
    } catch (err) {
      throw new Error(tripErrorMessage(err, editing ? t('dashboard.toast.updateError') : t('dashboard.toast.createError')));
    }
  }

  const nextMode = preference === 'dark' ? 'light' : preference === 'light' ? 'auto' : 'dark';
  const modeIcon = preference === 'dark' ? 'moon-outline' : preference === 'light' ? 'sunny-outline' : 'contrast-outline';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting.morning') : hour < 18 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening');

  return (
    <View style={{ flex: 1, backgroundColor: m.bg }}>
      <ScreenBackground />
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={status === 'loading'} onRefresh={loadTrips} tintColor={m.ink} />}
        contentContainerStyle={{
          paddingTop: insets.top + 82,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 16,
        }}
      >
        {actionError ? (
          <GlassCard style={{ marginBottom: 12, padding: 14 }}>
            <Text style={{ fontFamily: fontFamily.medium, fontSize: 13, color: m.danger }}>{actionError}</Text>
          </GlassCard>
        ) : null}

        {status === 'error' ? (
          <GlassCard style={{ marginBottom: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ flex: 1, fontFamily: fontFamily.medium, fontSize: 13, color: m.ink }}>{error}</Text>
            <Pressable onPress={loadTrips} style={{ backgroundColor: m.act, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.actFg }}>{t('dashboard.retry')}</Text>
            </Pressable>
          </GlassCard>
        ) : null}

        {status === 'loading' && trips.length === 0 ? (
          <ActivityIndicator color={m.ink} style={{ marginTop: 48 }} />
        ) : (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: fontFamily.medium, fontSize: 15, color: m.muted }}>{greeting}</Text>
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 28, color: m.ink, marginTop: 2 }}>{user?.username}</Text>
          </View>
        )}

        {spotlight ? (
          <SpotlightCard trip={spotlight} label={statusLabel(spotlight)} t={t} actions={actionsFor(spotlight, 'list')} onOpen={() => openTrip(spotlight)} />
        ) : null}

        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <Segmented<TripFilter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'planned', label: t('dashboard.filter.planned') },
                { value: 'archive', label: t('dashboard.archived') },
                { value: 'completed', label: t('dashboard.mobile.completed') },
              ]}
            />
          </ScrollView>
          <View style={{ flex: 1 }} />
          <IconButton label={t('dashboard.aria.toggleView')} active={viewMode === 'list'} size={36} onPress={() => setViewMode((mode) => (mode === 'grid' ? 'list' : 'grid'))}>
            <Ionicons name={viewMode === 'grid' ? 'list' : 'grid-outline'} size={15} color={viewMode === 'list' ? m.actFg : m.muted} />
          </IconButton>
        </View>

        {showEmpty ? (
          <GlassCard style={{ marginTop: 10, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 32 }}>
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: m.ink }}>{t('dashboard.emptyTitle')}</Text>
            <Text style={{ marginTop: 4, fontFamily: fontFamily.regular, fontSize: 12, color: m.muted, textAlign: 'center' }}>
              {t('dashboard.emptyText')}
            </Text>
            <Pressable
              onPress={openCreate}
              style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: m.act, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 }}
            >
              <Ionicons name="add" size={14} color={m.actFg} />
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.actFg }}>{t('dashboard.emptyButton')}</Text>
            </Pressable>
          </GlassCard>
        ) : null}

        <View style={{ marginTop: 10, gap: 12 }}>
          {grid.map((trip) =>
            viewMode === 'grid' ? (
              <GridCard key={trip.id} trip={trip} locale={locale} badge={statusLabel(trip)} actions={actionsFor(trip, 'grid')} onOpen={() => openTrip(trip)} />
            ) : (
              <ListCard key={trip.id} trip={trip} locale={locale} badge={statusLabel(trip)} t={t} actions={actionsFor(trip, 'list')} onOpen={() => openTrip(trip)} />
            ),
          )}
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 16,
          right: 16,
          height: 52,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: m.glassBorder,
          backgroundColor: m.glass,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          gap: 8,
        }}
      >
        <View style={{ width: 38, height: 38, borderRadius: 11, overflow: 'hidden', backgroundColor: '#101013' }}>
          <Image source={mark} style={{ width: 38, height: 38 }} />
        </View>
        <Text style={{ fontFamily: fontFamily.bold, fontSize: 17, color: m.ink }}>TripTide</Text>
        <View style={{ flex: 1 }} />
        <IconButton label={t('notifications.title')} size={40} onPress={() => setNotesOpen(true)}>
          <Ionicons name="notifications-outline" size={18} color={m.ink} />
        </IconButton>
        <Pressable
          accessibilityLabel={t('nav.profile')}
          onPress={() => setMenuOpen((open) => !open)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1A1A1E',
            borderWidth: 2,
            borderColor: m.glassBorder,
          }}
        >
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: '#fff' }}>{(user?.username || '?')[0]?.toUpperCase()}</Text>
        </Pressable>
      </View>

      {menuOpen ? (
        <Pressable style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} onPress={() => setMenuOpen(false)}>
          <View
            style={{
              position: 'absolute',
              top: insets.top + 70,
              right: 16,
              width: 260,
              borderRadius: 22,
              backgroundColor: m.sheet,
              borderWidth: 1,
              borderColor: m.glassBorder,
              paddingVertical: 6,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1E', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontFamily: fontFamily.bold }}>{(user?.username || '?')[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fontFamily.bold, fontSize: 14, color: m.ink }} numberOfLines={1}>
                  {user?.username}
                </Text>
                <Text style={{ fontFamily: fontFamily.regular, fontSize: 11, color: m.muted }} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
            </View>
            <MenuRow icon="settings-outline" label={t('nav.bottomSettings')} onPress={() => { setMenuOpen(false); navigation.navigate('Settings'); }} />
            <MenuRow
              icon={modeIcon}
              label={t('settings.colorMode')}
              trailing={t(`settings.${preference}`)}
              onPress={() => setPreference(nextMode)}
            />
            <View style={{ height: 1, backgroundColor: m.rowBorder, marginHorizontal: 12, marginVertical: 4 }} />
            <MenuRow icon="log-out-outline" label={t('nav.bottomLogout')} danger onPress={() => { setMenuOpen(false); logout(); }} />
          </View>
        </Pressable>
      ) : null}

      <GlassDock>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <DockSlot label={t('nav.myTrips')} icon="grid-outline" active onPress={() => {}} />
        </View>
        <Fab label={t('dashboard.newTrip')} onPress={openCreate} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <DockSlot label={t('mobileNav.more')} icon="ellipsis-horizontal" active={moreOpen} onPress={() => setMoreOpen(true)} />
        </View>
      </GlassDock>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        <MoreRow label={t('nav.bottomSettings')} icon="settings-outline" onPress={() => { setMoreOpen(false); navigation.navigate('Settings'); }} />
      </Sheet>

      <Sheet open={notesOpen} onClose={() => setNotesOpen(false)}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 17, color: m.ink }}>{t('notifications.title')}</Text>
          <Text style={{ marginTop: 8, fontFamily: fontFamily.regular, fontSize: 14, color: m.muted }}>{t('notifications.empty')}</Text>
        </View>
      </Sheet>

      <TripFormSheet
        open={formOpen}
        trip={formTrip}
        onClose={() => { setFormOpen(false); setFormTrip(null); }}
        onSave={submitForm}
        onArchive={
          formTrip
            ? async () => {
                const editing = formTrip;
                try {
                  await setArchived(editing.id, !editing.is_archived);
                } catch (err) {
                  throw new Error(tripErrorMessage(err, editing.is_archived ? t('dashboard.toast.restoreError') : t('dashboard.toast.archiveError')));
                }
                setFormOpen(false);
                setFormTrip(null);
              }
            : undefined
        }
      />

      <ConfirmSheet
        open={pendingDelete != null}
        title={t('common.delete')}
        message={pendingDelete ? t('dashboard.confirm.delete', { title: pendingDelete.title }) : ''}
        confirmLabel={t('common.delete')}
        danger
        busy={confirming}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          const id = pendingDelete.id;
          setConfirming(true);
          runAction(() => removeTrip(id), t('dashboard.toast.deleteError')).finally(() => {
            setConfirming(false);
            setPendingDelete(null);
          });
        }}
      />
      <ConfirmSheet
        open={pendingCopy != null}
        title={t('dashboard.confirm.copy.title')}
        message={pendingCopy?.title ?? ''}
        confirmLabel={t('dashboard.confirm.copy.confirm')}
        busy={confirming}
        onClose={() => setPendingCopy(null)}
        onConfirm={() => {
          if (!pendingCopy) return;
          const source = pendingCopy;
          setConfirming(true);
          runAction(
            () => copyTrip(source.id, `${source.title} (${t('dashboard.copySuffix')})`).then(() => undefined),
            t('dashboard.toast.copyError'),
          ).finally(() => {
            setConfirming(false);
            setPendingCopy(null);
          });
        }}
      />

      <CoverPicker
        open={coverTrip != null}
        seed={coverTrip?.title ?? ''}
        saving={savingCover}
        onClose={() => setCoverTrip(null)}
        onPick={(photo) => {
          if (!coverTrip) return;
          setSavingCover(true);
          setCover(coverTrip.id, photo.url)
            .then(() => setCoverTrip(null))
            .catch(() => {})
            .finally(() => setSavingCover(false));
        }}
      />
    </View>
  );
}

function MenuRow({
  icon,
  label,
  trailing,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  trailing?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const { m } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
      <Ionicons name={icon} size={18} color={danger ? m.danger : m.muted} />
      <Text style={{ flex: 1, fontFamily: fontFamily.medium, fontSize: 14, color: danger ? m.danger : m.ink }}>{label}</Text>
      {trailing ? <Text style={{ fontFamily: fontFamily.medium, fontSize: 12, color: m.muted }}>{trailing}</Text> : null}
    </Pressable>
  );
}

function MoreRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { m } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginHorizontal: 12, marginBottom: 8, borderRadius: 18, backgroundColor: m.ic, paddingHorizontal: 16, paddingVertical: 14 }}>
      <Ionicons name={icon} size={20} color={m.ink} />
      <Text style={{ flex: 1, fontFamily: fontFamily.bold, fontSize: 15, color: m.ink }}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={m.faint} />
    </Pressable>
  );
}

function Cover({ trip, height }: { trip: Trip; height: number }) {
  const uri = mediaUrl(trip.cover_image);
  if (uri) return <Image source={{ uri }} style={{ height, width: '100%' }} />;
  return <LinearGradient colors={coverGradient(trip.id)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height }} />;
}

function CoverBadge({ label }: { label: string }) {
  return (
    <View style={{ position: 'absolute', left: 8, top: 8, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
      <Text style={{ color: '#fff', fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

function CoverActions({ actions }: { actions: CardAction[] }) {
  return (
    <View style={{ position: 'absolute', right: 8, top: 8, flexDirection: 'row', gap: 6 }}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={action.icon} size={15} color="#fff" />
        </Pressable>
      ))}
    </View>
  );
}

function SpotlightCard({
  trip,
  label,
  t,
  actions,
  onOpen,
}: {
  trip: Trip;
  label: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  actions: CardAction[];
  onOpen: () => void;
}) {
  const days = trip.day_count ?? 0;
  const places = trip.place_count ?? 0;
  const people = (trip.shared_count ?? 0) + 1;
  return (
    <Pressable onPress={onOpen} style={{ height: 300, borderRadius: 26, overflow: 'hidden' }}>
      <Cover trip={trip} height={300} />
      <CoverActions actions={actions} />
      <View style={{ position: 'absolute', left: 10, right: 10, bottom: 10, borderRadius: 18, backgroundColor: 'rgba(14,14,17,0.52)', paddingHorizontal: 14, paddingVertical: 12 }}>
        <View style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.6, color: '#101013' }}>{label.toUpperCase()}</Text>
        </View>
        <Text style={{ marginTop: 7, fontFamily: fontFamily.bold, fontSize: 23, color: '#fff' }} numberOfLines={1}>
          {trip.title}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
          <Pill text={days === 1 ? t('dashboard.mobile.spotlightDayOne', { count: days }) : t('dashboard.mobile.spotlightDaysMany', { count: days })} />
          <Pill text={places === 1 ? t('dashboard.hero.destinationOne', { count: places }) : t('dashboard.hero.destinationMany', { count: places })} />
          <Pill text={people === 1 ? t('dashboard.hero.travelerOne', { count: people }) : t('dashboard.hero.travelerMany', { count: people })} />
        </View>
      </View>
    </Pressable>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <View style={{ borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ color: '#fff', fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>{text}</Text>
    </View>
  );
}

function DateSpan({ start, end, locale }: { start?: string | null; end?: string | null; locale: string }) {
  const { m } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: m.ic, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.ink }}>{shortDate(start, locale) ?? '—'}</Text>
      <Ionicons name="arrow-forward" size={12} color={m.faint} />
      <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.ink }}>{shortDate(end, locale) ?? '—'}</Text>
    </View>
  );
}

function GridCard({ trip, locale, badge, actions, onOpen }: { trip: Trip; locale: string; badge: string; actions: CardAction[]; onOpen: () => void }) {
  const { m } = useTheme();
  return (
    <Pressable onPress={onOpen}>
      <GlassCard>
        <View>
          <Cover trip={trip} height={140} />
          <CoverBadge label={badge} />
          <CoverActions actions={actions} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 12 }}>
          <Text style={{ flex: 1, fontFamily: fontFamily.semibold, fontSize: 14, color: m.ink }} numberOfLines={1}>
            {trip.title}
          </Text>
          <DateSpan start={trip.start_date} end={trip.end_date} locale={locale} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

function ListCard({
  trip,
  locale,
  badge,
  t,
  actions,
  onOpen,
}: {
  trip: Trip;
  locale: string;
  badge: string;
  t: (key: string) => string;
  actions: CardAction[];
  onOpen: () => void;
}) {
  const { m } = useTheme();
  return (
    <Pressable onPress={onOpen}>
      <GlassCard style={{ borderRadius: 22 }}>
        <View>
          <Cover trip={trip} height={188} />
          <CoverBadge label={badge} />
          <CoverActions actions={actions} />
          <Text style={{ position: 'absolute', left: 16, right: 16, bottom: 14, color: '#fff', fontFamily: fontFamily.bold, fontSize: 26 }} numberOfLines={1}>
            {trip.title}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' }}>
          <DateSpan start={trip.start_date} end={trip.end_date} locale={locale} />
          <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: m.rowBorder, marginVertical: 13 }} />
          <View style={{ flexDirection: 'row', alignSelf: 'stretch' }}>
            <Stat value={trip.day_count ?? 0} label={t('dashboard.days')} />
            <Stat value={trip.place_count ?? 0} label={t('dashboard.places')} />
            <Stat value={trip.shared_count ?? 0} label={t('dashboard.members')} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { m } = useTheme();
  const { t } = useTranslation();
  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Text style={{ fontFamily: fontFamily.bold, fontSize: 17, color: m.ink }}>{title}</Text>
        <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: m.muted }}>{message}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={onClose} style={{ flex: 1, borderRadius: 999, backgroundColor: m.ic, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fontFamily.semibold, color: m.ink }}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={busy}
            style={{ flex: 1, borderRadius: 999, backgroundColor: danger ? m.danger : m.act, paddingVertical: 12, alignItems: 'center' }}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: fontFamily.semibold, color: '#fff' }}>{confirmLabel}</Text>}
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const { m } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontFamily: fontFamily.bold, fontSize: 17, color: m.ink }}>{value}</Text>
      <Text style={{ marginTop: 2, fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: m.faint }}>{label}</Text>
    </View>
  );
}
