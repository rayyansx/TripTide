import type {
  PackingBag,
  PackingCreateItemRequest,
  PackingItem,
  PackingUpdateItemRequest,
} from '@trek/shared';
import { apiClient } from '../api/client';

export const packingRepo = {
  /**
   * List all packing items for a trip.
   */
  async listItems(tripId: number): Promise<PackingItem[]> {
    const { data } = await apiClient.get<{ items: PackingItem[] }>(`/trips/${tripId}/packing`);
    return data.items ?? [];
  },

  /**
   * Create a new packing item.
   */
  async createItem(tripId: number, body: PackingCreateItemRequest): Promise<PackingItem> {
    const { data } = await apiClient.post<{ item: PackingItem }>(
      `/trips/${tripId}/packing`,
      body
    );
    return data.item;
  },

  /**
   * Update an existing packing item.
   */
  async updateItem(
    tripId: number,
    itemId: number,
    body: PackingUpdateItemRequest
  ): Promise<PackingItem> {
    const { data } = await apiClient.put<{ item: PackingItem }>(
      `/trips/${tripId}/packing/${itemId}`,
      body
    );
    return data.item;
  },

  /**
   * Toggle checked state of an item (optimistic support).
   */
  async toggleChecked(
    tripId: number,
    itemId: number,
    currentChecked: number
  ): Promise<PackingItem> {
    const newChecked = currentChecked === 1 ? 0 : 1;
    return this.updateItem(tripId, itemId, { checked: newChecked });
  },

  /**
   * Delete a packing item.
   */
  async deleteItem(tripId: number, itemId: number): Promise<boolean> {
    const { data } = await apiClient.delete<{ success: boolean }>(
      `/trips/${tripId}/packing/${itemId}`
    );
    return data.success;
  },

  /**
   * List packing bags for luggage assignment.
   */
  async listBags(tripId: number): Promise<PackingBag[]> {
    try {
      const { data } = await apiClient.get<{ bags: PackingBag[] }>(
        `/trips/${tripId}/packing/bags`
      );
      return data.bags ?? [];
    } catch {
      return [];
    }
  },
};
