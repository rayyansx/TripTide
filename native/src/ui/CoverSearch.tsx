import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { searchCoverPhotos, type CoverPhoto } from '../api/trips';
import { useTranslation } from '../i18n/TranslationContext';
import { fontFamily, useTheme } from '../theme';
import { Sheet } from './chrome';

function messageOf(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { error?: string } } }).response?.data;
    if (data?.error) return data.error;
  }
  return err instanceof Error ? err.message : fallback;
}

export function CoverSearch({
  seed,
  selectedUrl,
  onSelect,
}: {
  seed: string;
  selectedUrl: string | null;
  onSelect: (photo: CoverPhoto) => void;
}) {
  const { t } = useTranslation();
  const { m } = useTheme();
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<CoverPhoto[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  void t;

  async function search() {
    const term = query.trim() || seed.trim();
    if (!term) {
      setError(t('dashboard.unsplashQueryRequired'));
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const found = await searchCoverPhotos(term);
      setPhotos(found);
      if (found.length === 0) setError(t('dashboard.unsplashNoResults'));
    } catch (err) {
      setError(messageOf(err, t('dashboard.coverSearchError')));
    } finally {
      setSearching(false);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder={t('dashboard.unsplashSearchPlaceholder')}
          placeholderTextColor={m.faint}
          style={{
            flex: 1,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: m.glassBorder,
            backgroundColor: m.ic,
            color: m.ink,
            fontFamily: fontFamily.regular,
            fontSize: 15,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        />
        <Pressable onPress={search} style={{ borderRadius: 999, backgroundColor: m.act, paddingHorizontal: 16, justifyContent: 'center' }}>
          {searching ? <ActivityIndicator color={m.actFg} /> : <Text style={{ fontFamily: fontFamily.semibold, color: m.actFg }}>{t('common.search')}</Text>}
        </Pressable>
      </View>
      {error ? <Text style={{ fontFamily: fontFamily.regular, color: m.danger, fontSize: 13 }}>{error}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {photos.map((photo) => {
          const selected = selectedUrl === photo.url;
          return (
            <Pressable key={photo.id} onPress={() => onSelect(photo)} style={{ width: 112 }}>
              <Image
                source={{ uri: photo.thumb }}
                style={{ width: 112, height: 84, borderRadius: 14, borderWidth: selected ? 3 : 0, borderColor: m.act }}
              />
              {photo.photographer ? (
                <Text numberOfLines={1} style={{ marginTop: 4, fontFamily: fontFamily.regular, fontSize: 10, color: m.muted }}>
                  {photo.photographer}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function CoverPicker({
  open,
  seed,
  saving,
  onClose,
  onPick,
}: {
  open: boolean;
  seed: string;
  saving: boolean;
  onClose: () => void;
  onPick: (photo: CoverPhoto) => void;
}) {
  const { t } = useTranslation();
  const { m } = useTheme();
  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, gap: 12, maxHeight: 420 }}>
        <Text style={{ fontFamily: fontFamily.bold, fontSize: 17, color: m.ink }}>{t('dashboard.unsplashSearchPlaceholder')}</Text>
        <CoverSearch seed={seed} selectedUrl={null} onSelect={onPick} />
        {saving ? <ActivityIndicator color={m.ink} /> : null}
      </View>
    </Sheet>
  );
}
