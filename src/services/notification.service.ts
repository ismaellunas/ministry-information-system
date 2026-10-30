import type { NotificationRepository } from "@/repositories/notification.repository";

export class NotificationService {
  constructor(private readonly notifications: NotificationRepository) {}

  list() {
    return this.notifications.listMine();
  }

  markRead(id: string) {
    return this.notifications.markRead(id);
  }
}
