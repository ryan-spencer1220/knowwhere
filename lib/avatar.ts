import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase";

// Lets the user pick a photo, uploads it to the avatars bucket under their
// own folder, points their profile at it, and returns the public URL.
// Returns null if the user cancels.
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("Photo access is required to set a profile picture.");

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset.base64) throw new Error("Could not read the selected image.");

  const contentType = asset.mimeType ?? "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, decode(asset.base64), { contentType, upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = data.publicUrl;

  const { error: updateError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (updateError) throw updateError;

  return url;
}
