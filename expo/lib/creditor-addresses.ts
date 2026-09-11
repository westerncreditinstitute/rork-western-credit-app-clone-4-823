/**
 * Known Creditor / Furnisher Mailing Address Lookup
 * ---------------------------------------------------
 * IMPORTANT CONTEXT: The Equifax OneView API's trade line data (`Trade`
 * schema) does NOT include a furnisher/creditor mailing address field.
 * It only returns `customerName` and `customerNumber` (an internal
 * Equifax-assigned code for the reporting member) — there is no street
 * address, city, state, or zip anywhere in the trade line payload.
 *
 * Because dispute letters legally need a mailing address for the
 * creditor/furnisher/collection agency being disputed, this module
 * provides a best-effort lookup of publicly known dispute/correspondence
 * addresses for common creditors. This is standard practice in credit
 * repair tooling: the bureau tells you WHO reported the account, and a
 * separate, maintained address book tells you WHERE to mail the dispute.
 *
 * When a creditor isn't found in this table, callers should clearly
 * show "Address not available — please verify before mailing" rather
 * than guessing, so users are never misled into mailing a letter to a
 * wrong address.
 */

export interface CreditorAddressEntry {
  name: string;
  address: string;
}

/**
 * Lookup table of known creditor / furnisher mailing addresses.
 * Keys are lowercased, trimmed creditor names for case-insensitive matching.
 * Addresses are publicly available correspondence addresses commonly used
 * for credit bureau/dispute correspondence.
 */
const KNOWN_CREDITOR_ADDRESSES: Record<string, string> = {
  "capital one": "Capital One, Attn: Disputes, PO Box 30285, Salt Lake City, UT 84130",
  "chase bank": "JPMorgan Chase Bank, Attn: Credit Bureau Disputes, PO Box 15298, Wilmington, DE 19850",
  "chase": "JPMorgan Chase Bank, Attn: Credit Bureau Disputes, PO Box 15298, Wilmington, DE 19850",
  "bank of america": "Bank of America, Attn: Credit Bureau Disputes, PO Box 982238, El Paso, TX 79998",
  "discover card": "Discover Financial Services, Attn: Disputes, PO Box 30943, Salt Lake City, UT 84130",
  "discover": "Discover Financial Services, Attn: Disputes, PO Box 30943, Salt Lake City, UT 84130",
  "american express": "American Express, Attn: Credit Bureau Disputes, PO Box 981540, El Paso, TX 79998",
  "amex": "American Express, Attn: Credit Bureau Disputes, PO Box 981540, El Paso, TX 79998",
  "wells fargo": "Wells Fargo Bank, Attn: Credit Bureau Disputes, PO Box 14517, Des Moines, IA 50306",
  "citibank": "Citibank, Attn: Credit Bureau Disputes, PO Box 6500, Sioux Falls, SD 57117",
  "citi": "Citibank, Attn: Credit Bureau Disputes, PO Box 6500, Sioux Falls, SD 57117",
  "best buy credit": "Citibank / Best Buy Credit Card, Attn: Disputes, PO Box 6500, Sioux Falls, SD 57117",
  "amazon credit": "Synchrony Bank / Amazon Store Card, Attn: Disputes, PO Box 965015, Orlando, FL 32896",
  "synchrony": "Synchrony Bank, Attn: Disputes, PO Box 965015, Orlando, FL 32896",
  "portfolio recovery": "Portfolio Recovery Associates, LLC, 120 Corporate Blvd, Norfolk, VA 23502",
  "midland credit management": "Midland Credit Management, Inc., PO Box 939069, San Diego, CA 92193",
  "lvnv funding": "LVNV Funding LLC, c/o Resurgent Capital Services, PO Box 10587, Greenville, SC 29603",
  "convergent outsourcing": "Convergent Outsourcing, Inc., PO Box 9004, Renton, WA 98057",
  "credit one bank": "Credit One Bank, Attn: Disputes, PO Box 98873, Las Vegas, NV 89193",
  "synchrony bank": "Synchrony Bank, Attn: Disputes, PO Box 965015, Orlando, FL 32896",
  "us bank": "U.S. Bank, Attn: Credit Bureau Disputes, PO Box 5229, Cincinnati, OH 45201",
  "navy federal credit union": "Navy Federal Credit Union, PO Box 3000, Merrifield, VA 22119",
  "toyota financial": "Toyota Motor Credit Corporation, PO Box 8026, Cedar Rapids, IA 52408",
  "ally financial": "Ally Financial, Attn: Credit Bureau Disputes, PO Box 380901, Minneapolis, MN 55438",
};

/**
 * Look up a known mailing address for a creditor/furnisher by name.
 * Uses case-insensitive partial matching (handles "Capital One" vs
 * "Capital One Bank (USA), N.A." style variations from bureau data).
 *
 * Returns undefined when no match is found — callers should treat this
 * as "unknown" and prompt the user to verify/provide the address
 * themselves rather than displaying a guessed value.
 */
export function lookupCreditorAddress(creditorName: string | undefined | null): string | undefined {
  if (!creditorName) return undefined;
  const normalized = creditorName.trim().toLowerCase();
  if (!normalized) return undefined;

  // Exact match first
  if (KNOWN_CREDITOR_ADDRESSES[normalized]) {
    return KNOWN_CREDITOR_ADDRESSES[normalized];
  }

  // Partial match: check if any known key is contained in the creditor
  // name, or vice versa (handles suffixes like "N.A.", "Bank (USA)", etc.)
  for (const [key, address] of Object.entries(KNOWN_CREDITOR_ADDRESSES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return address;
    }
  }

  return undefined;
}

/**
 * Enrich a creditor address field: returns the provided address if
 * already present and non-empty, otherwise attempts a known-creditor
 * lookup, otherwise returns undefined (never fabricates an address).
 */
export function enrichCreditorAddress(
  creditorName: string | undefined | null,
  existingAddress?: string | null
): string | undefined {
  if (existingAddress && existingAddress.trim()) return existingAddress.trim();
  return lookupCreditorAddress(creditorName);
}
