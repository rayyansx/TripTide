import type { Trip, TripCreateRequest } from '@trek/shared';
import { create } from 'zustand';
import { tripRepo } from '../repo/tripRepo';
import { connectRealtime } from '../api/websocket';

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
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

function mergeTrip(trips: Trip[], trip: Trip): Trip[] {
  return trips.map((item) => (item.id === trip.id ? { ...item, ...trip } : item));
}

let wsInstance: WebSocket | null = null;

export const useTripStore = create<TripState>((set, get) => ({
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
  connectWebSocket() {
    if (wsInstance) return;

    connectRealtime((msg: unknown) => {
      // Reload trips entirely or handle specific mutation payloads
      // (a real world scenario checks if msg.type is trip_updated, etc. but a simple loadTrips covers it)
      if (msg && typeof msg === 'object' && 'type' in msg && msg.type !== 'welcome') {
        get().loadTrips();
      }
    }).then(socket => {
      wsInstance = socket;
    }).catch(console.error);
  },
  disconnectWebSocket() {
    if (wsInstance) {
      wsInstance.close();
      wsInstance = null;
    }
  }
}));
