/**
 * Browser composition root. Screens call these functions.
 * Dexie stays behind this module; conflict rules stay in src/domain.
 */
export {
  clearLocalDatabase,
  dropStoredEvent,
  keepMine,
  keepServer,
  listMemberOutboxProblems,
  listOutboxProblems,
  listStoredActivities,
  memberOutboxCounts,
  pendingEntityIds,
  previewLocalSave,
  queueEventRemove,
  queueEventSave,
  queueMemberCreate,
  readLocalDraft,
  readSyncMeta,
  rememberSeen,
  retryMemberOutboxRow,
  runSync,
  subscribeSync,
  unsentCount,
} from "@/lib/sync-client";
