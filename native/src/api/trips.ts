import type { Day, Place, Trip, TripCreateRequest } from '@trek/shared';
import { apiClient } from './client';

export async function listTrips(): Promise<Trip[]> {
  const { data } = await apiClient.get<{ trips: Trip[] }>('/trips');
  return data.trips;
}

export async function getTrip(id: number): Promise<Trip> {
  const { data } = await apiClient.get<{ trip: Trip }>(`/trips/${id}`);
  return data.trip;
}

export async function listDays(tripId: number): Promise<Day[]> {
  const { data } = await apiClient.get<{ days: Day[] }>(`/trips/${tripId}/days`);
  return data.days;
}

export async function listPlaces(tripId: number): Promise<Place[]> {
  const { data } = await apiClient.get<{ places: Place[] }>(`/trips/${tripId}/places`);
  return data.places;
}

export async function createTrip(body: TripCreateRequest): Promise<Trip> {
  const { data } = await apiClient.post<{ trip: Trip }>('/trips', body);
  return data.trip;
}

export interface CoverPhoto {
  id: string;
  url: string;
  thumb: string;
  description: string | null;
  photographer: string | null;
}

export async function searchCoverPhotos(query: string): Promise<CoverPhoto[]> {
  const { data } = await apiClient.get<{ photos: CoverPhoto[] }>('/trips/cover-images/search', { params: { query } });
  return data.photos ?? [];
}

export async function updateTrip(id: number, body: { cover_image?: string | null; title?: string }): Promise<Trip> {
  const { data } = await apiClient.put<{ trip: Trip }>(`/trips/${id}`, body);
  return data.trip;
}
