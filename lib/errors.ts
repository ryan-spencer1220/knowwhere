/**
 * Turns a thrown value (a Supabase error, a fetch failure, a raw string) into a
 * short, user-friendly message. React Native throws a bare
 * "Network request failed" TypeError whenever the device is offline or the
 * backend is unreachable — that's the most common failure, so it gets a clear,
 * actionable line instead of leaking the internal text to the user.
 */

function rawMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}

const NETWORK_RE = /network request failed|network error|failed to fetch|fetch failed/i;
const TIMEOUT_RE = /timeout|timed out|aborted/i;

export function isNetworkError(err: unknown): boolean {
  return NETWORK_RE.test(rawMessage(err));
}

export function toFriendlyMessage(err: unknown): string {
  const raw = rawMessage(err);

  if (NETWORK_RE.test(raw)) {
    return "You appear to be offline. Check your connection and try again.";
  }
  if (TIMEOUT_RE.test(raw)) {
    return "That took too long. Check your connection and try again.";
  }
  // Auth/validation errors already carry human-readable text; surface those.
  if (raw) return raw;
  return "Something went wrong. Please try again.";
}
