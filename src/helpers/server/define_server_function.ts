import type { AnyArgs } from "@/helpers/client/type_helpers";

export const defineServerFunction = <
  P extends AnyArgs,
  V,
  R extends Promise<V> | AsyncGenerator<V, void, unknown>,
>({
  uniqueKey,
  handler,
  ...rest
}: {
  uniqueKey: string;
  handler: (...args: P) => R;
  [key: string]: unknown;
}) => {
  const run = handler;
  return Object.assign(run, { uniqueKey, ...rest });
};
