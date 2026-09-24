import type { Place } from '@trek/shared';
import * as api from '../api/trips';

export const placeRepo = {
  async list(tripId: number): Promise<Place[]> {
    return api.listPlaces(tripId);
  },
};
