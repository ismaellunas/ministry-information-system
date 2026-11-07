/**
 * Wipe application data on the Supabase project in .env.local and leave one admin.
 *
 *   npm run db:reset-data -- --confirm
 *
 * Deletes churches, members, events, notifications, audit rows, logos, and every
 * login. Keeps the schema and the six ministry rows from the migrations.
 * Does not run unless --confirm is passed.
 */
import { createClient } from "@supabase/supabase-js";

const EMAIL = "admin@west.info";
const PASSWORD = "secret";
const FIRST_NAME = "West";
const LAST_NAME = "Adminstrator";

const TABLES = [
  ["activity_conflicts", "id"],
  ["activities", "id"],
  ["notifications", "id"],
  ["push_subscriptions", "id"],
  ["members", "id"],
  ["church_department_counts", "church_id"],
  ["audit_log", "id"],
  ["profile_roles", "id"],
  ["churches", "id"],
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const confirmed = process.argv.includes("--confirm");

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: npm run db:reset-data -- --confirm"
  );
  process.exit(1);
}

if (!confirmed) {
  console.error(
    `Refusing to wipe ${url}.\n` +
      "This deletes every church, member, event, and login on that project.\n" +
      "Run with: npm run db:reset-data -- --confirm"
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

function throwIfError(error, context) {
  if (!error) return;
  throw new Error(`${context}: ${error.message ?? error}`);
}

async function clearTable(table, column) {
  let removed = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).delete().not(column, "is", null).select(column);
    throwIfError(error, `Clearing ${table}`);
    const count = data?.length ?? 0;
    removed += count;
    if (count === 0) break;
  }
  console.log(`Cleared ${table} (${removed} rows)`);
}

async function listLogoPaths(prefix) {
  const paths = [];
  const { data, error } = await supabase.storage.from("church-logos").list(prefix, { limit: 1000 });
  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    if (message.includes("not found") || message.includes("bucket")) return paths;
    throw new Error(`Listing church logos: ${error.message}`);
  }
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id == null) paths.push(...(await listLogoPaths(path)));
    else paths.push(path);
  }
  return paths;
}

async function clearLogos() {
  const paths = await listLogoPaths("");
  for (let index = 0; index < paths.length; index += 100) {
    const batch = paths.slice(index, index + 100);
    const { error } = await supabase.storage.from("church-logos").remove(batch);
    throwIfError(error, "Removing church logos");
  }
  console.log(`Cleared church-logos (${paths.length} files)`);
}

async function deleteAuthUsers() {
  let removed = 0;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    throwIfError(error, "Listing users");
    if (data.users.length === 0) break;
    for (const user of data.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      throwIfError(deleteError, `Deleting user ${user.email ?? user.id}`);
      removed += 1;
    }
  }
  console.log(`Deleted auth users (${removed})`);
}

async function seedAdmin() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: FIRST_NAME, last_name: LAST_NAME },
  });
  throwIfError(error, "Creating admin login");

  const userId = data.user.id;
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      first_name: FIRST_NAME,
      last_name: LAST_NAME,
      is_active: true,
      must_change_password: false,
    },
    { onConflict: "id" }
  );
  throwIfError(profileError, "Creating admin profile");

  const { error: roleError } = await supabase.from("profile_roles").insert({
    profile_id: userId,
    role: "ADMIN",
  });
  throwIfError(roleError, "Assigning ADMIN role");
  console.log(`Admin ready: ${EMAIL}`);
}

try {
  console.log(`Resetting data on ${url}`);
  for (const [table, column] of TABLES) {
    await clearTable(table, column);
  }
  await clearLogos();
  await deleteAuthUsers();
  await seedAdmin();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
