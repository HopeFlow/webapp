import { useEffect, useState } from "react";

function resolveInitial<T>(initial: T | (() => T)): T {
  return typeof initial === "function" ? (initial as () => T)() : initial;
}

export function usePersistentState<T>(
  key: string,
  initialState: T | (() => T),
) {
  const [state, setState] = useState<T>(initialState);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("storage", (event) => {
      if (event.storageArea === window.localStorage && event.key === key)
        try {
          if (event.newValue === null) {
            // key removed elsewhere – reset to initial
            setState(resolveInitial(initialState));
          } else {
            setState(JSON.parse(event.newValue) as T);
          }
        } catch {
          // ignore parse errors
        }
    });
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setState(JSON.parse(raw) as T);
    } catch {
      // ignore parse errors; keep current state
    } finally {
      setLoaded(true);
    }
  }, [key, initialState]);
  if (typeof window === "undefined") return [state, setState] as const;
  const setPersistentState: typeof setState = (nextState) =>
    setState((prevState) => {
      const nextStateValue =
        typeof nextState === "function"
          ? (nextState as (prevState: T) => T)(prevState)
          : nextState;
      window.localStorage.setItem(key, JSON.stringify(nextStateValue));
      return nextStateValue;
    });
  return [state, setPersistentState, loaded] as const;
}
