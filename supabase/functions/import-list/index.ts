// Supabase Edge Function: reads a *public* shared Google Maps list from its
// link and returns the places in it. Google exposes no API for saved/shared
// lists, and the shared page is a JS-rendered deep link that a plain fetch
// can't read, so we delegate to a managed headless-browser scraper (Apify).
// The API token stays server-side as the APIFY_TOKEN secret.
//
// Deploy:  supabase functions deploy import-list
// Secrets: supabase secrets set APIFY_TOKEN=<your apify token>
//          # optional — override the default actor:
//          supabase secrets set APIFY_ACTOR=parseforge~google-maps-shared-list-scraper

const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN") ?? "";
const APIFY_ACTOR = Deno.env.get("APIFY_ACTOR") ?? "parseforge~google-maps-shared-list-scraper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Accept only Google Maps links so we don't hand arbitrary URLs to the scraper.
function isMapsUrl(url: string): boolean {
  return /^https?:\/\/([a-z0-9-]+\.)*(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+)/i.test(url);
}

// Pull the fields we care about out of a scraper record, tolerating the field
// name variants different actors use.
function normalize(item: Record<string, unknown>) {
  const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : null);
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    name: str(item.name) ?? str(item.title) ?? "",
    address: str(item.address) ?? str(item.formattedAddress) ?? "",
    latitude: num(item.latitude ?? item.lat),
    longitude: num(item.longitude ?? item.lng ?? item.lon),
    placeId: str(item.placeId) ?? str(item.place_id) ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!APIFY_TOKEN) return json({ error: "Missing APIFY_TOKEN secret." }, 500);

  try {
    const body = await req.json();
    const url: string = (body.url ?? "").trim();
    if (!url) return json({ error: "No list link provided." }, 400);
    if (!isMapsUrl(url)) return json({ error: "That doesn't look like a Google Maps link." }, 400);

    // Run the actor and wait for its dataset in one call. `timeout` caps how long
    // we block; large lists that exceed it surface as a friendly error client-side.
    const endpoint = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=200`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listUrls: [url] }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json({ error: "Couldn't read that list.", detail: detail.slice(0, 300) }, 502);
    }

    const items = (await res.json()) as Record<string, unknown>[];
    const list = Array.isArray(items) ? items : [];
    const places = list.map(normalize).filter((p) => p.name);
    // Best-effort list title from the scraper's source-list metadata.
    const first = list[0] ?? {};
    const listName =
      (Array.isArray(first.sourceListNames) ? (first.sourceListNames[0] as string) : null) ??
      (typeof first.sourceListName === "string" ? first.sourceListName : null) ??
      null;

    // `rawCount` lets the client (and us) tell apart the two empty-result cases:
    //   rawCount 0            -> the scraper actor returned nothing (broken actor,
    //                            plan/rental limit, or a genuinely private/empty list)
    //   rawCount > 0, places 0 -> the actor returned records we couldn't read
    //                            (its output field names drifted; update normalize)
    return json({ places, listName, rawCount: list.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
