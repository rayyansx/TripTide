import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LoginScreen } from '../screens/Login/LoginScreen';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme';
import type { AppStackParamList, AuthStackParamList } from './types';
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { TripScreen } from '../screens/Trip/TripScreen';
import { ToolkitScreen } from '../screens/Toolkit/ToolkitScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, status, restore } = useAuthStore();
  const { colors, m, isDark } = useTheme();

  useEffect(() => {
    restore();
  }, [restore]);

  if (status !== 'ready') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: m.bg }}>
        <ActivityIndicator color={m.ink} />
      </View>
    );
  }

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: m.bg,
      card: m.bg,
      text: m.ink,
      border: m.glassBorder,
      primary: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      {isAuthenticated ? (
        <AppStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: m.bg } }}>
          <AppStack.Screen name="Dashboard" component={DashboardScreen} />
          <AppStack.Screen name="Trip" component={TripScreen} />
          <AppStack.Screen name="Toolkit" component={ToolkitScreen} />
          <AppStack.Screen name="Settings" component={SettingsScreen} />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
