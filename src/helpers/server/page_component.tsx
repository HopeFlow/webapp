import { type ReactNode, Suspense } from "react";
import { AnyZodObject, z } from "zod";
import { parseFromRequestRecord } from "./zod_helpers";
import { LoadingBlocker } from "@/components/loading";
import { currentUserNoThrow } from "@/helpers/server/auth";
import type { User } from "@clerk/nextjs/server";
import {
  HydrationBoundary,
  dehydrate,
  QueryClient,
} from "@tanstack/react-query";

// Identity HOCs used purely as markers for the route generator.
// do NOTHING at runtime — your generator just detects them.
export const publicPage = function <C>(Component: C) {
  return Component;
};

export type PageParams = {
  params: Promise<Record<string, string | string[]>>;
  searchParams: Promise<Record<string, string | string[]>>;
};

export type ParamsType<
  P extends AnyZodObject | undefined,
  Q extends AnyZodObject | undefined,
> = P extends AnyZodObject
  ? Q extends AnyZodObject
    ? z.infer<P> & z.infer<Q>
    : z.infer<P>
  : Q extends AnyZodObject
  ? z.infer<Q>
  : never;

export function withParams<
  P extends AnyZodObject | undefined = undefined,
  Q extends AnyZodObject | undefined = undefined,
>(
  handler: (params: ParamsType<P, Q>) => ReactNode | Promise<ReactNode>,
  {
    paramsTypeDef,
    searchParamsTypeDef,
  }:
    | {
        paramsTypeDef: P;
        searchParamsTypeDef: Q;
      }
    | {
        paramsTypeDef?: undefined;
        searchParamsTypeDef: Q;
      }
    | {
        paramsTypeDef: P;
        searchParamsTypeDef?: undefined;
      },
) {
  const result = async (props: PageParams): Promise<ReactNode> => {
    const params = paramsTypeDef
      ? parseFromRequestRecord(await props.params, paramsTypeDef)
      : {};
    const searchParams = searchParamsTypeDef
      ? parseFromRequestRecord(await props.searchParams, searchParamsTypeDef)
      : {};
    const handlerResult = handler({ ...params, ...searchParams } as ParamsType<
      P,
      Q
    >);
    if (handlerResult instanceof Promise) return await handlerResult;
    return handlerResult;
  };
  return result;
}

export function withUser(
  F: (props: { user?: User }) => ReactNode | Promise<ReactNode>,
) {
  async function Result() {
    const user = await currentUserNoThrow();
    return (
      <Suspense fallback={<LoadingBlocker />}>
        <F user={user ?? undefined} />
      </Suspense>
    );
  }
  return Result;
}

export function withParamsAndUser<
  P extends AnyZodObject | undefined = undefined,
  Q extends AnyZodObject | undefined = undefined,
>(
  handler: (
    params: ParamsType<P, Q> & { user?: User },
  ) => ReactNode | Promise<ReactNode>,
  {
    paramsTypeDef,
    searchParamsTypeDef,
  }:
    | {
        paramsTypeDef: P;
        searchParamsTypeDef: Q;
      }
    | {
        paramsTypeDef?: undefined;
        searchParamsTypeDef: Q;
      }
    | {
        paramsTypeDef: P;
        searchParamsTypeDef?: undefined;
      },
) {
  const result = async (props: PageParams): Promise<ReactNode> => {
    const params = paramsTypeDef
      ? parseFromRequestRecord(await props.params, paramsTypeDef)
      : {};
    const searchParams = searchParamsTypeDef
      ? parseFromRequestRecord(await props.searchParams, searchParamsTypeDef)
      : {};
    const user = await currentUserNoThrow();
    const handlerResult = handler({
      ...params,
      ...searchParams,
      user,
    } as ParamsType<P, Q> & { user?: User });
    if (handlerResult instanceof Promise) return await handlerResult;
    return handlerResult;
  };
  return result;
}

export type Prefetcher = (qc: QueryClient) => Promise<unknown>;

export default async function Prefetch({
  actions,
  children,
}: {
  children: ReactNode;
  actions: Prefetcher[];
}) {
  const qc = new QueryClient();
  await Promise.all(actions.map((a) => a(qc)));
  return (
    <HydrationBoundary state={dehydrate(qc)}>{children}</HydrationBoundary>
  );
}
