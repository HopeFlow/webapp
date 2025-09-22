import { z } from "zod";

export function isStringLikeSchema(schema: z.ZodTypeAny): boolean {
  return (
    schema instanceof z.ZodString ||
    schema instanceof z.ZodEnum ||
    schema instanceof z.ZodNativeEnum ||
    (schema instanceof z.ZodLiteral && typeof schema.value === "string")
  );
}

export function parseFromString<T extends z.ZodTypeAny>(
  value: string,
  typeDef: T,
): z.infer<T> {
  const unwrapedTypeDef =
    typeDef instanceof z.ZodOptional ? typeDef.unwrap() : typeDef;
  if (isStringLikeSchema(unwrapedTypeDef)) return unwrapedTypeDef.parse(value);
  const jsonParsed = JSON.parse(value);
  return unwrapedTypeDef.parse(jsonParsed);
}

export function parseFromRequestRecord<T extends z.AnyZodObject>(
  value: Record<string, string | string[]>,
  typeDefObj: T,
): z.infer<T> {
  const convertedParams: Record<string, unknown> = {};
  for (const key in typeDefObj.shape) {
    const [memberTypeDef, isOptional] =
      typeDefObj.shape[key] instanceof z.ZodOptional
        ? [typeDefObj.shape[key].unwrap(), true]
        : [typeDefObj.shape[key], false];
    if (!(key in value)) {
      if (!isOptional) throw new Error(`Missing required field: ${key}`);
      continue;
    }
    if (memberTypeDef instanceof z.ZodArray) {
      if (!Array.isArray(value[key]))
        throw new Error(`Array value expected for ${key}`);
      const elementTypeDef = memberTypeDef.element;
      convertedParams[key] = value[key].map((v) =>
        parseFromString(v, elementTypeDef),
      );
    } else {
      if (Array.isArray(value[key]))
        throw new Error(`Non-array value expected for ${key}`);
      convertedParams[key] = parseFromString(value[key], memberTypeDef);
    }
  }
  return typeDefObj.parse(convertedParams);
}
