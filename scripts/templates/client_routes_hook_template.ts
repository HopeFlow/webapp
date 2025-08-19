import { useRouter } from "next/navigation";
import { useCallback } from "react";

const toStringParam = (v: unknown) =>
  encodeURIComponent(typeof v === "string" ? v : JSON.stringify(v));

const toPathParams = <T extends { [key: string]: unknown }>(
  props: T,
  parts: Array<
    { part: keyof T & string; isParam: true } | { part: string; isParam: false }
  >,
) => {
  return Array.from(parts).flatMap(({ part, isParam }): string[] => {
    if (!isParam) return [part];
    const v = props[part as keyof T];
    if (v === undefined) return ["undefined"];
    if (Array.isArray(v)) return v.map(toStringParam);
    return [toStringParam(v)];
  });
};

const toSearchParams = <T extends { [key: string]: unknown }>(
  props: T,
  keys: Array<keyof T & string>,
) => {
  const result = Array.from(keys).flatMap((key): Array<string> => {
    const value = props[key];
    if (value === undefined) return [];
    if (Array.isArray(value))
      return value.map((e) => `${key}=${toStringParam(e)}`);
    return [`${key}=${toStringParam(value)}`];
  });
  if (result.length === 0) return "";
  return `?${result.join("&")}`;
};

export const useRouteTo = () => {
  const router = useRouter();
  return useCallback(() => router.push("/some/route"), [router]);
};

export const useRouteToWithParams = () => {
  const router = useRouter();
  return useCallback(
    (props: { param1: string; param2: number; params3: string[] }) =>
      router.push(
        [
          "",
          ...toPathParams(props, [
            { part: "r0", isParam: false },
            { part: "param1", isParam: true },
            { part: "r1", isParam: false },
            { part: "r2", isParam: false },
            { part: "param2", isParam: true },
            { part: "r3", isParam: false },
            { part: "params3", isParam: true },
          ]),
        ].join("/"),
      ),
    [router],
  );
};

export const useRouteToWithSearchParams = () => {
  const router = useRouter();
  return useCallback(
    (props: { param1: string; param2: number; params3: string[] }) =>
      router.push(
        `path${toSearchParams(props, ["param1", "param2", "params3"])}`,
      ),
    [router],
  );
};

export const useRouteToWithParamsSearchParams = () => {
  const router = useRouter();
  return useCallback(
    (props: { param1: string; param2: number; params3: string[] }) =>
      router.push(
        [
          "",
          ...toPathParams(props, [
            { part: "r0", isParam: false },
            { part: "param1", isParam: true },
            { part: "r1", isParam: false },
            { part: "r3", isParam: false },
            { part: "params3", isParam: true },
          ]),
        ].join("/") + toSearchParams(props, ["param2"]),
      ),
    [router],
  );
};

interface UseGoto {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useGoto: UseGoto = (routeName: string): any => {
  return () => {};
};
