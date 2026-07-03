import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { toFriendlyMessage } from "@/lib/errors";

/**
 * Runs an async query whenever the screen gains focus, so data stays fresh
 * (e.g. a newly created list shows up when you navigate back to Profile).
 * Returns `refetch` so an error state can offer a "Try again" button.
 */
export function useFocusQuery<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest fn without making it a focus-effect dependency.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  // Guards against setting state after the screen has blurred/unmounted.
  const activeRef = useRef(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        if (activeRef.current) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (activeRef.current) {
          setError(toFriendlyMessage(e));
          setLoading(false);
        }
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      activeRef.current = true;
      load();
      return () => {
        activeRef.current = false;
      };
    }, [load]),
  );

  return { data, loading, error, refetch: load };
}
