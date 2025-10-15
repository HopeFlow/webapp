/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyArgs = any[];

export type Updater<TData, TVars> = (
  prev: TData | undefined,
  ctx: TVars,
) => TData;

export type BuildKeyArgs<TCtx extends object> = (ctx: TCtx) => unknown[];

/**
 * Per-mutation optimistic config for a CRUD server action.
 * P = extra args of the action (the same P your CRUD action uses).
 * R = read result type (main read).
 * VMap = mapping from variant name to its read result and args.
 */
export type CrudOptimisticConfig<
  C,
  R,
  U,
  D,
  P extends unknown[],
  VMap extends Record<string, { result: unknown; args: unknown[] }> = Record<
    string,
    { result: unknown; args: unknown[] }
  >,
> = {
  create?: {
    read?: Updater<R, { data: C; args: P }>;
    variants?: {
      [K in keyof VMap]?: Updater<
        VMap[K]["result"],
        { data: C; args: VMap[K]["args"] }
      >;
    };
    buildVariantArgs?: {
      [K in keyof VMap]?: BuildKeyArgs<{ data: C; args: P }>;
    };
  };
  update?: {
    read?: Updater<R, { data: U; args: P }>;
    variants?: {
      [K in keyof VMap]?: Updater<
        VMap[K]["result"],
        { data: U; args: VMap[K]["args"] }
      >;
    };
    buildVariantArgs?: {
      [K in keyof VMap]?: BuildKeyArgs<{ data: U; args: P }>;
    };
  };
  remove?: {
    read?: Updater<R, { data: D; args: P }>;
    variants?: {
      [K in keyof VMap]?: Updater<
        VMap[K]["result"],
        { data: D; args: VMap[K]["args"] }
      >;
    };
    buildVariantArgs?: {
      [K in keyof VMap]?: BuildKeyArgs<{ data: D; args: P }>;
    };
  };
};

export const mirrorEnum = <T extends readonly string[]>(arr: T) =>
  Object.freeze(
    Object.fromEntries(arr.map((v) => [v, v] as const)) as {
      [K in T[number]]: K;
    },
  );
