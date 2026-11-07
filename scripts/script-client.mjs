import { createClient } from "@supabase/supabase-js";

export function requireConfirm(scriptName) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
        `Run with: npm run ${scriptName} -- --confirm`
    );
    process.exit(1);
  }
  if (!process.argv.includes("--confirm")) {
    console.error(
      `Refusing to write to ${url}.\n` +
        `Run with: npm run ${scriptName} -- --confirm`
    );
    process.exit(1);
  }
  if (typeof globalThis.WebSocket === "undefined") {
    globalThis.WebSocket = class {
      close() {}
    };
  }
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { url, supabase };
}

export function throwIfError(error, context) {
  if (!error) return;
  throw new Error(`${context}: ${error.message ?? error}`);
}
