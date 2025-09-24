import { parseFromRequestRecord } from "@/helpers/server/zod_helpers";
import { redirect } from "next/navigation";
import { z } from "zod";

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

const routeSpecs: Map<
  string,
  {
    pathRegExp: RegExp;
    paramsTypeDef?: z.AnyZodObject;
    searchParamsTypeDef?: z.AnyZodObject;
    isPublic: boolean;
  }
> = new Map();

const parseRouteFromUrl = (urlString: string) => {
  const url = new URL(urlString, "http://localhost");
  for (const [key, spec] of routeSpecs) {
    const match = url.pathname.match(spec.pathRegExp);
    if (!match) continue;
    if (spec.paramsTypeDef && !match.groups) continue;
    const params =
      spec.paramsTypeDef &&
      parseFromRequestRecord(match.groups!, spec.paramsTypeDef);
    const getValue = (v: string[]) => (v.length === 1 ? v[0] : v);
    const rawSearchParams = Object.fromEntries(
      url.searchParams
        .keys()
        .map((k) => [k, getValue(url.searchParams.getAll(k))]),
    );
    const searchParams =
      spec.searchParamsTypeDef &&
      parseFromRequestRecord(rawSearchParams, spec.searchParamsTypeDef);
    return { key, spec, params, searchParams };
  }
};

export const isValidUrl = (urlString: string): boolean => {
  const keyAndSpecs = parseRouteFromUrl(urlString);
  return !!keyAndSpecs;
};

export const isPublicUrl = (urlString: string): boolean => {
  const keyAndSpecs = parseRouteFromUrl(urlString);
  if (!keyAndSpecs) return false;
  return keyAndSpecs.spec.isPublic;
};

export const redirectTo = (urlString: string): never => {
  const keyAndSpecs = parseRouteFromUrl(urlString);
  if (!keyAndSpecs) throw new Error(`Invalid redirect url: ${urlString}`);
  return redirect("");
};
