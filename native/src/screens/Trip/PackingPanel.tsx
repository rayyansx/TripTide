import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PackingItem, PackingCreateItemRequest } from '@trek/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { packingRepo } from '../../repo/packingRepo';
import { fontFamily, useTheme } from '../../theme';
import { GlassCard, Sheet } from '../../ui/chrome';

// ─── Categories ───────────────────────────────────────────────────────────────

const PACKING_CATEGORIES = [
  { key: 'clothing', label: 'Clothing', icon: 'shirt-outline' as const },
  { key: 'toiletries', label: 'Toiletries', icon: 'sparkles-outline' as const },
  { key: 'electronics', label: 'Electronics', icon: 'hardware-chip-outline' as const },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline' as const },
  { key: 'gear', label: 'Gear & Outdoor', icon: 'compass-outline' as const },
  { key: 'other', label: 'General / Other', icon: 'cube-outline' as const },
];

function getCategoryLabel(cat?: string | null): string {
  if (!cat) return 'General';
  const match = PACKING_CATEGORIES.find((c) => c.key === cat.toLowerCase());
  return match ? match.label : cat.charAt(0).toUpperCase() + cat.slice(1);
}

function getCategoryIcon(cat?: string | null): keyof typeof Ionicons.glyphMap {
  if (!cat) return 'cube-outline';
  const match = PACKING_CATEGORIES.find((c) => c.key === cat.toLowerCase());
  return match ? match.icon : 'cube-outline';
}

// ─── Main Packing Panel ───────────────────────────────────────────────────────

type FilterType = 'all' | 'unpacked' | 'packed' | 'personal';

export function PackingPanel({
  tripId,
  top,
  bottom,
}: {
  tripId: number;
  top: number;
  bottom: number;
}) {
  const { m } = useTheme();
  const [items, setItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [addingItem, setAddingItem] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await packingRepo.listItems(tripId);
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packing items');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Optimistic Toggle with tactile haptics
  const handleToggle = async (item: PackingItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newChecked = item.checked === 1 ? 0 : 1;

    // Optimistic state update
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, checked: newChecked } : it))
    );

    try {
      await packingRepo.toggleChecked(tripId, item.id, item.checked);
    } catch {
      // Rollback on failure
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, checked: item.checked } : it))
      );
    }
  };

  const handleDeleteItem = (item: PackingItem) => {
    Alert.alert('Delete Item', `Remove "${item.name}" from checklist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setItems((prev) => prev.filter((it) => it.id !== item.id));
          await packingRepo.deleteItem(tripId, item.id);
        },
      },
    ]);
  };

  // Progress metrics
  const totalCount = items.length;
  const packedCount = items.filter((it) => it.checked === 1).length;
  const progressPercent = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (filter === 'packed') return it.checked === 1;
      if (filter === 'unpacked') return it.checked === 0;
      if (filter === 'personal') return it.is_private === 1;
      return true;
    });
  }, [items, filter]);

  // Group by category
  const groupedItems = useMemo(() => {
    const groups = new Map<string, PackingItem[]>();
    for (const item of filteredItems) {
      const cat = (item.category || 'other').toLowerCase();
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    }
    return Array.from(groups.entries());
  }, [filteredItems]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header Progress Card */}
      <View
        style={{
          position: 'absolute',
          top: top + 44,
          left: 16,
          right: 16,
          zIndex: 10,
          gap: 8,
        }}
      >
        <GlassCard style={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 18, color: m.ink }}>
                Packing Checklist
              </Text>
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
                {packedCount} of {totalCount} items packed ({progressPercent}%)
              </Text>
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: progressPercent === 100 ? '#16a34a22' : m.glass,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: progressPercent === 100 ? '#16a34a' : m.glassBorder,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bold,
                  fontSize: 13,
                  color: progressPercent === 100 ? '#16a34a' : m.act,
                }}
              >
                {progressPercent}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={{ height: 6, borderRadius: 3, backgroundColor: m.faint, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                backgroundColor: progressPercent === 100 ? '#16a34a' : m.act,
                borderRadius: 3,
              }}
            />
          </View>

          {/* Quick Filters */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unpacked', label: 'Unpacked' },
                { id: 'packed', label: 'Packed' },
                { id: 'personal', label: 'Personal' },
              ] as const
            ).map((f) => {
              const active = filter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: active ? m.act : m.glass,
                    borderWidth: 1,
                    borderColor: active ? m.act : m.glassBorder,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: active ? fontFamily.bold : fontFamily.medium,
                      fontSize: 11,
                      color: active ? m.actFg : m.ink,
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>
      </View>

      {/* Checklist Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: top + 175,
          paddingBottom: bottom + 20,
          paddingHorizontal: 16,
          gap: 12,
        }}
      >
        {loading ? (
          <ActivityIndicator color={m.ink} style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={{ fontFamily: fontFamily.regular, color: m.danger }}>{error}</Text>
        ) : filteredItems.length === 0 ? (
          <GlassCard style={{ padding: 32, alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkbox-outline" size={40} color={m.faint} />
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.ink }}>
              No items in this filter
            </Text>
            <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted, textAlign: 'center' }}>
              Tap the + button below to add clothing, gear, or toiletries to your travel bag.
            </Text>
          </GlassCard>
        ) : (
          groupedItems.map(([catKey, catItems]) => {
            const catPacked = catItems.filter((it) => it.checked === 1).length;

            return (
              <View key={catKey} style={{ gap: 6 }}>
                {/* Category Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={getCategoryIcon(catKey)} size={15} color={m.act} />
                    <Text style={{ fontFamily: fontFamily.bold, fontSize: 13, color: m.ink }}>
                      {getCategoryLabel(catKey)}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fontFamily.medium, fontSize: 11, color: m.muted }}>
                    {catPacked}/{catItems.length}
                  </Text>
                </View>

                {/* Items in Category */}
                <GlassCard style={{ overflow: 'hidden' }}>
                  {catItems.map((item, index) => {
                    const isChecked = item.checked === 1;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => handleToggle(item)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderBottomWidth: index < catItems.length - 1 ? 1 : 0,
                          borderBottomColor: m.glassBorder,
                          backgroundColor: pressed ? m.glass : 'transparent',
                          gap: 12,
                        })}
                      >
                        {/* Tactile Checkbox */}
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: isChecked ? m.act : m.faint,
                            backgroundColor: isChecked ? m.act : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isChecked ? <Ionicons name="checkmark" size={14} color={m.actFg} /> : null}
                        </View>

                        {/* Title & Badges */}
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text
                            style={{
                              fontFamily: isChecked ? fontFamily.regular : fontFamily.medium,
                              fontSize: 14,
                              color: isChecked ? m.muted : m.ink,
                              textDecorationLine: isChecked ? 'line-through' : 'none',
                            }}
                          >
                            {item.name}
                          </Text>
                          {item.quantity && item.quantity > 1 ? (
                            <View style={{ backgroundColor: m.glass, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                              <Text style={{ fontFamily: fontFamily.bold, fontSize: 10, color: m.muted }}>
                                ×{item.quantity}
                              </Text>
                            </View>
                          ) : null}
                          {item.is_private === 1 ? (
                            <Ionicons name="lock-closed-outline" size={12} color={m.muted} />
                          ) : null}
                        </View>

                        {/* Delete Button */}
                        <Pressable
                          onPress={() => handleDeleteItem(item)}
                          hitSlop={8}
                          style={{ opacity: 0.6 }}
                        >
                          <Ionicons name="close-circle-outline" size={18} color={m.muted} />
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </GlassCard>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Item Floating Action Button */}
      <Pressable
        onPress={() => setAddingItem(true)}
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

      {/* Add Item Sheet */}
      <PackingFormSheet
        open={addingItem}
        onClose={() => setAddingItem(false)}
        onSave={async (body) => {
          const created = await packingRepo.createItem(tripId, body);
          setItems((prev) => [...prev, created]);
          setAddingItem(false);
        }}
      />
    </View>
  );
}

// ─── Add Item Sheet ───────────────────────────────────────────────────────────

function PackingFormSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (body: PackingCreateItemRequest) => Promise<void>;
}) {
  const { m } = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('clothing');
  const [quantity, setQuantity] = useState(1);
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setCategory('clothing');
    setQuantity(1);
    setIsPrivate(false);
    setError(null);
    setSaving(false);
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Item name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        category,
        quantity,
        is_private: isPrivate,
        checked: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: m.ic,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 18, color: m.ink }}>
            Add Packing Item
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={24} color={m.muted} />
          </Pressable>
        </View>

        {/* Name */}
        <View>
          <Text style={labelStyle}>Item Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Passport, Swimsuit, Chargers"
            placeholderTextColor={m.faint}
            style={inputStyle}
          />
        </View>

        {/* Category Pills */}
        <View>
          <Text style={labelStyle}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {PACKING_CATEGORIES.map((cat) => {
              const active = cat.key === category;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setCategory(cat.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? m.act : m.ic,
                    borderWidth: 1,
                    borderColor: active ? m.act : m.glassBorder,
                  }}
                >
                  <Ionicons name={cat.icon} size={14} color={active ? m.actFg : m.muted} />
                  <Text
                    style={{
                      fontFamily: active ? fontFamily.bold : fontFamily.medium,
                      fontSize: 12,
                      color: active ? m.actFg : m.ink,
                    }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Quantity Stepper */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={labelStyle}>Quantity</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: m.glass,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: m.glassBorder,
              }}
            >
              <Ionicons name="remove" size={16} color={m.ink} />
            </Pressable>
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.ink }}>
              {quantity}
            </Text>
            <Pressable
              onPress={() => setQuantity((q) => q + 1)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: m.glass,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: m.glassBorder,
              }}
            >
              <Ionicons name="add" size={16} color={m.ink} />
            </Pressable>
          </View>
        </View>

        {/* Privacy Toggle */}
        <Pressable
          onPress={() => setIsPrivate((p) => !p)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 6,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: m.ink }}>
              Personal Item
            </Text>
            <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted }}>
              Only visible to you, hidden from trip group
            </Text>
          </View>
          <Ionicons
            name={isPrivate ? 'checkbox' : 'square-outline'}
            size={20}
            color={isPrivate ? m.act : m.muted}
          />
        </Pressable>

        {error ? (
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.danger }}>{error}</Text>
        ) : null}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: m.act,
            alignItems: 'center',
            marginTop: 6,
          }}
        >
          {saving ? (
            <ActivityIndicator color={m.actFg} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.actFg }}>
              Add to Checklist
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}
