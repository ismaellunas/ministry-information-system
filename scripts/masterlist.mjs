/**
 * Read docs/west_section_masterlist.xls into churches and people.
 * People with no church are returned separately and are not logins.
 */
import XLSX from "xlsx";

export const MASTERLIST_PATH = "docs/west_section_masterlist.xls";
export const CHURCH_ID_MAP_PATH = "docs/church-id-map.json";
export const PRESBYTERY_NCMDC = "1253";

function clean(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ")
    .trim();
}

function letters(value) {
  return clean(value)
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "n")
    .replace(/[^A-Za-z]/g, "")
    .toLowerCase();
}

function birthday(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    if (year < 1900 || year > 2026) return null;
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const raw = clean(value);
  if (!raw || raw.startsWith("0000")) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1900 || year > 2026) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function readMasterlist(path = MASTERLIST_PATH) {
  const book = XLSX.readFile(path, { cellDates: true });
  const sheet = book.Sheets[book.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const people = rows.map((row) => {
    const surname = clean(row["Last Name"]);
    const given = clean(row["First Name"]);
    const givenFirst = given.split(/\s+/)[0] ?? "";
    const emailFirst = letters(givenFirst);
    const emailLast = letters(surname);
    const born = birthday(row.Birthdate);
    const church = clean(row.Church) || null;
    const address = clean(row["Church Address"]) || null;
    return {
      no: Number(row.No),
      ncmdc: clean(row["NCMDC ID"]).replace(/\.0$/, ""),
      given,
      surname,
      email: emailFirst && emailLast ? `${emailFirst}.${emailLast}@west.info` : null,
      born,
      password: born ? born.replace(/-/g, "") : "password",
      church,
      address,
      credential: clean(row.Credential),
    };
  });

  const noChurch = people.filter((person) => !person.church);
  const included = people.filter((person) => person.church);
  const byChurch = new Map();
  for (const person of included) {
    const addresses = byChurch.get(person.church) ?? new Set();
    if (person.address) addresses.add(person.address);
    byChurch.set(person.church, addresses);
  }

  const conflicts = [];
  const churches = [];
  for (const [name, addresses] of byChurch) {
    if (addresses.size > 1) conflicts.push({ name, addresses: [...addresses] });
    churches.push({ name, address: [...addresses][0] ?? null });
  }
  churches.sort((left, right) => left.name.localeCompare(right.name));

  return { people, noChurch, included, churches, conflicts };
}
