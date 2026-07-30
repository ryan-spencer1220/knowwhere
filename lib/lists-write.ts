import { fetchCoverPhoto, type Spot } from "@/lib/places-search";
import { supabase } from "@/lib/supabase";

export type SaveListInput = {
  ownerId: string;
  title: string;
  isPublic: boolean;
  spots: Spot[];
};

// Persist a new list and its places, then attach a best-effort cover photo.
// Shared by the manual add flow and the Google Maps import flow so both write
// identical rows. Returns the new list id.
export async function saveList({ ownerId, title, isPublic, spots }: SaveListInput): Promise<string> {
  const { data: list, error: e1 } = await supabase
    .from("lists")
    .insert({ owner_id: ownerId, title: title.trim(), is_public: isPublic })
    .select("id")
    .single();
  if (e1) throw e1;

  const rows = spots.map((s, i) => ({
    list_id: list.id,
    google_place_id: s.id,
    name: s.name,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude,
    position: i,
  }));
  const { error: e2 } = await supabase.from("list_places").insert(rows);
  if (e2) throw e2;

  // Attach a cover photo from the first spot (best-effort; never blocks save).
  const cover = await fetchCoverPhoto(spots[0].id);
  if (cover) await supabase.from("lists").update({ cover_image_url: cover }).eq("id", list.id);

  return list.id as string;
}

// Append a single spot to an existing list, positioned after its last place.
// Returns "duplicate" (and writes nothing) when the spot is already in the list,
// since list_places has no uniqueness constraint. RLS restricts writes to the
// list's owner.
export async function addSpotToList(listId: string, spot: Spot): Promise<"added" | "duplicate"> {
  const { data: existing, error: readErr } = await supabase
    .from("list_places")
    .select("google_place_id, position")
    .eq("list_id", listId);
  if (readErr) throw readErr;

  const rows = existing ?? [];
  if (rows.some((r) => r.google_place_id === spot.id)) return "duplicate";
  const nextPosition = rows.reduce((max, r) => Math.max(max, r.position + 1), 0);

  const { error: insertErr } = await supabase.from("list_places").insert({
    list_id: listId,
    google_place_id: spot.id,
    name: spot.name,
    address: spot.address,
    latitude: spot.latitude,
    longitude: spot.longitude,
    position: nextPosition,
  });
  if (insertErr) throw insertErr;
  return "added";
}
