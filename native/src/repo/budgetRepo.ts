import type {
  BudgetItem,
  BudgetCreateItemRequest,
  BudgetUpdateItemRequest,
  BudgetSettlement,
  BudgetCreateSettlementRequest,
} from '@trek/shared';
import { apiClient } from '../api/client';
import type { TripMemberInfo } from '../api/debtEngine';

export interface TripMembersResponse {
  owner: {
    id: number;
    username: string;
    avatar_url?: string | null;
  };
  members: Array<{
    id: number;
    username: string;
    avatar_url?: string | null;
    is_guest?: boolean;
  }>;
}

export const budgetRepo = {
  async listItems(tripId: number): Promise<BudgetItem[]> {
    const { data } = await apiClient.get<{ items: BudgetItem[] }>(`/trips/${tripId}/budget`);
    return data.items ?? [];
  },

  async createItem(tripId: number, body: BudgetCreateItemRequest): Promise<BudgetItem> {
    const { data } = await apiClient.post<{ item: BudgetItem }>(`/trips/${tripId}/budget`, body);
    return data.item;
  },

  async updateItem(
    tripId: number,
    itemId: number,
    body: BudgetUpdateItemRequest
  ): Promise<BudgetItem> {
    const { data } = await apiClient.put<{ item: BudgetItem }>(
      `/trips/${tripId}/budget/${itemId}`,
      body
    );
    return data.item;
  },

  async deleteItem(tripId: number, itemId: number): Promise<boolean> {
    const { data } = await apiClient.delete<{ success: boolean }>(
      `/trips/${tripId}/budget/${itemId}`
    );
    return data.success;
  },

  async listSettlements(tripId: number): Promise<BudgetSettlement[]> {
    const { data } = await apiClient.get<{ settlements: BudgetSettlement[] }>(
      `/trips/${tripId}/budget/settlements`
    );
    return data.settlements ?? [];
  },

  async createSettlement(
    tripId: number,
    body: BudgetCreateSettlementRequest
  ): Promise<BudgetSettlement> {
    const { data } = await apiClient.post<{ settlement: BudgetSettlement }>(
      `/trips/${tripId}/budget/settlements`,
      body
    );
    return data.settlement;
  },

  async deleteSettlement(tripId: number, settlementId: number): Promise<boolean> {
    const { data } = await apiClient.delete<{ success: boolean }>(
      `/trips/${tripId}/budget/settlements/${settlementId}`
    );
    return data.success;
  },

  async listMembers(tripId: number): Promise<TripMemberInfo[]> {
    try {
      const { data } = await apiClient.get<TripMembersResponse>(`/trips/${tripId}/members`);
      const all: TripMemberInfo[] = [];

      if (data.owner) {
        all.push({
          id: data.owner.id,
          name: data.owner.username,
          avatarUrl: data.owner.avatar_url,
        });
      }

      if (data.members) {
        for (const m of data.members) {
          if (!all.some((existing) => existing.id === m.id)) {
            all.push({
              id: m.id,
              name: m.username,
              avatarUrl: m.avatar_url,
            });
          }
        }
      }

      return all;
    } catch {
      return [];
    }
  },
};
