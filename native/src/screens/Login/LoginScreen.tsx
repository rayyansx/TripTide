import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../i18n/TranslationContext';
import { useAuthStore } from '../../store/authStore';
import { fontFamily } from '../../theme';
import mark from '../../../assets/icon.png';

/**
 * Phone login panel from client/src/pages/LoginPage.tsx: light canvas, mark,
 * tagline, and a white card. The desktop aurora stays on wide screens only.
 */
export function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f9fafb' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ alignItems: 'center', marginBottom: 28, gap: 8 }}>
          <Image source={mark} style={{ width: 56, height: 56, borderRadius: 14 }} />
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 22, color: '#111827' }}>TripTide</Text>
          <Text style={{ fontFamily: fontFamily.medium, fontSize: 16, color: '#9ca3af', textAlign: 'center' }}>{t('login.tagline')}</Text>
        </View>
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            paddingHorizontal: 28,
            paddingVertical: 32,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 22, color: '#111827' }}>{t('login.title')}</Text>
          <Text style={{ marginTop: 4, marginBottom: 24, fontFamily: fontFamily.regular, fontSize: 13.5, color: '#9ca3af' }}>{t('login.subtitle')}</Text>
          <View style={{ gap: 14 }}>
            <Field value={email} onChangeText={setEmail} placeholder={t('login.emailPlaceholder')} keyboardType="email-address" secure={false} />
            <Field value={password} onChangeText={setPassword} placeholder={t('common.password')} keyboardType="default" secure />
            {error ? (
              <View style={{ padding: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10 }}>
                <Text style={{ fontFamily: fontFamily.regular, fontSize: 13, color: '#dc2626' }}>{error}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={{ backgroundColor: '#111827', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontFamily: fontFamily.bold, fontSize: 14, color: '#fff' }}>{t('login.signIn')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secure,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType: 'email-address' | 'default';
  secure: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      autoCapitalize="none"
      keyboardType={keyboardType}
      secureTextEntry={secure}
      style={{
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        backgroundColor: '#fff',
        color: '#111827',
        fontFamily: fontFamily.regular,
        fontSize: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    />
  );
}
