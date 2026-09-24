import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { Trip, TripCreateRequest } from '@trek/shared';

/** Same limits as `@trek/shared` `MAX_TRIP_DAYS` / `tripSpanDays`. Kept local so Metro does not load the shared barrel. */
const MAX_TRIP_DAYS = 999;

function tripSpanDays(startDate: string, endDate: string): number {
  const utcDay = (date: string) => {
    const [year = Number.NaN, month = Number.NaN, day = Number.NaN] = date.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.floor((utcDay(endDate) - utcDay(startDate)) / 86400000) + 1;
}
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useTranslation } from '../../i18n/TranslationContext';
import { fontFamily, useTheme } from '../../theme';
import type { CoverPhoto } from '../../api/trips';
import { CoverSearch } from '../../ui/CoverSearch';
import { Sheet } from '../../ui/chrome';

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromIso(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

function shiftEnd(start: string, previousStart: string, previousEnd: string): string {
  if (previousEnd && previousStart && previousEnd >= previousStart) {
    const duration = Math.round(
      (Date.parse(`${previousEnd}T00:00:00Z`) - Date.parse(`${previousStart}T00:00:00Z`)) / 86400000,
    );
    const next = new Date(`${start}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + duration);
    return next.toISOString().slice(0, 10);
  }
  return start;
}

export function TripFormSheet({
  open,
  trip,
  onClose,
  onSave,
  onArchive,
}: {
  open: boolean;
  trip: Trip | null;
  onClose: () => void;
  onSave: (body: TripCreateRequest, coverUrl: string | null) => Promise<void>;
  onArchive?: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { m, isDark } = useTheme();
  const { height } = useWindowDimensions();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(trip?.title ?? '');
    setStartDate(trip?.start_date?.slice(0, 10) ?? '');
    setEndDate(trip?.end_date?.slice(0, 10) ?? '');
    setCoverUrl(trip?.cover_image ?? null);
    setPicking(null);
    setError(null);
    setSaving(false);
  }, [open, trip]);

  function changeStart(next: string) {
    if (next && endDate && startDate && endDate >= startDate) setEndDate(shiftEnd(next, startDate, endDate));
    else if (next && (!endDate || endDate < next)) setEndDate(next);
    setStartDate(next);
  }

  function onPick(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setPicking(null);
    if (event.type === 'dismissed' || !date || !picking) return;
    const iso = toIso(date);
    if (picking === 'start') changeStart(iso);
    else setEndDate(iso);
  }

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError(t('dashboard.titleRequired'));
      return;
    }
    if ((startDate && !endDate) || (!startDate && endDate)) {
      setError(t('dashboard.endDateError'));
      return;
    }
    if (startDate && endDate) {
      const span = tripSpanDays(startDate, endDate);
      if (span < 1) {
        setError(t('dashboard.endDateError'));
        return;
      }
      const datesTouched = !trip || startDate !== (trip.start_date || '') || endDate !== (trip.end_date || '');
      if (datesTouched && span > MAX_TRIP_DAYS) {
        setError(t('dashboard.tripTooLong', { days: MAX_TRIP_DAYS }));
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(
        { title: trimmed, start_date: startDate || null, end_date: endDate || null },
        coverUrl,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.toast.createError'));
    } finally {
      setSaving(false);
    }
  }

  const pickerValue = fromIso((picking === 'end' ? endDate : startDate) || toIso(new Date()));

  return (
    <Sheet open={open} onClose={onClose}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: height * 0.78 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}
      >
        <Text style={{ fontFamily: fontFamily.bold, fontSize: 17, color: m.ink }}>
          {trip ? t('dashboard.editTrip') : t('dashboard.newTrip')}
        </Text>
        <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted }}>{t('dashboard.newTripSub')}</Text>
        <Field label={t('common.name')}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('common.name')}
            placeholderTextColor={m.faint}
            style={inputStyle(m.ink, m.ic, m.glassBorder)}
          />
        </Field>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <DateField
            label={t('dashboard.startDate')}
            value={startDate}
            onPress={() => setPicking('start')}
            onClear={() => setStartDate('')}
          />
          <DateField
            label={t('dashboard.endDate')}
            value={endDate}
            onPress={() => setPicking('end')}
            onClear={() => setEndDate('')}
          />
        </View>
        {picking ? (
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={isDark ? 'dark' : 'light'}
            onChange={onPick}
          />
        ) : null}
        <CoverSearch
          seed={title}
          selectedUrl={coverUrl}
          onSelect={(photo: CoverPhoto) => setCoverUrl(photo.url)}
        />
        {trip && onArchive ? (
          <Pressable
            onPress={() => {
              onArchive().catch((err: unknown) => setError(err instanceof Error ? err.message : t('dashboard.toast.archiveError')));
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 4 }}
          >
            <Ionicons name="archive-outline" size={16} color={m.ink} />
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: m.ink }}>
              {trip.is_archived ? t('dashboard.restore') : t('dashboard.archive')}
            </Text>
          </Pressable>
        ) : null}
        {error ? <Text style={{ color: m.danger, fontFamily: fontFamily.regular }}>{error}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={onClose} style={{ flex: 1, borderRadius: 999, backgroundColor: m.ic, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fontFamily.semibold, color: m.ink }}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={saving}
            style={{ flex: 1, borderRadius: 999, backgroundColor: m.act, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: fontFamily.semibold, color: m.actFg }}>
              {saving ? t('common.saving') : trip ? t('common.update') : t('common.save')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Sheet>
  );
}

function inputStyle(color: string, backgroundColor: string, borderColor: string) {
  return {
    borderRadius: 14,
    borderWidth: 1,
    borderColor,
    backgroundColor,
    color,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { m } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: m.faint }}>{label}</Text>
      {children}
    </View>
  );
}

function DateField({
  label,
  value,
  onPress,
  onClear,
}: {
  label: string;
  value: string;
  onPress: () => void;
  onClear: () => void;
}) {
  const { m } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: m.faint }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pressable onPress={onPress} style={{ flex: 1, ...inputStyle(value ? m.ink : m.faint, m.ic, m.glassBorder) }}>
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 15, color: value ? m.ink : m.faint }}>{value || '—'}</Text>
        </Pressable>
        {value ? (
          <Pressable accessibilityLabel={t('common.clear')} onPress={onClear}>
            <Text style={{ fontFamily: fontFamily.semibold, color: m.muted }}>{t('common.clear')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
