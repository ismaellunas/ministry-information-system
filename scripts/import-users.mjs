/**
 * Create logins from the master list using docs/church-id-map.json.
 *
 *   npm run import:users -- --confirm
 *
 * Run import:churches first. A person with no church is printed and skipped.
 * Password is the birthday as YYYYMMDD, or "password" when the birthday is unusable.
 * The first sign-in asks them to keep that password or set a new one.
 * NCMDC 1253 is also the section Presbytery. Nobody is marked Pastor.
 * An email that already exists is left as it is.
 */
import { readFile } from "node:fs/promises";
import { CHURCH_ID_MAP_PATH, PRESBYTERY_NCMDC, readMasterlist } from "./masterlist.mjs";
import { requireConfirm, throwIfError } from "./script-client.mjs";

const { url, supabase } = requireConfirm("import:users");

let map;
try {
  map = JSON.parse(await readFile(CHURCH_ID_MAP_PATH, "utf8"));
} catch {
  console.error(`Missing ${CHURCH_ID_MAP_PATH}. Run npm run import:churches -- --confirm first.`);
  process.exit(1);
}

const { noChurch, included } = readMasterlist();

async function findUserByEmail(email) {
  const perPage = 200;
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    throwIfError(error, "Listing users");
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

try {
  console.log(`Importing ${included.length} users on ${url}`);
  for (const person of included) {
    const churchId = map[person.church];
    if (!churchId) {
      throw new Error(`No church id for ${person.church}. Run import:churches again.`);
    }
    if (!person.email) {
      throw new Error(`No email for no ${person.no} ${person.given} ${person.surname}`);
    }

    const existing = await findUserByEmail(person.email);
    if (existing) {
      console.log(`Kept ${person.email}`);
      continue;
    }

    const created = await supabase.auth.admin.createUser({
      email: person.email,
      password: person.password,
      email_confirm: true,
      user_metadata: { first_name: person.given, last_name: person.surname },
    });
    throwIfError(created.error, `Creating ${person.email}`);
    const userId = created.data.user.id;

    const profile = await supabase.from("profiles").insert({
      id: userId,
      first_name: person.given,
      last_name: person.surname,
      is_active: true,
      must_change_password: true,
      is_pastor: false,
      ncmdc_id: person.ncmdc,
    });
    if (profile.error) {
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Profile for ${person.email}: ${profile.error.message}`);
    }

    const churchRole = await supabase.from("profile_roles").insert({
      profile_id: userId,
      role: "CHURCH_REP",
      church_id: churchId,
    });
    if (churchRole.error) {
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Church role for ${person.email}: ${churchRole.error.message}`);
    }

    if (person.ncmdc === PRESBYTERY_NCMDC) {
      const presbytery = await supabase.from("profile_roles").insert({
        profile_id: userId,
        role: "SECTION_PRESBYTERY",
      });
      if (presbytery.error) {
        await supabase.auth.admin.deleteUser(userId);
        throw new Error(`Presbytery role for ${person.email}: ${presbytery.error.message}`);
      }
      console.log(`Created ${person.email} as Presbytery of ${person.church}`);
    } else {
      console.log(`Created ${person.email} for ${person.church}`);
    }
  }

  console.log(`No church, not imported (${noChurch.length})`);
  for (const person of noChurch) {
    console.log(`- no ${person.no} | NCMDC ${person.ncmdc} | ${person.given} ${person.surname} | ${person.credential}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
