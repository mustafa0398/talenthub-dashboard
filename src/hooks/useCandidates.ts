import { useCallback, useEffect, useMemo, useState } from "react";
import type { Candidate } from "../types";
import { fetchCandidates } from "../api/mockaroo";

const CACHE_KEY = "candidates_cache_v2";

type CacheRecord = { ts: number; data: Candidate[] };

type State = {
  data: Candidate[];
  loading: boolean;
  error: string | null;
};

export function useCandidates(initialCount = 100) {
  const [state, setState] = useState<State>({
    data: [],
    loading: true,
    error: null,
  });

  const load = useCallback(
    async (opts?: { force?: boolean }) => {
      const force = !!opts?.force;
      setState((s) => ({ ...s, loading: true, error: null }));

      if (!force) {
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          try {
            const cached: CacheRecord = JSON.parse(cachedRaw);
            setState({ data: cached.data, loading: false, error: null });
            return; 
          } catch {
          }
        }
      }

      const controller = new AbortController();
      try {
        const fresh = await fetchCandidates(initialCount, controller.signal);
        setState({ data: fresh, loading: false, error: null });
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ts: Date.now(), data: fresh } satisfies CacheRecord)
        );
      } catch (e: any) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message || "Fehler beim Laden",
        }));
      }

      return () => controller.abort();
    },
    [initialCount]
  );

  useEffect(() => {
    void load({ force: false });
  }, [load]);

  const refetch = useCallback(
    async (_count?: number) => {
      await load({ force: true });
    },
    [load]
  );

  const regenerate = refetch;

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setState((s) => ({ ...s, data: [] }));
  }, []);

  const helpers = useMemo(() => {
    const byName = (q: string) =>
      state.data.filter((c) =>
        (c.name + " " + c.title + " " + c.skills.join(" "))
          .toLowerCase()
          .includes(q.toLowerCase())
      );
    const byLocation = (loc: string) =>
      loc === "Alle Orte"
        ? state.data
        : state.data.filter((c) => c.location === loc);
    const sortBy = (key: "name" | "experience") =>
      [...state.data].sort((a, b) =>
        key === "name"
          ? a.name.localeCompare(b.name)
          : b.experienceYears - a.experienceYears
      );
    return { byName, byLocation, sortBy };
  }, [state.data]);

  return {
    ...state,
    ...helpers,
    refetch,      
    regenerate,   
    clearCache,   
  };
}
