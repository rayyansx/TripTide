import type { Day, Place, Trip, TripCopyRequest, TripCreateRequest, TripUpdateRequest } from '@trek/shared';
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

export async function updateTrip(id: number, body: TripUpdateRequest): Promise<Trip> {
  const { data } = await apiClient.put<{ trip: Trip }>(`/trips/${id}`, body);
  return data.trip;
}

export async function deleteTrip(id: number): Promise<void> {
  await apiClient.delete(`/trips/${id}`);
}

export async function copyTrip(id: number, body: TripCopyRequest): Promise<Trip> {
  const { data } = await apiClient.post<{ trip: Trip }>(`/trips/${id}/copy`, body);
  return data.trip;
}

export function tripErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { error?: string; message?: string } } }).response?.data;
    if (data?.error) return data.error;
    if (typeof data?.message === 'string') return data.message;
  }
  if (err && typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string' && (err as Error).message.startsWith('OFFLINE_QUEUED')) return 'Saved offline. Will sync when reconnected.';
  return err instanceof Error ? err.message : fallback;
}
