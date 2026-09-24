/**
 * Same basemap choice as client/src/utils/tileUrl.ts `resolveBasemap`:
 * an empty or keyless-CARTO setting falls through to OpenFreeMap, a `{z}/{x}/{y}`
 * template stays a raster style, and anything else is a MapLibre style URL.
 */
const OFM_POSITRON = 'https://tiles.openfreemap.org/styles/positron';
const OFM_DARK = 'https://tiles.openfreemap.org/styles/dark';

export type MapStyle = string | Record<string, unknown>;

function hostOf(url: string): string {
  return url.replace(/^\w*:?\/\//, '').split(/[/?#]/)[0] ?? '';
}

function isKeylessCarto(url: string): boolean {
  return /basemaps\.cartocdn\.com$/i.test(hostOf(url)) && !/[?&]key=/.test(url);
}

function withCartoKey(url: string, key: string | null | undefined): string {
  if (!key || key.includes('*')) return url;
  if (!/basemaps\.cartocdn\.com$/i.test(hostOf(url)) || /[?&]key=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`;
}

function rasterStyle(template: string): MapStyle {
  const tiles = template.replaceAll('{s}', 'a').replaceAll('{r}', '');
  return {
    version: 8,
    sources: {
      raster: {
        type: 'raster',
        tiles: [tiles],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [{ id: 'raster', type: 'raster', source: 'raster' }],
  };
}

export function defaultStyle(isDark: boolean): string {
  return isDark ? OFM_DARK : OFM_POSITRON;
}

export function resolveMapStyle(template: string | null | undefined, isDark: boolean, cartoKey?: string | null): MapStyle {
  const fallback = defaultStyle(isDark);
  const trimmed = template?.trim() ?? '';
  const chosen = withCartoKey(trimmed || fallback, cartoKey);
  if (!chosen || isKeylessCarto(chosen)) return fallback;
  if (/\{[zxy]\}/i.test(chosen)) return rasterStyle(chosen);
  return chosen;
}
