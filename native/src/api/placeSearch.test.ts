import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchPlaces } from './placeSearch';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('placeSearch service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns empty array when query is empty or too short', async () => {
    expect(await searchPlaces('')).toEqual([]);
    expect(await searchPlaces(' ')).toEqual([]);
    expect(await searchPlaces('a')).toEqual([]);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('parses Photon API response correctly', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        features: [
          {
            geometry: {
              coordinates: [2.2945, 48.8584],
            },
            properties: {
              osm_id: 12345,
              name: 'Eiffel Tower',
              street: 'Avenue Anatole France',
              housenumber: '5',
              city: 'Paris',
              country: 'France',
              osm_key: 'tourism',
              osm_value: 'attraction',
            },
          },
        ],
      },
    });

    const results = await searchPlaces('Eiffel Tower');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: 'osm-12345',
      name: 'Eiffel Tower',
      address: '5 Avenue Anatole France, Paris, France',
      latitude: 48.8584,
      longitude: 2.2945,
      category: 'attraction',
      city: 'Paris',
      country: 'France',
      postcode: undefined,
    });
  });

  it('falls back to Nominatim when Photon fails', async () => {
    // Photon rejects
    mockedAxios.get.mockRejectedValueOnce(new Error('Photon timeout'));

    // Nominatim succeeds
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {
          place_id: 9876,
          display_name: 'Big Ben, Westminster, London, England',
          lat: '51.5007',
          lon: '-0.1246',
          type: 'clock_tower',
          address: {
            city: 'London',
            country: 'United Kingdom',
            postcode: 'SW1A 0AA',
          },
        },
      ],
    });

    const results = await searchPlaces('Big Ben');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Big Ben');
    expect(results[0].latitude).toBeCloseTo(51.5007);
    expect(results[0].longitude).toBeCloseTo(-0.1246);
    expect(results[0].city).toBe('London');
  });
});
