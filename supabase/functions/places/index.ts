// Supabase Edge Function: proxies Google Places API (New) so the API key
// stays server-side (set as the GOOGLE_PLACES_KEY secret) and never ships in
// the app bundle. Handles autocomplete + place details.
//
// Deploy:  supabase functions deploy places
// Secret:  supabase secrets set GOOGLE_PLACES_KEY=<your key>

const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_KEY") ?? "";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!GOOGLE_KEY) return json({ error: "Missing GOOGLE_PLACES_KEY secret." }, 500);

  try {
    const body = await req.json();

    if (body.type === "autocomplete") {
      const input: string = (body.input ?? "").trim();
      if (input.length < 2) return json({ predictions: [] });

      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_KEY },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data?.error?.message ?? "Places autocomplete failed." }, 502);

      const predictions = (data.suggestions ?? [])
        .filter((s: any) => s.placePrediction)
        .slice(0, 5)
        .map((s: any) => ({
          placeId: s.placePrediction.placeId,
          primary: s.placePrediction.structuredFormat?.mainText?.text ?? s.placePrediction.text?.text ?? "",
          secondary: s.placePrediction.structuredFormat?.secondaryText?.text ?? "",
        }));
      return json({ predictions });
    }

    if (body.type === "details") {
      const placeId: string = body.placeId ?? "";
      if (!placeId) return json({ place: null });

      const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
        headers: {
          "X-Goog-Api-Key": GOOGLE_KEY,
          "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
        },
      });
      const d = await res.json();
      if (!res.ok || !d.location) return json({ place: null });

      return json({
        place: {
          id: d.id,
          name: d.displayName?.text ?? "Unnamed place",
          address: d.formattedAddress ?? "",
          latitude: d.location.latitude,
          longitude: d.location.longitude,
        },
      });
    }

    if (body.type === "search") {
      // Resolve a place_id from a name + coordinates (used to backfill places
      // saved before we started storing the Google place_id).
      const query: string = (body.query ?? "").trim();
      if (!query) return json({ placeId: null });

      const reqBody: Record<string, unknown> = { textQuery: query, maxResultCount: 1 };
      if (typeof body.latitude === "number" && typeof body.longitude === "number") {
        reqBody.locationBias = {
          circle: { center: { latitude: body.latitude, longitude: body.longitude }, radius: 1000.0 },
        };
      }

      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_KEY, "X-Goog-FieldMask": "places.id,places.displayName" },
        body: JSON.stringify(reqBody),
      });
      const d = await res.json();
      if (!res.ok) return json({ placeId: null });
      return json({ placeId: d.places?.[0]?.id ?? null });
    }

    if (body.type === "place") {
      const placeId: string = body.placeId ?? "";
      if (!placeId) return json({ place: null });

      const fieldMask = [
        "id",
        "displayName",
        "formattedAddress",
        "location",
        "rating",
        "userRatingCount",
        "priceLevel",
        "types",
        "regularOpeningHours",
        "nationalPhoneNumber",
        "websiteUri",
        "editorialSummary",
        "googleMapsUri",
        "photos",
      ].join(",");

      const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
        headers: { "X-Goog-Api-Key": GOOGLE_KEY, "X-Goog-FieldMask": fieldMask },
      });
      const d = await res.json();
      if (!res.ok) return json({ place: null });

      // Resolve a displayable photo URL (no key needed by the client).
      let photoUri: string | null = null;
      const photoName = d.photos?.[0]?.name;
      if (photoName) {
        try {
          const pres = await fetch(
            `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=900&maxWidthPx=900&skipHttpRedirect=true`,
            { headers: { "X-Goog-Api-Key": GOOGLE_KEY } },
          );
          if (pres.ok) {
            const pd = await pres.json();
            photoUri = pd.photoUri ?? null;
          }
        } catch (_) {
          photoUri = null;
        }
      }

      return json({
        place: {
          id: d.id,
          name: d.displayName?.text ?? "Unnamed place",
          address: d.formattedAddress ?? "",
          latitude: d.location?.latitude ?? null,
          longitude: d.location?.longitude ?? null,
          rating: d.rating ?? null,
          userRatingCount: d.userRatingCount ?? null,
          priceLevel: d.priceLevel ?? null,
          types: d.types ?? [],
          openNow: d.regularOpeningHours?.openNow ?? null,
          weekdayText: d.regularOpeningHours?.weekdayDescriptions ?? null,
          phone: d.nationalPhoneNumber ?? null,
          website: d.websiteUri ?? null,
          summary: d.editorialSummary?.text ?? null,
          googleMapsUri: d.googleMapsUri ?? null,
          photoUri,
        },
      });
    }

    return json({ error: "Unknown request type." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
