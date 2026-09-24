import type { Trip, TripCreateRequest } from '@trek/shared';
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
  async updateCover(id: number, coverUrl: string): Promise<Trip> {
    return api.updateTrip(id, { cover_image: coverUrl });
  },
};
