import type { Trip } from '@trek/shared';
import { create } from 'zustand';
import { tripRepo } from '../repo/tripRepo';

interface TripState {
  trips: Trip[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  loadTrips: () => Promise<void>;
  createTrip: (title: string, coverUrl?: string | null) => Promise<Trip>;
  setCover: (id: number, coverUrl: string) => Promise<void>;
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
  async createTrip(title: string, coverUrl?: string | null) {
    let trip = await tripRepo.create({ title });
    if (coverUrl) trip = await tripRepo.updateCover(trip.id, coverUrl);
    set((state) => ({ trips: [trip, ...state.trips.filter((item) => item.id !== trip.id)], status: 'ready' }));
    return trip;
  },
  async setCover(id: number, coverUrl: string) {
    const trip = await tripRepo.updateCover(id, coverUrl);
    set((state) => ({ trips: state.trips.map((item) => (item.id === id ? trip : item)) }));
  },
}));
