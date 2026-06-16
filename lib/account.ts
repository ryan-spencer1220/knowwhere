import { supabase } from "@/lib/supabase";

// Permanently delete the signed-in user's account. The privileged auth-user
// delete runs in the "delete-account" Edge Function (service-role key stays
// server-side); cascades remove the profile, lists, places, follows and saves.
// On success we sign out locally so the app returns to the auth flow.
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("delete-account");
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  await supabase.auth.signOut();
}
