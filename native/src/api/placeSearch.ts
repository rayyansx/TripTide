import axios from 'axios';

export interface SearchResultPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  city?: string;
  country?: string;
  postcode?: string;
}

interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    osm_id?: number | string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    postcode?: string;
    osm_key?: string;
    osm_value?: string;
    type?: string;
  };
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

function formatPhotonAddress(p: PhotonFeature['properties']): string {
  const parts: string[] = [];
  const streetPart = [p.housenumber, p.street].filter(Boolean).join(' ');
  if (streetPart) parts.push(streetPart);
  if (p.district) parts.push(p.district);
  if (p.city) parts.push(p.city);
  if (p.state && p.state !== p.city) parts.push(p.state);
  if (p.country) parts.push(p.country);

  return parts.length > 0 ? parts.join(', ') : p.name ?? '';
}

/**
 * Searches places using Komoot Photon (OpenStreetMap data).
 * Falls back to OpenStreetMap Nominatim if Photon fails or returns empty results.
 */
export async function searchPlaces(
  query: string,
  options: {
    limit?: number;
    latitude?: number;
    longitude?: number;
    signal?: AbortSignal;
  } = {}
): Promise<SearchResultPlace[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const limit = options.limit ?? 10;

  // 1. Try Photon (fast, typeahead-friendly)
  try {
    const params: Record<string, string | number> = {
      q: trimmed,
      limit,
    };
    if (options.latitude !== undefined && options.longitude !== undefined) {
      params.lat = options.latitude;
      params.lon = options.longitude;
    }

    const res = await axios.get<{ features: PhotonFeature[] }>('https://photon.komoot.io/api/', {
      params,
      timeout: 5000,
      signal: options.signal,
    });

    if (res.data?.features && res.data.features.length > 0) {
      return res.data.features
        .filter((f) => f.geometry?.coordinates?.length === 2 && f.properties?.name)
        .map((f, index) => {
          const [lon, lat] = f.geometry.coordinates;
          const p = f.properties;
          const name = p.name ?? 'Unknown place';
          const address = formatPhotonAddress(p);
          const category = p.osm_value || p.osm_key || p.type || undefined;

          return {
            id: p.osm_id ? `osm-${p.osm_id}` : `photon-${index}-${Date.now()}`,
            name,
            address: address || name,
            latitude: lat,
            longitude: lon,
            category,
            city: p.city || p.district,
            country: p.country,
            postcode: p.postcode,
          };
        });
    }
  } catch (err: unknown) {
    if (axios.isCancel(err)) {
      throw err;
    }
    // Continue to fallback
  }

  // 2. Fallback to Nominatim
  try {
    const nomParams: Record<string, string | number> = {
      q: trimmed,
      format: 'json',
      addressdetails: 1,
      limit,
    };

    const res = await axios.get<NominatimResult[]>('https://nominatim.openstreetmap.org/search', {
      params: nomParams,
      headers: {
        'User-Agent': 'TripTideMobileApp/1.0',
      },
      timeout: 5000,
      signal: options.signal,
    });

    if (Array.isArray(res.data)) {
      return res.data.map((item) => {
        const parts: string[] = [];
        if (item.address) {
          const street = [item.address.house_number, item.address.road].filter(Boolean).join(' ');
          if (street) parts.push(street);
          if (item.address.suburb) parts.push(item.address.suburb);
          const city = item.address.city || item.address.town;
          if (city) parts.push(city);
          if (item.address.state) parts.push(item.address.state);
          if (item.address.country) parts.push(item.address.country);
        }

        const name = item.display_name.split(',')[0]?.trim() || item.display_name;
        const address = parts.length > 0 ? parts.join(', ') : item.display_name;

        return {
          id: `nom-${item.place_id}`,
          name,
          address,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          category: item.type || item.class,
          city: item.address?.city || item.address?.town,
          country: item.address?.country,
          postcode: item.address?.postcode,
        };
      });
    }
  } catch (err: unknown) {
    if (axios.isCancel(err)) throw err;
  }

  return [];
}
