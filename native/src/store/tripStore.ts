import type { Trip, TripCreateRequest } from '@trek/shared';
import { create } from 'zustand';
import { tripRepo } from '../repo/tripRepo';

interface TripState {
  trips: Trip[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  loadTrips: () => Promise<void>;
  saveTrip: (existing: Trip | null, body: TripCreateRequest, coverUrl: string | null) => Promise<Trip>;
  setCover: (id: number, coverUrl: string) => Promise<void>;
  setArchived: (id: number, archived: boolean) => Promise<void>;
  removeTrip: (id: number) => Promise<void>;
  copyTrip: (id: number, title: string) => Promise<Trip>;
}

function mergeTrip(trips: Trip[], trip: Trip): Trip[] {
  return trips.map((item) => (item.id === trip.id ? { ...item, ...trip } : item));
}

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  status: 'idle',
  error: null,
  async loadTrips() {
    set({ status: 'loading', error: null });
    try {
      const trips = await tripRepo.list();
      set({ trips, status: 'ready' });
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : 'Failed to load trips' });
    }
  },
  async saveTrip(existing, body, coverUrl) {
    let trip = existing ? await tripRepo.update(existing.id, body) : await tripRepo.create(body);
    if (coverUrl && coverUrl !== (existing?.cover_image ?? null)) {
      trip = await tripRepo.updateCover(trip.id, coverUrl);
    }
    set((state) => ({
      trips: existing ? mergeTrip(state.trips, trip) : [trip, ...state.trips.filter((item) => item.id !== trip.id)],
      status: 'ready',
    }));
    return trip;
  },
  async setCover(id, coverUrl) {
    const trip = await tripRepo.updateCover(id, coverUrl);
    set((state) => ({ trips: mergeTrip(state.trips, trip) }));
  },
  async setArchived(id, archived) {
    const trip = await tripRepo.update(id, { is_archived: archived });
    set((state) => ({ trips: mergeTrip(state.trips, trip) }));
  },
  async removeTrip(id) {
    await tripRepo.remove(id);
    set((state) => ({ trips: state.trips.filter((item) => item.id !== id) }));
  },
  async copyTrip(id, title) {
    const trip = await tripRepo.copy(id, { title });
    set((state) => ({ trips: [trip, ...state.trips.filter((item) => item.id !== trip.id)], status: 'ready' }));
    return trip;
  },
}));
