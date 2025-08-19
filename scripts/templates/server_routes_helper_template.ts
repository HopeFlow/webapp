import { redirect } from "next/navigation";

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

export const redirectToRoute = (): never => redirect("/some/route");

export const redirectToRouteWithParams = (props: {
  param1: string;
  param2: number;
  params3: string[];
}): never =>
  redirect(
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
  );

export const redirectToRouteWithSearchParams = (props: {
  param1: string;
  param2?: number;
  params3: string[];
}) => redirect(`path${toSearchParams(props, ["param1", "param2", "params3"])}`);

export const redirectToRouteWithParamsSearchParams = (props: {
  param1: string;
  param2: number;
  params3: string[];
}): never =>
  redirect(
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
  );
