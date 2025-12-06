import { defineServerFunction } from "./define_server_function";
import type { AnyArgs } from "@/helpers/client/type_helpers";

export type EndpointApiType = "query" | "mutation";

export const createApiEndpoint = <P extends AnyArgs, R>({
  uniqueKey,
  type,
  handler,
}: {
  uniqueKey: string;
  type: EndpointApiType;
  handler: (...args: P) => Promise<R>;
}) => {
  return defineServerFunction({
    uniqueKey,
    handler,
    type,
  }) as typeof handler & { uniqueKey: string; type: EndpointApiType };
};
