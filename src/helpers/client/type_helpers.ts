/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyArgs = any[];

export const mirrorEnum = <T extends readonly string[]>(arr: T) =>
  Object.freeze(
    Object.fromEntries(arr.map((v) => [v, v] as const)) as {
      [K in T[number]]: K;
    },
  );
