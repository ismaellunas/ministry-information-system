/**
 * Bootstrap the first ADMIN user against the Supabase project in env.
 *
 *   npm run seed:admin
 *
 * Safe to re-run: existing user, profile, and ADMIN role are updated in place.
 */
import { createClient } from "@supabase/supabase-js";

const EMAIL = "aognaawan@gmail.com";
const PASSWORD = "secret";
const FIRST_NAME = "GEWCI";
const LAST_NAME = "Pastor";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: npm run seed:admin"
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

async function findUserByEmail(email) {
  const perPage = 200;
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser() {
  const existing = await findUserByEmail(EMAIL);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: FIRST_NAME, last_name: LAST_NAME },
    });
    if (error) throw error;
    console.log(`Updated auth user ${data.user.id}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: FIRST_NAME, last_name: LAST_NAME },
  });
  if (error) throw error;
  console.log(`Created auth user ${data.user.id}`);
  return data.user;
}

function throwIfError(error, context) {
  if (!error) return;
  if (error.code === "PGRST205") {
    throw new Error(
      `${context}: app tables are missing on this Supabase project. ` +
        "Push supabase/migrations first (`supabase db push`), then re-run `npm run seed:admin`."
    );
  }
  throw new Error(`${context}: ${error.message ?? error}`);
}

async function ensureProfile(userId) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      first_name: FIRST_NAME,
      last_name: LAST_NAME,
      is_active: true,
      must_change_password: false,
    },
    { onConflict: "id" }
  );
  throwIfError(error, "Creating profile");
}

async function ensureAdminRole(userId) {
  const { data, error: readError } = await supabase
    .from("profile_roles")
    .select("id")
    .eq("profile_id", userId)
    .eq("role", "ADMIN")
    .maybeSingle();
  throwIfError(readError, "Reading admin role");
  if (data) return;

  const { error } = await supabase.from("profile_roles").insert({
    profile_id: userId,
    role: "ADMIN",
  });
  throwIfError(error, "Assigning ADMIN role");
}

try {
  const user = await ensureAuthUser();
  await ensureProfile(user.id);
  await ensureAdminRole(user.id);
  console.log(`Admin seed complete for ${EMAIL}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
