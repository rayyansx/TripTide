import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { searchPlaces, type SearchResultPlace } from '../../api/placeSearch';
import { useTranslation } from '../../i18n/TranslationContext';
import { fontFamily, useTheme } from '../../theme';
import { Sheet } from '../../ui/chrome';

const QUICK_SUGGESTIONS = [
  { label: 'Attractions', query: 'museum viewpoint monument' },
  { label: 'Food & Drinks', query: 'restaurant cafe bistro' },
  { label: 'Parks & Nature', query: 'park garden beach' },
  { label: 'Hotels', query: 'hotel resort stay' },
];

export function PlaceSearchSheet({
  open,
  onClose,
  onSelectPlace,
}: {
  open: boolean;
  onClose: () => void;
  onSelectPlace: (place: SearchResultPlace) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { m } = useTheme();
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultPlace[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResultPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setError(null);
      setSubmitting(false);
      return;
    }
  }, [open]);

  function handleQueryChange(text: string) {
    setQuery(text);
    setError(null);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (text.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const found = await searchPlaces(text.trim());
        setResults(found);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  async function handleSelect(place: SearchResultPlace) {
    if (submitting) return;
    setSubmitting(true);
    try {
      setRecentSearches((prev) => [place, ...prev.filter((p) => p.id !== place.id)].slice(0, 5));
      await onSelectPlace(place);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add place');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 12, maxHeight: height * 0.78 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 18, color: m.ink }}>
            {t('places.newPlace') || 'Add Stop to Day'}
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={24} color={m.muted} />
          </Pressable>
        </View>

        {/* Search bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: m.ic,
            borderRadius: 14,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: m.glassBorder,
          }}
        >
          <Ionicons name="search-outline" size={18} color={m.muted} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder={t('places.searchPlaceholder') || 'Search city, landmark, restaurant...'}
            placeholderTextColor={m.muted}
            autoFocus
            style={{
              flex: 1,
              fontFamily: fontFamily.regular,
              fontSize: 15,
              color: m.ink,
              paddingVertical: 10,
            }}
          />
          {loading ? (
            <ActivityIndicator size="small" color={m.ink} />
          ) : query ? (
            <Pressable onPress={() => handleQueryChange('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={m.muted} />
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.danger }}>{error}</Text>
        ) : null}

        {submitting ? (
          <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={m.ink} />
            <Text style={{ fontFamily: fontFamily.medium, fontSize: 14, color: m.muted }}>
              Adding stop to your day...
            </Text>
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
            style={{ flexGrow: 0 }}
          >
            {/* Loading skeletons */}
            {loading && results.length === 0 ? (
              <View style={{ gap: 10, paddingVertical: 8 }}>
                {[1, 2, 3].map((key) => (
                  <View
                    key={key}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: m.ic,
                      gap: 8,
                      opacity: 0.6,
                    }}
                  >
                    <View style={{ height: 16, width: '55%', backgroundColor: m.glass, borderRadius: 6 }} />
                    <View style={{ height: 12, width: '85%', backgroundColor: m.glass, borderRadius: 4 }} />
                  </View>
                ))}
              </View>
            ) : results.length > 0 ? (
              results.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: pressed ? m.glass : m.ic,
                    padding: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: m.glassBorder,
                    gap: 12,
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: m.glass,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="location" size={18} color={m.act} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fontFamily.semibold, fontSize: 15, color: m.ink }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.address ? (
                      <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.muted, marginTop: 2 }} numberOfLines={2}>
                        {item.address}
                      </Text>
                    ) : null}
                    {item.category ? (
                      <View style={{ alignSelf: 'flex-start', marginTop: 4, backgroundColor: m.glass, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontFamily: fontFamily.medium, fontSize: 10, color: m.faint, textTransform: 'capitalize' }}>
                          {item.category.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Ionicons name="add-circle" size={22} color={m.act} />
                </Pressable>
              ))
            ) : query.trim().length >= 2 ? (
              <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: m.muted, textAlign: 'center', paddingVertical: 20 }}>
                {t('places.noneFound') || 'No places found. Try another search.'}
              </Text>
            ) : (
              /* When empty: show recent searches and quick suggestion pills */
              <View style={{ gap: 14, paddingTop: 6 }}>
                {recentSearches.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.muted, textTransform: 'uppercase' }}>
                      Recent Places
                    </Text>
                    {recentSearches.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => handleSelect(item)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: m.ic,
                          padding: 10,
                          borderRadius: 12,
                          gap: 10,
                        }}
                      >
                        <Ionicons name="time-outline" size={16} color={m.muted} />
                        <Text style={{ flex: 1, fontFamily: fontFamily.medium, fontSize: 14, color: m.ink }} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Ionicons name="add" size={18} color={m.act} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <View style={{ gap: 8 }}>
                  <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: m.muted, textTransform: 'uppercase' }}>
                    Quick Categories
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {QUICK_SUGGESTIONS.map((cat) => (
                      <Pressable
                        key={cat.label}
                        onPress={() => handleQueryChange(cat.query.split(' ')[0])}
                        style={{
                          backgroundColor: m.glass,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: m.glassBorder,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                        }}
                      >
                        <Text style={{ fontFamily: fontFamily.medium, fontSize: 13, color: m.ink }}>
                          {cat.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={{ paddingVertical: 14, alignItems: 'center', gap: 4 }}>
                  <Ionicons name="globe-outline" size={26} color={m.faint} />
                  <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: m.faint, textAlign: 'center' }}>
                    Search millions of attractions, restaurants, and addresses worldwide
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Sheet>
  );
}
