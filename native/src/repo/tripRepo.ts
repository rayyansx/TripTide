import type { Trip, TripCopyRequest, TripCreateRequest, TripUpdateRequest } from '@trek/shared';
import * as api from '../api/trips';

/**
 * Same method-shape as client/src/repo/tripRepo.ts (list/get) so this file
 * is a drop-in swap point once Phase 2 adds the offline read-through cache
 * and mutation queue — callers (hooks/screens) won't need to change. For
 * now this is online-first only: no Dexie/SQLite fallback on network
 * failure, and no optimistic writes.
 */
export const tripRepo = {
  async list(): Promise<Trip[]> {
    return api.listTrips();
  },
  async get(id: number): Promise<Trip> {
    return api.getTrip(id);
  },
  async create(body: TripCreateRequest): Promise<Trip> {
    return api.createTrip(body);
  },
  async update(id: number, body: TripUpdateRequest): Promise<Trip> {
    return api.updateTrip(id, body);
  },
  async updateCover(id: number, coverUrl: string): Promise<Trip> {
    return api.updateTrip(id, { cover_image: coverUrl });
  },
  async remove(id: number): Promise<void> {
    return api.deleteTrip(id);
  },
  async copy(id: number, body: TripCopyRequest): Promise<Trip> {
    return api.copyTrip(id, body);
  },
};
