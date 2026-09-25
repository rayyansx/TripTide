import { Alert, Linking, Platform } from 'react-native';

export type MapApp = 'apple' | 'google' | 'waze' | 'citymapper';

export interface DirectionsOptions {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  label?: string;
  /**
   * If true, shows an action sheet so the user picks their preferred map app.
   * If false (default), opens the platform-default maps app directly.
   */
  prompt?: boolean;
}

function encodeLabel(label: string): string {
  return encodeURIComponent(label);
}

/**
 * Returns the deeplink URL for a given map app and coordinates/address.
 * Returns null if the app is not supported for the given input.
 */
export function buildDirectionsUrl(
  app: MapApp,
  opts: { lat?: number | null; lng?: number | null; address?: string | null; label?: string }
): string | null {
  const { lat, lng, address, label = '' } = opts;
  const name = encodeLabel(label || address || '');

  if (app === 'apple') {
    if (lat != null && lng != null) {
      return `maps://?q=${name}&ll=${lat},${lng}`;
    }
    if (address) return `maps://?q=${encodeLabel(address)}`;
    return null;
  }

  if (app === 'google') {
    if (lat != null && lng != null) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeLabel(address)}`;
    return null;
  }

  if (app === 'waze') {
    if (lat != null && lng != null) {
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    }
    return null; // Waze requires coordinates
  }

  if (app === 'citymapper') {
    if (lat != null && lng != null) {
      return `https://citymapper.com/directions?endcoord=${lat},${lng}&endname=${name}`;
    }
    return null;
  }

  return null;
}

/**
 * Opens a directions URL in the specified app.
 * Falls back to Apple Maps / Google Maps if the target app isn't available.
 */
async function openInApp(app: MapApp, opts: DirectionsOptions): Promise<void> {
  const url = buildDirectionsUrl(app, opts);
  if (!url) return;
  const canOpen = await Linking.canOpenURL(url).catch(() => false);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

/**
 * The main navigation intent utility.
 *
 * With `prompt: true` shows an action sheet letting the user pick their maps app.
 * Without it, opens Apple Maps on iOS or Google Maps on Android directly.
 */
export async function launchDirections(opts: DirectionsOptions): Promise<void> {
  const { prompt = false, lat, lng, address, label } = opts;

  if (!lat && !lng && !address) return;

  if (!prompt) {
    const defaultApp: MapApp = Platform.OS === 'ios' ? 'apple' : 'google';
    await openInApp(defaultApp, opts);
    return;
  }

  // Build available apps list — only offer apps with valid URLs for the given data
  type AppOption = { label: string; app: MapApp };
  const options: AppOption[] = [];

  if (Platform.OS === 'ios') {
    options.push({ label: 'Apple Maps', app: 'apple' });
  }
  options.push({ label: 'Google Maps', app: 'google' });
  if (lat != null && lng != null) {
    options.push({ label: 'Waze', app: 'waze' });
    options.push({ label: 'Citymapper', app: 'citymapper' });
  }

  await new Promise<void>((resolve) => {
    Alert.alert(
      label ? `Directions to ${label}` : 'Open in Maps',
      '',
      [
        ...options.map((o) => ({
          text: o.label,
          onPress: () => openInApp(o.app, opts).finally(resolve),
        })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve() },
      ]
    );
  });
}
