import "server-only";

/**
 * Server-side composition root.
 * Wire repositories → services here. Route handlers import from this file.
 * Services never read process.env; config is injected by this root.
 *
 * Populated in Phase 2 when the first services are added.
 */
export {};
