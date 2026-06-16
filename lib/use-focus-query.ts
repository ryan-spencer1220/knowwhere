import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

/**
 * Runs an async query whenever the screen gains focus, so data stays fresh
 * (e.g. a newly created list shows up when you navigate back to Profile).
 */
export function useFocusQuery<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest fn without making it a focus-effect dependency.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      fnRef
        .current()
        .then((d) => {
          if (active) {
            setData(d);
            setLoading(false);
          }
        })
        .catch((e) => {
          if (active) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return { data, loading, error };
}
