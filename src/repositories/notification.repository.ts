export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationWrite {
  userId: string;
  type: string;
  title: string;
  body: string;
  dedupeKey: string;
  data: Record<string, unknown>;
}

export interface NotificationRepository {
  listMine(): Promise<AppNotification[]>;
  markRead(id: string): Promise<void>;
  /** Ignores a duplicate dedupe key. */
  insertIgnore(row: NotificationWrite): Promise<void>;
}
