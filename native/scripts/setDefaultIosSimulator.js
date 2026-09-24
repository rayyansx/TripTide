#!/usr/bin/env node
/**
 * Expo's `i` shortcut always opens Simulator.app's *current default device*
 * (whatever `CurrentDeviceUDID` is set to) — it doesn't take a device name.
 * This pins that default to a known simulator before `expo start` runs, so
 * `i` reliably opens the right device instead of whatever was last used.
 *
 * macOS + Xcode Command Line Tools only; no-ops everywhere else (including
 * CI, where there's no Simulator to point at).
 */
const { execSync } = require('node:child_process');

if (process.platform !== 'darwin') {
  process.exit(0);
}

const DEFAULT_DEVICE_NAME = 'iPhone 17 Pro';
const deviceName = process.env.EXPO_IOS_SIMULATOR_DEVICE || DEFAULT_DEVICE_NAME;

/** "com.apple.CoreSimulator.SimRuntime.iOS-27-0" -> 27.0, for picking the newest runtime when several match. */
function runtimeVersion(runtimeId) {
  const match = runtimeId.match(/iOS-(\d+)-(\d+)/);
  if (!match) return -1;
  return Number(match[1]) + Number(match[2]) / 100;
}

try {
  const raw = execSync('xcrun simctl list devices available -j', { encoding: 'utf8' });
  const { devices } = JSON.parse(raw);

  let best = null;
  for (const [runtimeId, list] of Object.entries(devices)) {
    if (!runtimeId.includes('iOS')) continue;
    const version = runtimeVersion(runtimeId);
    for (const device of list) {
      if (device.name !== deviceName || !device.isAvailable) continue;
      if (!best || version > best.version) best = { udid: device.udid, version };
    }
  }

  if (!best) {
    console.warn(
      `[setDefaultIosSimulator] No available simulator named "${deviceName}" found — Expo will open whatever ` +
        `simulator was last used. Set EXPO_IOS_SIMULATOR_DEVICE to override, or run ` +
        `\`xcrun simctl list devices available\` to see what's installed.`
    );
    process.exit(0);
  }

  execSync(`defaults write com.apple.iphonesimulator CurrentDeviceUDID -string "${best.udid}"`);
  console.log(`[setDefaultIosSimulator] Default iOS simulator set to "${deviceName}" (${best.udid}).`);
} catch (err) {
  console.warn(`[setDefaultIosSimulator] Skipped — ${err.message}`);
}
