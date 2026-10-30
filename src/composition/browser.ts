/**
 * Browser composition root. Screens call these functions.
 * Dexie stays behind this module; conflict rules stay in src/domain.
 */
export {
  clearLocalDatabase,
  keepMine,
  keepServer,
  listOutboxProblems,
  listStoredActivities,
  pendingEntityIds,
  previewLocalSave,
  queueEventRemove,
  queueEventSave,
  readLocalDraft,
  readSyncMeta,
  rememberSeen,
  runSync,
  subscribeSync,
  unsentCount,
} from "@/lib/sync-client";
