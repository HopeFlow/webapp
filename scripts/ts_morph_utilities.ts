import path from "node:path";
import { Node, Project, Symbol, SyntaxKind, Type } from "ts-morph";

export const lowerCaseFirstLetter = (str: string) =>
  str[0].toLowerCase() + str.slice(1);

export const upperCaseFirstLetter = (str: string) =>
  str[0].toUpperCase() + str.slice(1);

export const toPascalCase = (str: string) => {
  return str
    .split("_")
    .map((s) => upperCaseFirstLetter(s))
    .join("");
};

export const getOrThrow = <K, V>(map: Map<K, V>, key: K) => {
  const value = map.get(key);
  const keyText =
    key instanceof Node
      ? key.getText()
      : key instanceof Symbol
      ? key.getName()
      : key;
  if (!value) throw new Error(`Could not find value for key ${keyText}`);
  return value;
};

export const getRealSymbol = (node: Node | undefined) => {
  if (!node) return undefined;
  const symbol = node.getSymbol();
  return symbol?.getAliasedSymbol() ?? symbol;
};

export const getResolvedTypeText = (
  type: Type,
  enclosingNode?: Node,
): string => {
  // If it's a type alias, try to resolve
  if (type.isTypeParameter()) {
    const constraint = type.getConstraint();
    if (constraint) return getResolvedTypeText(constraint, enclosingNode);
  }
  if (type.isUnion()) {
    // For unions, join the text of constituent types
    return type
      .getUnionTypes()
      .map((t) => getResolvedTypeText(t, enclosingNode))
      .join(" | ");
  }
  if (type.isTuple()) {
    return (
      "[" +
      type
        .getTupleElements()
        .map((t) => getResolvedTypeText(t, enclosingNode))
        .join(", ") +
      "]"
    );
  }
  if (type.isLiteral()) {
    return type.getText(enclosingNode);
  }

  const nodes = type
    .getSymbol()
    ?.getDeclarations()
    .filter((declaration) =>
      declaration.isKind(SyntaxKind.TypeAliasDeclaration),
    )
    .map((declaration) => declaration.getTypeNode());
  const node = nodes && nodes[0];
  if (node && type.getTypeArguments().length === 0)
    return getResolvedTypeText(node.getType(), enclosingNode);

  // Fallback: just return the text
  return type.getText(enclosingNode);
};

export const doesResolveToObject = (type: Type) => {
  return (
    type.isObject() ||
    (type.isIntersection() &&
      type.getIntersectionTypes().every(doesResolveToObject))
  );
};

export const createShortestModuleSpecifierGetter =
  (projectRootPath: string) =>
  (moduleSpecifier: string, importerModulePath: string) => {
    if (!moduleSpecifier.startsWith(".") && !moduleSpecifier.startsWith("/"))
      return moduleSpecifier;
    let result = null;
    for (const candidate of [
      path.relative(projectRootPath, moduleSpecifier),
      path.relative(path.dirname(importerModulePath), moduleSpecifier),
      path.join(
        "@",
        path.relative(path.join(projectRootPath, "src"), moduleSpecifier),
      ),
    ]) {
      if (result === null || candidate.length < result.length)
        result = candidate;
    }
    return (result as string).replace(/\.tsx?$/, "");
  };

export const createProject = () => {
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
  });

  const configFilePath = project.getCompilerOptions().configFilePath as
    | string
    | undefined
    | null;

  return [
    configFilePath ? path.dirname(configFilePath) : path.resolve(".."),
    project,
  ] as const;
};
