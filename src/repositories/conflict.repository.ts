export interface StoredConflict {
  id: string;
  activityId: string;
  otherActivityId: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
  overlapEndedAt: string | null;
  reopenGeneration: number;
}

export interface ConflictRepository {
  findById(id: string): Promise<StoredConflict | null>;
  findPair(a: string, b: string): Promise<StoredConflict | null>;
  listForActivities(ids: string[]): Promise<StoredConflict[]>;
  insert(row: { activityId: string; otherActivityId: string; message: string }): Promise<StoredConflict>;
  markEnded(id: string): Promise<void>;
  reopen(id: string, generation: number): Promise<StoredConflict>;
  accept(id: string, userId: string): Promise<StoredConflict>;
}
