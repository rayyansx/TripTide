import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily, useTheme } from '../theme';

export function ScreenBackground() {
  const { m } = useTheme();
  return (
    <LinearGradient
      colors={[m.scrTop, m.scrMid, m.scrBot]}
      locations={[0, 0.55, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function IconButton({
  label,
  onPress,
  children,
  active = false,
  size = 40,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  active?: boolean;
  size?: number;
}) {
  const { m } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? m.act : m.glass,
        borderWidth: 1,
        borderColor: active ? m.act : m.glassBorder,
      }}
    >
      {children}
    </Pressable>
  );
}

export function DockSlot({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { m } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? m.act : 'transparent',
      }}
    >
      <Ionicons name={icon} size={21} color={active ? m.actFg : m.muted} />
    </Pressable>
  );
}

/** Floating glass dock from client/src/mobile/components/MBottomNav.tsx. */
export function GlassDock({ children }: { children: ReactNode }) {
  const { m, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + 12,
        height: 62,
        borderRadius: 31,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: m.glassBorder,
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.5 : 0.22,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 16,
      }}
    >
      <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={{ flex: 1, backgroundColor: m.glass }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 }}>{children}</View>
      </BlurView>
    </View>
  );
}

export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const { m } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 56,
        height: 56,
        marginHorizontal: 8,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: m.act,
        shadowColor: '#000',
        shadowOpacity: 0.28,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <Ionicons name="add" size={26} color={m.actFg} />
    </Pressable>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const { m } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: m.glassBorder,
        backgroundColor: m.glass,
        padding: 3,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 7,
              backgroundColor: selected ? m.act : 'transparent',
            }}
          >
            <Text
              style={{
                fontFamily: selected ? fontFamily.semibold : fontFamily.medium,
                fontSize: 13,
                color: selected ? m.actFg : m.ink,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { m } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(16,16,19,0.4)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: m.sheet,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            paddingBottom: insets.bottom + 16,
            borderWidth: 1,
            borderColor: m.glassBorder,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: m.faint }} />
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function GlassCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { m } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: 20,
          borderWidth: 1,
          borderColor: m.cardBorder,
          backgroundColor: m.card,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
