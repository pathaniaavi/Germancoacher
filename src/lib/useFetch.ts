import { useCallback, useEffect, useState } from "react";
import { ApiRequestError } from "./api";

export interface AsyncState<T> {
  status: "loading" | "success" | "error";
  data: T | null;
  error: string | null;
  reload: () => void;
}

/** Tiny data-fetching hook with loading/success/error states and manual reload. */
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [state, setState] = useState<{ status: AsyncState<T>["status"]; data: T | null; error: string | null }>({
    status: "loading",
    data: null,
    error: null,
  });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading", error: null }));
    fn()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof ApiRequestError ? err.message : err instanceof Error ? err.message : "Request failed";
        setState({ status: "error", data: null, error: message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload };
}
