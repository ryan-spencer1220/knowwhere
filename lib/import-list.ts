import Papa from "papaparse";

import { fetchDetails, resolvePlaceId, type Coords, type Spot } from "@/lib/places-search";

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

// Resolve every row with a bounded number of concurrent requests, reporting
// progress as each one settles. Preserves input order in the returned array.
export async function resolveRows(
  rows: ImportRow[],
  onProgress?: (done: number, total: number) => void,
  concurrency = 4,
): Promise<ResolvedRow[]> {
  const results = new Array<ResolvedRow>(rows.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= rows.length) return;
      results[i] = await resolveRow(rows[i]);
      done += 1;
      onProgress?.(done, rows.length);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, rows.length) }, worker);
  await Promise.all(workers);
  return results;
}

// Turn a picked file's name into a sensible default list title.
export function listNameFromFile(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}
