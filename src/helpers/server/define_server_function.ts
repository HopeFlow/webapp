import { AnyArgs } from "@/helpers/client/type_helpers";

export const defineServerFunction = <
  P extends AnyArgs,
  V,
  R extends Promise<V> | AsyncGenerator<V, void, unknown>,
>(params: {
  id: string;
  scope: string;
  handler: (...args: P) => R;
}) => {
  const { id, scope, handler } = params;

  const run = handler;

  return Object.assign(run, {
    id,
    scope,
  });
};
