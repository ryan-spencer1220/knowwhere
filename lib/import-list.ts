import Papa from "papaparse";

import { fetchDetails, resolvePlaceId, type Coords, type Spot } from "@/lib/places-search";
import { supabase } from "@/lib/supabase";

// A single row parsed out of a Google Takeout "Saved" list CSV.
export type ImportRow = { title: string; note: string; url: string };

// The outcome of trying to match one imported row to a real Google place.
export type ResolvedRow =
  | { status: "matched"; row: ImportRow; spot: Spot }
  | { status: "unmatched"; row: ImportRow };

// Google's column names have drifted over the years; accept the known aliases.
const TITLE_KEYS = ["title", "name"];
const NOTE_KEYS = ["note", "comment", "notes"];
const URL_KEYS = ["url", "link"];

function pick(record: Record<string, string>, keys: string[]): string {
  for (const [k, v] of Object.entries(record)) {
    if (keys.includes(k.trim().toLowerCase()) && v) return v.trim();
  }
  return "";
}

// Parse a Google Takeout list CSV into rows. Tolerates header-name variants,
// quoted fields containing commas/newlines, and drops empty/untitled rows.
export function parseTakeoutCsv(text: string): ImportRow[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const records = (parsed.data ?? []).filter((r) => r && typeof r === "object");
  return records
    .map((r) => ({ title: pick(r, TITLE_KEYS), note: pick(r, NOTE_KEYS), url: pick(r, URL_KEYS) }))
    .filter((r) => r.title.length > 0);
}

// Best-effort extraction of coordinates embedded in a Google Maps URL so we can
// bias the text search. Handles the `@lat,lng` and `!3dLAT!4dLNG` forms; returns
// null when neither is present (resolution still works, just less precisely).
export function extractLocationHint(url: string): Coords | null {
  if (!url) return null;
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { latitude: parseFloat(at[1]), longitude: parseFloat(at[2]) };
  const dm = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dm) return { latitude: parseFloat(dm[1]), longitude: parseFloat(dm[2]) };
  return null;
}

// Resolve one row to a real place: text-search for its place_id (biased by any
// URL coordinates), then fetch details for coordinates/name/address.
async function resolveRow(row: ImportRow): Promise<ResolvedRow> {
  try {
    const hint = extractLocationHint(row.url);
    const placeId = await resolvePlaceId(row.title, hint);
    if (!placeId) return { status: "unmatched", row };
    const spot = await fetchDetails(placeId);
    if (!spot) return { status: "unmatched", row };
    return { status: "matched", row, spot };
  } catch {
    return { status: "unmatched", row };
  }
}

// Run an async mapper over items with a bounded number of concurrent calls,
// reporting progress as each settles and preserving input order.
async function mapPool<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
      done += 1;
      onProgress?.(done, items.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// Resolve every CSV row with a bounded number of concurrent requests, reporting
// progress as each one settles. Preserves input order in the returned array.
export function resolveRows(
  rows: ImportRow[],
  onProgress?: (done: number, total: number) => void,
  concurrency = 4,
): Promise<ResolvedRow[]> {
  return mapPool(rows, resolveRow, concurrency, onProgress);
}

// One place as returned by the shared-list scraper (via the import-list edge
// function). placeId and coordinates are usually present, but not guaranteed.
export type SharedListPlace = {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
};

// Turn a scraped place into a review row. When the scraper already gave us a
// Google place_id + coordinates we use them directly (no extra lookup);
// otherwise we fall back to resolving by name near its coordinates.
async function resolveSharedPlace(p: SharedListPlace): Promise<ResolvedRow> {
  const row: ImportRow = { title: p.name, note: "", url: "" };
  const coords: Coords | null =
    typeof p.latitude === "number" && typeof p.longitude === "number"
      ? { latitude: p.latitude, longitude: p.longitude }
      : null;
  if (p.placeId && coords) {
    return { status: "matched", row, spot: { id: p.placeId, name: p.name, address: p.address, latitude: coords.latitude, longitude: coords.longitude } };
  }
  try {
    const placeId = p.placeId ?? (await resolvePlaceId(p.name, coords));
    if (!placeId) return { status: "unmatched", row };
    const spot = await fetchDetails(placeId);
    if (!spot) return { status: "unmatched", row };
    return { status: "matched", row, spot };
  } catch {
    return { status: "unmatched", row };
  }
}

// supabase-js wraps a non-2xx Edge Function response in a FunctionsHttpError
// whose `.message` is generic ("… non-2xx status code") and whose real body is
// stashed on `.context` (a Response). Dig out the server's own { error, detail }
// so failures like a missing APIFY_TOKEN actually reach the user.
async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: unknown })?.context;
  const res = ctx as { json?: () => Promise<unknown> } | undefined;
  if (res && typeof res.json === "function") {
    try {
      const body = (await res.json()) as { error?: string; detail?: string } | null;
      if (body?.error) return body.detail ? `${body.error} (${body.detail})` : body.error;
    } catch {
      // Body wasn't JSON / already consumed — fall through to the raw message.
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export type SharedListResult = {
  rows: ResolvedRow[];
  listName: string | null;
  // Raw place count the scraper returned before matching, so callers can tell a
  // genuinely empty/private list from a scraper that returned unreadable records.
  rawCount: number;
};

// Read a public shared Google Maps list from its link (via the import-list edge
// function) and turn it into review rows. Returns the resolved rows, the list's
// name (when the scraper reports it), and the raw scraped count.
export async function fetchSharedList(
  url: string,
  onProgress?: (done: number, total: number) => void,
): Promise<SharedListResult> {
  const { data, error } = await supabase.functions.invoke("import-list", { body: { url } });
  if (error) throw new Error(await functionErrorMessage(error, "Couldn't read that list."));
  const places = (data?.places ?? []) as SharedListPlace[];
  const rawCount = typeof data?.rawCount === "number" ? (data.rawCount as number) : places.length;
  const rows = await mapPool(places, resolveSharedPlace, 4, onProgress);
  return { rows, listName: (data?.listName ?? null) as string | null, rawCount };
}

// Turn a picked file's name into a sensible default list title.
export function listNameFromFile(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}
