import axios from 'axios';

export type TravelMode = 'driving' | 'walking' | 'cycling';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteSegment {
  distanceMeters: number;
  durationSeconds: number;
  formattedDistance: string;
  formattedDuration: string;
  geometry?: [number, number][]; // Array of [lon, lat] points for MapLibre/Leaflet polylines
}

export interface MultiStopRouteResult {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  formattedTotalDistance: string;
  formattedTotalDuration: string;
  legs: RouteSegment[];
  fullPolyline: [number, number][]; // [lon, lat]
}

interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    distance: number; // meters
    duration: number; // seconds
    geometry?: {
      coordinates: [number, number][];
    };
    legs?: Array<{
      distance: number;
      duration: number;
    }>;
  }>;
}

/**
 * Formats duration in seconds into a friendly string (e.g. "14 min", "1 hr 20 min")
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${Math.max(1, mins)} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours} hr ${remainingMins} min` : `${hours} hr`;
}

/**
 * Formats distance in meters into a friendly string (e.g. "800 m", "3.4 km", "2.1 mi")
 */
export function formatDistance(meters: number, useImperial = false): string {
  if (!meters || meters <= 0) return useImperial ? '0 ft' : '0 m';

  if (useImperial) {
    const miles = meters / 1609.344;
    if (miles < 0.1) {
      return `${Math.round(meters * 3.28084)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Calls OSRM (Open Source Routing Machine) to calculate travel time, distance, and geometry
 * between two or more coordinates.
 */
export async function getRoute(
  coordinates: Coordinate[],
  mode: TravelMode = 'driving',
  options: { signal?: AbortSignal } = {}
): Promise<MultiStopRouteResult | null> {
  if (!coordinates || coordinates.length < 2) return null;

  // OSRM coordinates format: {lon},{lat};{lon},{lat}
  const coordString = coordinates
    .map((c) => `${c.longitude.toFixed(6)},${c.latitude.toFixed(6)}`)
    .join(';');

  const profile = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bicycle' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordString}?overview=full&geometries=geojson`;

  try {
    const res = await axios.get<OsrmRouteResponse>(url, {
      timeout: 6000,
      signal: options.signal,
    });

    if (res.data?.code !== 'Ok' || !res.data.routes || res.data.routes.length === 0) {
      return null;
    }

    const route = res.data.routes[0];
    const totalDistance = route.distance;
    const totalDuration = route.duration;
    const fullPolyline = route.geometry?.coordinates ?? [];

    const legs: RouteSegment[] = (route.legs ?? []).map((leg) => ({
      distanceMeters: leg.distance,
      durationSeconds: leg.duration,
      formattedDistance: formatDistance(leg.distance),
      formattedDuration: formatDuration(leg.duration),
    }));

    return {
      totalDistanceMeters: totalDistance,
      totalDurationSeconds: totalDuration,
      formattedTotalDistance: formatDistance(totalDistance),
      formattedTotalDuration: formatDuration(totalDuration),
      legs,
      fullPolyline,
    };
  } catch (err: unknown) {
    if (axios.isCancel(err)) throw err;
    return null;
  }
}

/**
 * Convenience helper to get a route between two single points
 */
export async function getRouteBetween(
  origin: Coordinate,
  destination: Coordinate,
  mode: TravelMode = 'driving',
  options: { signal?: AbortSignal } = {}
): Promise<RouteSegment | null> {
  const result = await getRoute([origin, destination], mode, options);
  if (!result || result.legs.length === 0) return null;

  return {
    ...result.legs[0],
    geometry: result.fullPolyline,
  };
}
