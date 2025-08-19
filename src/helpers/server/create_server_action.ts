// import type * as schema from "@/db/schema";
import type { AnyArgs } from "../client/type_helpers";

// type TableName<K extends keyof typeof schema> = K extends `${infer Name}Table`
//   ? Name
//   : never;
// type SchemaTables = {
//   [T in keyof typeof schema]: TableName<T>;
// }[keyof typeof schema];

export interface ServerAction<P extends AnyArgs, R> {
  (...args: P): Promise<R>;
  id: string;
  addInvalidation<S extends AnyArgs>(
    action: ServerAction<S, unknown>,
    buildArgs?: (...args: [R, ...P]) => S,
  ): void;
}

export const createServerAction = <P extends AnyArgs, R>(
  id: string,
  execute: (...args: P) => Promise<R>,
  addInvalidation?: <S extends AnyArgs>(
    action: ServerAction<S, unknown>,
    buildArgs?: (...args: [R, ...P]) => S,
  ) => void,
): ServerAction<P, R> => {
  const action = (...args: P): Promise<R> => {
    return execute(...args);
  };
  const noOpInvalidation = <S extends AnyArgs, T>(
    action: ServerAction<S, T>,
    buildArgs?: (...args: [R, ...P]) => S,
  ) => {
    void action;
    void buildArgs;
  };
  return Object.assign(action, {
    id,
    addInvalidation: addInvalidation ?? noOpInvalidation,
  }) as ServerAction<P, R>;
};

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

const createVariant = function <P extends AnyArgs, R, V extends AnyArgs, W>(
  this: ServerAction<P, R>,
  variantName: string,
  read: (...args: V) => Promise<W>,
) {
  return createServerAction<V, W>(`${this.id}.${variantName}`, read, () => {
    throw new Error("Invalidation not supported for variants");
  });
};

export const createCrudServerAction = <C, R, U, D, P extends AnyArgs>({
  id,
  read,
  create,
  update,
  remove,
}: {
  id: string;
  read?: (...args: P) => Promise<R>;
  create?: (data: C, ...args: P) => Promise<boolean>;
  update?: (data: U, ...args: P) => Promise<boolean>;
  remove?: (data: D, ...args: P) => Promise<boolean>;
}): CrudServerAction<C, R, U, D, P> => {
  const execute = async (
    crudAction: CrudAction,
    ...args: [C | U | D, ...P] | P
  ): Promise<R | boolean> => {
    switch (crudAction) {
      case "read":
        if (read) {
          return await read(...(args as P));
        }
        throw new Error("Read action not defined");
      case "create":
        if (create) {
          return create(...(args as [C, ...P]));
        }
        throw new Error("Create action not defined");
      case "update":
        if (update) {
          return update(...(args as [U, ...P]));
        }
        throw new Error("Update action not defined");
      case "remove":
        if (remove) {
          return remove(...(args as [D, ...P]));
        }
        throw new Error("Delete action not defined");
      default:
        throw new Error(`Unknown action: ${crudAction}`);
    }
  };
  const action = createServerAction(id, execute);
  return Object.assign(action, {
    createVariant,
  }) as CrudServerAction<C, R, U, D, P>;
};
