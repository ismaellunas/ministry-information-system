const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** 12-character password, no ambiguous 0/O/1/l. */
export function generateTemporaryPassword(length = 12): string {
  if (length < 8) {
    throw new Error("Temporary passwords must be at least 8 characters.");
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
