import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** GET `path` and expose {data, loading, error, reload}. Re-runs when `path` changes. */
export function useFetch<T>(path: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (path === null) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    api<T>(path)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof ApiError ? e.message : 'Erreur de chargement'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [path, tick]);

  return { data, loading, error, reload };
}
