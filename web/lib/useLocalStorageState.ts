"use client";

import { useEffect, useState } from "react";

/**
 * Local-only persistence, matching this whole project's honest MVP scope:
 * no account system, no database — data lives in this browser. Reads lazily
 * on mount (not during the initial render) so server-rendered HTML always
 * matches the client's first paint before hydration swaps in real data.
 */
export function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // Reading localStorage must happen post-mount (server has no window),
      // so syncing it into state here — rather than a lazy initializer — is
      // what keeps the first client render matching the server-rendered HTML.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setValue(JSON.parse(raw));
    } catch {
      // ignore corrupt storage, keep the initial value
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable — fail silently, nothing to recover here
    }
  }, [key, value, hydrated]);

  return [value, setValue, hydrated] as const;
}
