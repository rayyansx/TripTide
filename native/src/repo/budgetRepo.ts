import type { BudgetCreateItemRequest, BudgetItem, BudgetUpdateItemRequest } from '@trek/shared';
import { apiClient } from '../api/client';

export async function list(tripId: number): Promise<BudgetItem[]> {
  const { data } = await apiClient.get<{ items: BudgetItem[] }>(`/trips/${tripId}/budget`);
  return data.items;
}

export async function create(tripId: number, body: BudgetCreateItemRequest): Promise<BudgetItem> {
  const { data } = await apiClient.post<{ item: BudgetItem }>(`/trips/${tripId}/budget`, body);
  return data.item;
}

export async function update(tripId: number, itemId: number, body: BudgetUpdateItemRequest): Promise<BudgetItem> {
  const { data } = await apiClient.put<{ item: BudgetItem }>(`/trips/${tripId}/budget/${itemId}`, body);
  return data.item;
}

export async function destroy(tripId: number, itemId: number): Promise<void> {
  await apiClient.delete(`/trips/${tripId}/budget/${itemId}`);
}
