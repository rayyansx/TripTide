import type { Day, DayCreateRequest, DayUpdateRequest } from '@trek/shared';
import * as api from '../api/itinerary';

export const dayRepo = {
  async list(tripId: number): Promise<Day[]> {
    return api.listDays(tripId);
  },

  async create(tripId: number, body?: DayCreateRequest): Promise<Day> {
    return api.createDay(tripId, body);
  },

  async update(tripId: number, dayId: number, body: DayUpdateRequest): Promise<Day> {
    return api.updateDay(tripId, dayId, body);
  },

  async reorder(tripId: number, orderedIds: number[]): Promise<boolean> {
    return api.reorderDays(tripId, orderedIds);
  },

  async delete(tripId: number, dayId: number): Promise<boolean> {
    return api.deleteDay(tripId, dayId);
  },
};
