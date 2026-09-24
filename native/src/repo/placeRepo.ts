import type { Place, PlaceCreateRequest, PlaceUpdateRequest } from '@trek/shared';
import * as api from '../api/itinerary';

export const placeRepo = {
  async list(tripId: number, params?: { search?: string; category?: string; tag?: string }): Promise<Place[]> {
    return api.listPlaces(tripId, params);
  },

  async get(tripId: number, placeId: number): Promise<Place> {
    return api.getPlace(tripId, placeId);
  },

  async create(tripId: number, body: PlaceCreateRequest): Promise<Place> {
    return api.createPlace(tripId, body);
  },

  async update(tripId: number, placeId: number, body: PlaceUpdateRequest): Promise<Place> {
    return api.updatePlace(tripId, placeId, body);
  },

  async delete(tripId: number, placeId: number): Promise<boolean> {
    return api.deletePlace(tripId, placeId);
  },
};
