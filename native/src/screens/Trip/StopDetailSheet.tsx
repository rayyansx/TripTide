import { Ionicons } from '@expo/vector-icons';
import type { Assignment, Day } from '@trek/shared';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from '../../i18n/TranslationContext';
import { fontFamily, useTheme } from '../../theme';
import { Sheet } from '../../ui/chrome';

export function StopDetailSheet({
  open,
  assignment,
  days,
  currentDayId,
  isFirst,
  isLast,
  onClose,
  onSave,
  onMoveToDay,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  open: boolean;
  assignment: Assignment | null;
  days: Day[];
  currentDayId: number | null;
  isFirst: boolean;
  isLast: boolean;
  onClose: () => void;
  onSave: (params: { title: string; notes: string | null; time: string | null }) => Promise<void>;
  onMoveToDay: (targetDayId: number) => Promise<void>;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { m } = useTheme();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState('');
  const [targetDay, setTargetDay] = useState<number | null>(currentDayId);
  const [saving, setSaving] = useState(false);
  const [movingDay, setMovingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !assignment) return;
    setTitle(assignment.place.name ?? '');
    setNotes(assignment.notes ?? '');
    setTime(assignment.assignment_time ?? '');
    setTargetDay(currentDayId);
    setError(null);
    setSaving(false);
    setMovingDay(false);
  }, [open, assignment, currentDayId]);

  if (!assignment) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim() || assignment?.place.name || '',
        notes: notes.trim() || null,
        time: time.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleTransferDay(dayId: number) {
    if (dayId === currentDayId || movingDay) return;
    setMovingDay(true);
    setError(null);
    try {
      await onMoveToDay(dayId);
      setTargetDay(dayId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer day');
      setMovingDay(false);
    }
  }

  function handleOpenMaps() {
    const lat = assignment?.place.lat;
    const lng = assignment?.place.lng;
    const name = encodeURIComponent(assignment?.place.name ?? '');

    if (lat && lng) {
      const scheme = Platform.select({
        ios: `maps:0,0?q=${name}@${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}(${name})`,
      });
      if (scheme) Linking.openURL(scheme);
    } else if (assignment?.place.address) {
      const addr = encodeURIComponent(assignment.place.address);
      Linking.openURL(`https://maps.apple.com/?q=${addr}`);
    }
  }

  function confirmDelete() {
    Alert.alert(
      t('common.delete') || 'Delete Stop',
      'Are you sure you want to remove this stop from the day?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await onDelete();
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to delete');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 18, color: m.ink }}>
              Edit Stop
            </Text>
            {assignment.place.address ? (
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted, marginTop: 2 }}>
                {assignment.place.address}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={24} color={m.muted} />
          </Pressable>
        </View>

        {/* Quick actions row */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={handleOpenMaps}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: m.glass,
              borderRadius: 12,
              paddingVertical: 10,
              gap: 6,
              borderWidth: 1,
              borderColor: m.glassBorder,
            }}
          >
            <Ionicons name="navigate-outline" size={16} color={m.act} />
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.act }}>
              Open in Maps
            </Text>
          </Pressable>

          <Pressable
            disabled={isFirst}
            onPress={onMoveUp}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: m.glass,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: m.glassBorder,
              opacity: isFirst ? 0.35 : 1,
            }}
          >
            <Ionicons name="arrow-up" size={16} color={m.ink} />
          </Pressable>

          <Pressable
            disabled={isLast}
            onPress={onMoveDown}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: m.glass,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: m.glassBorder,
              opacity: isLast ? 0.35 : 1,
            }}
          >
            <Ionicons name="arrow-down" size={16} color={m.ink} />
          </Pressable>
        </View>

        {/* Day Transfer Selector */}
        {days.length > 1 ? (
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.muted, textTransform: 'uppercase' }}>
              Transfer Stop to Day
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {days.map((day, idx) => {
                const isSelected = (targetDay ?? currentDayId) === day.id;
                return (
                  <Pressable
                    key={day.id}
                    disabled={movingDay}
                    onPress={() => handleTransferDay(day.id)}
                    style={{
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderWidth: 1,
                      borderColor: isSelected ? m.act : m.glassBorder,
                      backgroundColor: isSelected ? m.act : m.ic,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fontFamily.semibold,
                        fontSize: 12,
                        color: isSelected ? m.actFg : m.ink,
                      }}
                    >
                      {day.title || `Day ${day.day_number ?? idx + 1}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Stop Title */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.muted, textTransform: 'uppercase' }}>
            Stop Name / Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Place or attraction name"
            placeholderTextColor={m.faint}
            style={{
              backgroundColor: m.ic,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontFamily: fontFamily.regular,
              fontSize: 14,
              color: m.ink,
              borderWidth: 1,
              borderColor: m.glassBorder,
            }}
          />
        </View>

        {/* Scheduled Time */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.muted, textTransform: 'uppercase' }}>
            Scheduled Time
          </Text>
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="e.g. 10:30 AM or 14:00"
            placeholderTextColor={m.faint}
            style={{
              backgroundColor: m.ic,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontFamily: fontFamily.regular,
              fontSize: 14,
              color: m.ink,
              borderWidth: 1,
              borderColor: m.glassBorder,
            }}
          />
        </View>

        {/* Notes */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.muted, textTransform: 'uppercase' }}>
            Notes / Details
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Booking reference, ticket info, tips..."
            placeholderTextColor={m.faint}
            style={{
              backgroundColor: m.ic,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              minHeight: 70,
              textAlignVertical: 'top',
              fontFamily: fontFamily.regular,
              fontSize: 14,
              color: m.ink,
              borderWidth: 1,
              borderColor: m.glassBorder,
            }}
          />
        </View>

        {error ? (
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.danger }}>{error}</Text>
        ) : null}

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <Pressable
            onPress={confirmDelete}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 14,
              backgroundColor: m.glass,
              borderWidth: 1,
              borderColor: m.danger,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="trash-outline" size={18} color={m.danger} />
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={saving || movingDay}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: m.act,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {saving || movingDay ? (
              <ActivityIndicator size="small" color={m.actFg} />
            ) : (
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: m.actFg }}>
                Save Changes
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </Sheet>
  );
}
