/* eslint-disable @typescript-eslint/no-explicit-any */

export type AnyArgs = any[];
export type AnyFunction = (...args: any[]) => any;
export type AnyAsyncFunction = (...args: any[]) => Promise<any>;
export const __primitiveTypes__ = [
  "string",
  "number",
  "boolean",
  "null",
  "undefined",
] as const;

const __isOfPrimitiveType__ = {
  string: (x: unknown): x is string => typeof x === "string",
  number: (x: unknown): x is number => typeof x === "number",
  boolean: (x: unknown): x is boolean => typeof x === "boolean",
  null:
    () =>
    (x: unknown): x is null =>
      x === null,
  undefined: (x: unknown): x is undefined => x === undefined,
} as const;

const __stringToPrimitiveTypes__ = {
  string: (x: string) => x,
  number: (x: string) => Number(x),
  boolean: (x: string) => x === "true",
  null: () => null,
  undefined: () => undefined,
} as const;

export type PrimitiveType<k extends (typeof __primitiveTypes__)[number]> =
  ReturnType<(typeof __stringToPrimitiveTypes__)[k]>;
export type TypeDefObj = {
  [k: string]: (typeof __primitiveTypes__)[number] | TypeDefObj | TypeDefArray;
};
export type TypeDefArray = ((typeof __primitiveTypes__)[number] | TypeDefObj)[];
export type TypeFromTypeArray<T extends TypeDefArray> = {
  [K in keyof T]: T[K] extends TypeDefObj
    ? TypeFromTypeDefObj<T[K]>
    : T[K] extends (typeof __primitiveTypes__)[number]
    ? PrimitiveType<T[K]>
    : never;
};
export type TypeFromTypeDefObj<P extends TypeDefObj> = {
  [K in keyof P]: P[K] extends TypeDefObj
    ? TypeFromTypeDefObj<P[K]>
    : P[K] extends TypeDefArray
    ? TypeFromTypeArray<P[K]>
    : P[K] extends (typeof __primitiveTypes__)[number]
    ? PrimitiveType<P[K]>
    : never;
};
export type PartialTypeFromTypeDefObj<P extends TypeDefObj> = Partial<
  TypeFromTypeDefObj<P>
>;
export type TypeDef = TypeDefObj | TypeDefArray;
export type TypeFromTypeDef<T extends TypeDef> = T extends TypeDefObj
  ? TypeFromTypeDefObj<T>
  : T extends TypeDefArray
  ? TypeFromTypeArray<T>
  : never;
export type TypeDefOrPrimitive = (typeof __primitiveTypes__)[number] | TypeDef;
export type TypeFromTypeDefOrPrimitive<T extends TypeDefOrPrimitive> =
  T extends (typeof __primitiveTypes__)[number]
    ? PrimitiveType<T>
    : T extends TypeDef
    ? TypeFromTypeDef<T>
    : never;

export function isOfType(
  variable: unknown,
  typeDef: TypeDefOrPrimitive
): variable is TypeFromTypeDefOrPrimitive<typeof typeDef> {
  if (typeof typeDef === "string") {
    if (__primitiveTypes__.includes(typeDef))
      return __isOfPrimitiveType__[typeDef](variable) as boolean;
    return false;
  }
  if (Array.isArray(typeDef)) {
    if (!Array.isArray(variable)) return false;
    return variable.every((element, index) =>
      isOfType(element, typeDef[index])
    );
  }
  if (variable === null || typeof variable !== "object") return false;
  for (const key in typeDef) {
    if (!(key in variable)) return false;
    const value = variable[key as keyof typeof variable];
    if (!isOfType(value, typeDef[key])) return false;
  }
  return true;
}

export function parsePrimitiveValue(
  value: string,
  type: (typeof __primitiveTypes__)[number]
) {
  if (type in __stringToPrimitiveTypes__) {
    return __stringToPrimitiveTypes__[type](value);
  }
  throw new Error(`'${type}' is not a valid primitive type`);
}

export function parseFromString(
  value: string,
  typeDef: TypeDefOrPrimitive
): TypeFromTypeDefOrPrimitive<typeof typeDef> {
  if (typeof typeDef === "string") {
    if (!__primitiveTypes__.includes(typeDef)) throw new Error("");
    return __stringToPrimitiveTypes__[typeDef](value);
  }
  const parsedValue = JSON.parse(value);
  if (!isOfType(parsedValue, typeDef)) throw new Error("");
  return parsedValue;
}

export function parseFromRequestRecord<
  Strict extends true | undefined = undefined
>(
  value: Record<string, string | string[]>,
  typeDefObj: TypeDefObj,
  strict?: Strict
) {
  const parsedParams: Record<string, unknown> = {};
  for (const key in typeDefObj) {
    if (strict && !(key in value)) throw new Error("");
    if (typeof typeDefObj[key] === "string") {
      if (Array.isArray(value[key]) && value[key].length !== 1)
        throw new Error("");
      const element = Array.isArray(value[key]) ? value[key][0] : value[key];
      if (!__primitiveTypes__.includes(typeDefObj[key])) throw new Error("");
      parsedParams[key] = __stringToPrimitiveTypes__[typeDefObj[key]](element);
    }
    if (Array.isArray(typeDefObj[key])) {
      if (!Array.isArray(value[key])) throw new Error("");
      const elementTypeDef = typeDefObj[key];
      parsedParams[key] = value[key].map((element, index) =>
        parseFromString(element, elementTypeDef[index])
      );
    }
  }
  return parsedParams as Strict extends true
    ? TypeFromTypeDefObj<typeof typeDefObj>
    : PartialTypeFromTypeDefObj<typeof typeDefObj>;
}
