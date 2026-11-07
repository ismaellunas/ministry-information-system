/**
 * Create one church per name in the master list and write docs/church-id-map.json.
 *
 *   npm run import:churches -- --confirm
 *
 * Run this after `npm run db:reset-data -- --confirm`, and before import:users.
 * People with no church are printed and are not saved.
 * Stops if any church name has more than one address.
 */
import { writeFile } from "node:fs/promises";
import { CHURCH_ID_MAP_PATH, readMasterlist } from "./masterlist.mjs";
import { requireConfirm, throwIfError } from "./script-client.mjs";

const { url, supabase } = requireConfirm("import:churches");
const { noChurch, churches, conflicts } = readMasterlist();

if (conflicts.length > 0) {
  console.error("A church has more than one address. Fix the sheet before importing.");
  for (const conflict of conflicts) {
    console.error(`- ${conflict.name}`);
    for (const address of conflict.addresses) console.error(`    ${address}`);
  }
  process.exit(1);
}

function printSkipped() {
  console.log(`No church, not imported (${noChurch.length})`);
  for (const person of noChurch) {
    console.log(`- no ${person.no} | NCMDC ${person.ncmdc} | ${person.given} ${person.surname}`);
  }
}

try {
  console.log(`Importing ${churches.length} churches on ${url}`);
  const map = {};
  for (const church of churches) {
    const existing = await supabase.from("churches").select("id, address").eq("name", church.name).maybeSingle();
    throwIfError(existing.error, `Reading ${church.name}`);
    if (existing.data) {
      map[church.name] = existing.data.id;
      console.log(`Kept ${church.name} ${existing.data.id}`);
      continue;
    }
    const inserted = await supabase
      .from("churches")
      .insert({
        name: church.name,
        address: church.address,
        is_active: true,
      })
      .select("id")
      .single();
    throwIfError(inserted.error, `Creating ${church.name}`);
    map[church.name] = inserted.data.id;
    console.log(`Created ${church.name} ${inserted.data.id}`);
  }
  await writeFile(CHURCH_ID_MAP_PATH, `${JSON.stringify(map, null, 2)}\n`);
  console.log(`Wrote ${CHURCH_ID_MAP_PATH}`);
  printSkipped();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
