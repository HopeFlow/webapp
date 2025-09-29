import { useEffect, useState } from "react";

export function usePersistentState<T>(
  key: string,
  initialState: T | (() => T),
) {
  const [state, setState] = useState<T>(initialState);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("storage", (event) => {
      if (event.storageArea === window.localStorage && event.key === key)
        setState(JSON.parse(event.newValue as string) as T);
    });
    const storedValue = window.localStorage.getItem(key);
    if (storedValue) setState(JSON.parse(storedValue) as T);
  }, [key]);
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
  return [state, setPersistentState] as const;
}
