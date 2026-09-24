import type { Day } from '@trek/shared';
import * as api from '../api/trips';

export const dayRepo = {
  async list(tripId: number): Promise<Day[]> {
    return api.listDays(tripId);
  },
};
