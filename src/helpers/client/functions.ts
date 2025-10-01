import { AnyArgs } from "./type_helpers";

export function debounce<P extends AnyArgs>(
  f: (...args: P) => void,
  delay: number,
) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: P) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => f(...args), delay);
  };
}
