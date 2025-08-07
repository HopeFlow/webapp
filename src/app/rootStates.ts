import type { ReactNode } from "react";
import {
  parseFromRequestRecord,
  type TypeDefObj,
  type TypeFromTypeDefObj,
  type PartialTypeFromTypeDefObj,
} from "@/lib/type_helpers";

interface PageProps {
  params: Promise<Record<string, string | string[]>>;
  searchParams: Promise<Record<string, string | string[]>>;
}

const definePageRenderer = <
  P extends TypeDefObj,
  Q extends TypeDefObj,
  E extends string
>(
  pathParamDef: P,
  queryParamDef: Q,
  triggerEvent: (event: E) => void,
  renderHandler: (
    props: TypeFromTypeDefObj<P> &
      PartialTypeFromTypeDefObj<Q> & { triggerEvent: (event: E) => void }
  ) => ReactNode | Promise<ReactNode>
) => {
  const result = async function ({
    params: paramsPromise,
    searchParams: searchParamsPromise,
  }: PageProps) {
    const params = parseFromRequestRecord(
      await paramsPromise,
      pathParamDef,
      true
    );
    const searchParams = parseFromRequestRecord(
      await searchParamsPromise,
      queryParamDef
    );
    const props = {
      ...params,
      ...searchParams,
      triggerEvent,
    } as TypeFromTypeDefObj<P> &
      PartialTypeFromTypeDefObj<Q> & { triggerEvent: (event: E) => void };
    return await renderHandler(props);
  };
  (result as { displayName?: string }).displayName =
    (renderHandler as { displayName?: string }).displayName ??
    renderHandler.name;
  return result;
};

export function createRootState<
  E extends string,
  P extends TypeDefObj,
  Q extends TypeDefObj
>(
  events: readonly E[],
  pathParamDef: P,
  queryParamDef: Q,
  triggerEvent: (event: E) => void
) {
  return {
    events,
    defineRenderer: (
      renderHandler: (
        props: TypeFromTypeDefObj<P> &
          PartialTypeFromTypeDefObj<Q> & { triggerEvent: (event: E) => void }
      ) => ReactNode | Promise<ReactNode>
    ) =>
      definePageRenderer(
        pathParamDef,
        queryParamDef,
        triggerEvent,
        renderHandler
      ),
    triggerEvent,
  } as const;
}

export default {
  index: createRootState(["test"] as const, {}, {}, (event) =>
    console.log(event)
  ),
};
