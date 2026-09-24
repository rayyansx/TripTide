import type {
  Assignment,
  AssignmentCreateRequest,
  AssignmentMoveRequest,
  AssignmentTimeRequest,
} from '@trek/shared';
import * as api from '../api/itinerary';

export const assignmentRepo = {
  async list(tripId: number, dayId: number): Promise<Assignment[]> {
    return api.listAssignments(tripId, dayId);
  },

  async create(tripId: number, dayId: number, body: AssignmentCreateRequest): Promise<Assignment> {
    return api.createAssignment(tripId, dayId, body);
  },

  async reorder(tripId: number, dayId: number, orderedIds: number[]): Promise<boolean> {
    return api.reorderAssignments(tripId, dayId, orderedIds);
  },

  async delete(tripId: number, dayId: number, assignmentId: number): Promise<boolean> {
    return api.deleteAssignment(tripId, dayId, assignmentId);
  },

  async move(tripId: number, assignmentId: number, body: AssignmentMoveRequest): Promise<Assignment> {
    return api.moveAssignment(tripId, assignmentId, body);
  },

  async setTimes(
    tripId: number,
    assignmentId: number,
    times: AssignmentTimeRequest
  ): Promise<Assignment> {
    return api.updateAssignmentTime(tripId, assignmentId, times);
  },

  async setNotes(
    tripId: number,
    assignmentId: number,
    notes: string | null
  ): Promise<void> {
    return api.updateAssignmentNotes(tripId, assignmentId, { notes });
  },
};
