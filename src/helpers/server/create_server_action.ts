import { defineServerFunction } from "./define_server_function";
import type { AnyArgs } from "@/helpers/client/type_helpers";

export interface ServerAction<P extends AnyArgs, R> {
  (...args: P): Promise<R>;
  id: string;
  scope: string;
  addInvalidation<S extends AnyArgs>(
    action: ServerAction<S, unknown>,
    buildArgs?: (...args: [R, ...P]) => S,
  ): void;
}

export type CrudAction = "create" | "read" | "update" | "remove";

export interface CrudServerAction<C, R, U, D, P extends AnyArgs = []>
  extends ServerAction<[CrudAction, C | U | D | undefined, ...P], R | boolean> {
  (action: "create", data: C, ...args: P): Promise<boolean>;
  (action: "read", ...args: P): Promise<R>;
  (action: "update", data: U, ...args: P): Promise<boolean>;
  (action: "remove", data: D, ...args: P): Promise<boolean>;
  createVariant<V extends AnyArgs, W>(
    this: CrudServerAction<C, R, U, D, P>,
    variantName: string,
    read: (...args: V) => Promise<W>,
  ): ServerAction<V, W>;
}

/* -------------- Small helper -------------- */

function toServerAction<P extends AnyArgs, R>(
  fn: (...args: P) => Promise<R>,
  meta: {
    id: string;
    scope: string;
    addInvalidation?: <S extends AnyArgs>(
      action: ServerAction<S, unknown>,
      buildArgs?: (...args: [R, ...P]) => S,
    ) => void;
  },
): ServerAction<P, R> {
  const action = (...args: P) => fn(...args);
  const noOp = <S extends AnyArgs, T>(_a: ServerAction<S, T>, _b?: any) =>
    void 0;
  return Object.assign(action, {
    id: meta.id,
    scope: meta.scope,
    addInvalidation: meta.addInvalidation ?? noOp,
  }) as ServerAction<P, R>;
}

export const createServerAction = <P extends AnyArgs, R>({
  id,
  scope,
  execute,
  addInvalidation,
}: {
  id: string;
  scope: string;
  execute: (...args: P) => Promise<R>;
  addInvalidation?: <S extends AnyArgs>(
    action: ServerAction<S, unknown>,
    buildArgs?: (...args: [R, ...P]) => S,
  ) => void;
}): ServerAction<P, R> => {
  const fn = defineServerFunction<P, R>({ id, scope, handler: execute });
  return toServerAction<P, R>(fn, { id, scope, addInvalidation });
};

export const createVariant = function <
  P extends AnyArgs,
  R,
  V extends AnyArgs,
  W,
>(
  this: ServerAction<P, R>,
  variantName: string,
  read: (...args: V) => Promise<W>,
) {
  const id = `${this.id}.${variantName}`;
  const scope = this.scope;
  const fn = defineServerFunction<V, W>({ id, scope, handler: read });
  return toServerAction<V, W>(fn, {
    id,
    scope,
    addInvalidation: () => {
      throw new Error("Invalidation not supported for variants");
    },
  });
};

export const createCrudServerAction = <C, R, U, D, P extends AnyArgs>({
  id,
  scope,
  read,
  create,
  update,
  remove,
}: {
  id: string;
  scope: string;
  read?: (...args: P) => Promise<R>;
  create?: (data: C, ...args: P) => Promise<boolean>;
  update?: (data: U, ...args: P) => Promise<boolean>;
  remove?: (data: D, ...args: P) => Promise<boolean>;
}): CrudServerAction<C, R, U, D, P> => {
  const dispatcher = defineServerFunction<
    [CrudAction, C | U | D | undefined, ...P],
    R | boolean
  >({
    id,
    scope,
    handler: async (crudAction, maybeData, ...rest) => {
      switch (crudAction) {
        case "read":
          if (!read) throw new Error("Read action not defined");
          return read(...(rest as P));
        case "create":
          if (!create) throw new Error("Create action not defined");
          return create(maybeData as C, ...(rest as P));
        case "update":
          if (!update) throw new Error("Update action not defined");
          return update(maybeData as U, ...(rest as P));
        case "remove":
          if (!remove) throw new Error("Delete action not defined");
          return remove(maybeData as D, ...(rest as P));
        default:
          throw new Error(`Unknown action: ${crudAction}`);
      }
    },
  });

  const base = toServerAction(dispatcher, { id, scope });
  return Object.assign(base, { createVariant }) as unknown as CrudServerAction<
    C,
    R,
    U,
    D,
    P
  >;
};
