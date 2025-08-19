import { ReactNode } from "react";
import { AnyZodObject, z } from "zod";
import { parseFromRequestRecord } from "./zod_helpers";

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
  const result = async (props: PageParams) => {
    const params = paramsTypeDef
      ? parseFromRequestRecord(await props.params, paramsTypeDef)
      : {};
    const searchParams = searchParamsTypeDef
      ? parseFromRequestRecord(await props.searchParams, searchParamsTypeDef)
      : {};
    return await handler({ ...params, ...searchParams } as ParamsType<P, Q>);
  };
  return result;
}
