import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../i18n/TranslationContext';
import type { AppStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { type DarkModePreference, fontFamily, useTheme } from '../../theme';
import { GlassCard, IconButton, ScreenBackground, Segmented } from '../../ui/chrome';

type Props = NativeStackScreenProps<AppStackParamList, 'Settings'>;

const MODES: { value: DarkModePreference; labelKey: string }[] = [
  { value: 'light', labelKey: 'settings.light' },
  { value: 'dark', labelKey: 'settings.dark' },
  { value: 'auto', labelKey: 'settings.auto' },
];

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { m, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <View style={{ flex: 1, backgroundColor: m.bg }}>
      <ScreenBackground />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconButton label={t('common.back')} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={19} color={m.ink} />
        </IconButton>
        <Text style={{ fontFamily: fontFamily.bold, fontSize: 20, color: m.ink }}>{t('nav.bottomSettings')}</Text>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        <GlassCard style={{ padding: 16, gap: 12 }}>
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.muted }}>{t('settings.colorMode')}</Text>
          <Segmented<DarkModePreference>
            value={preference}
            onChange={setPreference}
            options={MODES.map((mode) => ({ value: mode.value, label: t(mode.labelKey) }))}
          />
        </GlassCard>

        <GlassCard style={{ padding: 16, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.ink }}>{user?.username}</Text>
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: m.muted }}>{user?.email}</Text>
        </GlassCard>

        <Pressable
          onPress={() => logout()}
          style={{ borderRadius: 999, backgroundColor: m.ic, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 15, color: m.danger }}>{t('nav.bottomLogout')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
