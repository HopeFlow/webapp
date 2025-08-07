// Following imports and definitions are provided here to enable intellisense
// while developing template code for server action hooks
// #region preamble
import type {
  CrudAction,
  ServerAction,
  CrudServerAction,
} from "@/lib/server_action";
import type { AnyArgs } from "@/lib/type_helpers";
import {
  type UseQueryResult,
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

declare type P = AnyArgs;
declare type C = unknown;
declare type R = unknown;
declare type U = unknown;
declare type D = unknown;
declare const crudServerAction: CrudServerAction<C, R, U, D, P>;
declare const serverAction: ServerAction<P, R>;
// #endregion

// Template used to generate mutation handlers for required CUD actions
const useCrudServerActionMutation = (
  dependantQueryKeys: string[][],
  queryClient: ReturnType<typeof useQueryClient>,
  action: CrudAction,
  ...args: P
) => {
  const result = useMutation(
    {
      mutationFn: async (data: C | U | D) => {
        dependantQueryKeys.forEach((queryKey) =>
          queryClient.cancelQueries({ queryKey }),
        );
        return await crudServerAction(action, data, ...args);
      },
      onSettled: () => {
        dependantQueryKeys.forEach((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        );
      },
    },
    queryClient,
  );
  return result;
};

// Template for server actions that are CRUD
const useCrudServerAction = (...args: P) => {
  const queryKey = [] as string[];
  const dependantQueryKeys = [] as string[][];
  const queryClient = useQueryClient();
  const query = useQuery(
    {
      queryKey,
      queryFn: async () => await crudServerAction("read", ...args),
    },
    queryClient,
  );
  return query;
};

// Template for server actions that are a)not CRUD b)have invalidations
const useServerActionWithInvalidations = (...args: P) => {
  const queryKey = [] as string[];
  const dependantQueryKeys = [] as string[][];
  const queryClient = useQueryClient();
  const query = useMutation(
    {
      mutationKey: queryKey,
      mutationFn: async () => {
        dependantQueryKeys.forEach((queryKey) =>
          queryClient.cancelQueries({ queryKey }),
        );
        return await serverAction(...args);
      },
      onSettled: () => {
        dependantQueryKeys.forEach((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        );
      },
    },
    queryClient,
  );
  return query;
};

// Template for server actions that are a)not CRUD b)don't have invalidations
const useServerAction = (...args: P) => {
  const queryKey = [] as string[];
  const queryClient = useQueryClient();
  const query = useQuery(
    {
      queryKey,
      queryFn: async () => await serverAction(...args),
    },
    queryClient,
  );
  return query;
};

// Following code prevents intellisense errors regarding unused variables
// #region postamble
void useCrudServerActionMutation;
void useCrudServerAction;
void useServerActionWithInvalidations;
void useServerAction;
// #endregion
