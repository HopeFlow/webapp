import { AnyArgs } from "@/helpers/client/type_helpers";

export interface ServerFn<P extends AnyArgs, R> {
  (...args: P): Promise<R>;
  id: string;
  scope: string;
  // asAction is declared but NOT implemented here to avoid coupling.
  asAction: (...args: any[]) => any;
}

export const defineServerFunction = <P extends AnyArgs, R>(opts: {
  id: string;
  scope: string;
  handler: (...args: P) => Promise<R>;
  hooks?: {
    before?: (args: P) => void | Promise<void>;
    after?: (result: R, args: P) => void | Promise<void>;
    error?: (err: unknown, args: P) => void | Promise<void>;
    finally?: (args: P) => void | Promise<void>;
  };
}): ServerFn<P, R> => {
  const { id, scope, handler, hooks } = opts;

  const run = async (...args: P): Promise<R> => {
    try {
      await hooks?.before?.(args);
      const result = await handler(...args);
      await hooks?.after?.(result, args);
      return result;
    } catch (e) {
      await hooks?.error?.(e, args);
      throw e;
    } finally {
      await hooks?.finally?.(args);
    }
  };

  return Object.assign(run, {
    id,
    scope,
    asAction: (() => {
      throw new Error("asAction not bound. Use bindAsAction in actions.ts");
    }) as ServerFn<P, R>["asAction"],
  }) as ServerFn<P, R>;
};
