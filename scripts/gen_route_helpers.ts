import path from "node:path";
import {
  createProject,
  doesResolveToObject,
  getResolvedTypeText,
  upperCaseFirstLetter,
} from "./ts_morph_utilities";
import { ArrowFunction, Node, Symbol, SyntaxKind, Type } from "ts-morph";

const main = () => {
  const [projectRootPath, project] = createProject();

  const serverTemplate = project.getSourceFileOrThrow(
    path.join(__dirname, "templates", "server_routes_helper_template.ts"),
  );
  const clientTemplate = project.getSourceFileOrThrow(
    path.join(__dirname, "templates", "client_routes_hook_template.ts"),
  );

  const clientSourceFile =
    project.getSourceFile("src/helpers/client/routes.ts") ??
    project.createSourceFile("src/helpers/client/routes.ts");
  clientSourceFile.replaceWithText("");
  const serverSourceFile =
    project.getSourceFile("src/helpers/server/routes.ts") ??
    project.createSourceFile("src/helpers/server/routes.ts");
  serverSourceFile.replaceWithText("");

  const addServerRedirectFunction = (
    routeName: string,
    propsType: Type | undefined,
    templateName: string,
  ) => {
    const redirectToRouteFunctionStatement =
      serverSourceFile.addVariableStatement(
        serverTemplate.getVariableStatementOrThrow(templateName).getStructure(),
      );
    const functionDeclarations =
      redirectToRouteFunctionStatement.getDeclarations();
    if (functionDeclarations.length !== 1)
      throw new Error("Expected 1 declaration");
    functionDeclarations[0].rename(`redirectTo${routeName}`);
    const redirectFunction =
      functionDeclarations[0].getInitializerIfKindOrThrow(
        SyntaxKind.ArrowFunction,
      );
    return redirectFunction;
  };

  const addClientRedirectHook = (
    routeName: string,
    propsType: Type | undefined,
    templateName: string,
  ) => {
    const redirectToRouteFunctionStatement =
      clientSourceFile.addVariableStatement(
        clientTemplate.getVariableStatementOrThrow(templateName).getStructure(),
      );
    const functionDeclarations =
      redirectToRouteFunctionStatement.getDeclarations();
    if (functionDeclarations.length !== 1)
      throw new Error("Expected 1 declaration");
    const hookName = `useGoto${routeName}`;
    functionDeclarations[0].rename(hookName);
    const redirectFunction = functionDeclarations[0]
      .getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction)
      .getBody()
      .asKindOrThrow(SyntaxKind.Block)
      .getFirstDescendantByKindOrThrow(SyntaxKind.ReturnStatement)
      .getExpressionIfKindOrThrow(SyntaxKind.CallExpression)
      .getArguments()
      .at(0)
      ?.asKind(SyntaxKind.ArrowFunction);
    if (!redirectFunction)
      throw new Error("Could not find redirect template hook");

    return redirectFunction;
  };

  const updateParamsArgument = (
    toPathParamsArg: Node | undefined,
    pathParts: Array<{ part: string; isParam: boolean }>,
  ) => {
    if (!toPathParamsArg)
      throw new Error("No array literal passed to toPathParams");
    toPathParamsArg.replaceWithText(
      "[" +
        pathParts
          .map(({ part, isParam }) => JSON.stringify({ part, isParam }))
          .join(", ") +
        "]",
    );
  };

  const updateSearchParamsArgument = (
    toSearchParamsArg: Node | undefined,
    searchParamProperties: Array<Symbol>,
  ) => {
    if (!toSearchParamsArg)
      throw new Error("No array literal passed to toSearchParams");
    toSearchParamsArg.replaceWithText(
      "[" +
        searchParamProperties
          .map((p) => JSON.stringify(p.getName()))
          .join(", ") +
        "]",
    );
  };

  type RouteInfo = {
    path: string;
    pathParts: Array<{ part: string; isParam: boolean; isArrayParam: boolean }>;
    propsType: Type | undefined;
    isPublic: boolean;
  };
  const routes = new Map<string, RouteInfo>();

  function detectIsPublicForFile(
    sourceFile: import("ts-morph").SourceFile,
  ): boolean {
    const def = sourceFile.getDefaultExportSymbol();
    if (!def) return false;
    const decl = def.getDeclarations()[0];
    if (!decl) return false;

    // Get the expression behind `export default ...`
    let expr: Node | undefined;
    if (Node.isExportAssignment(decl)) {
      expr = decl.getExpression();
    } else if (
      Node.isFunctionDeclaration(decl) ||
      Node.isArrowFunction(decl) ||
      Node.isFunctionExpression(decl)
    ) {
      // direct function export — not public by marker unless wrapped elsewhere
      return false;
    }

    if (!expr) return false;

    // Walk HOC chains like withParams(withPublic(withUser(Page)))
    const seen = new Set<Node>();
    const visit = (n: Node | undefined): boolean => {
      if (!n || seen.has(n)) return false;
      seen.add(n);

      if (Node.isCallExpression(n)) {
        const callee = n.getExpression().getText();
        if (callee === "withPublic") return true;
        const firstArg = n.getArguments()[0];

        // Dive into first arg if it's another HOC call
        if (firstArg && Node.isCallExpression(firstArg)) {
          if (visit(firstArg)) return true;
        }

        // If first arg is an identifier, try to resolve & dive
        if (firstArg && Node.isIdentifier(firstArg)) {
          const sym = firstArg.getSymbol();
          const d = sym?.getDeclarations()?.[0];
          if (d) {
            if (Node.isVariableDeclaration(d)) {
              const init = d.getInitializer();
              if (init && Node.isCallExpression(init) && visit(init))
                return true;
            } else if (
              Node.isFunctionDeclaration(d) ||
              Node.isArrowFunction(d) ||
              Node.isFunctionExpression(d)
            ) {
              // plain component — nothing to do
            }
          }
        }
      }

      return false;
    };

    return visit(expr);
  }

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = path.relative(projectRootPath, sourceFile.getFilePath());
    if (!filePath.startsWith("src/app") || !filePath.endsWith("page.tsx"))
      continue;

    const routeName =
      filePath
        .split("/")
        .slice(2, -1)
        .reduce((s, p) => {
          if (!/^[a-zA-Z0-9]/.test(p)) return s;
          return s + upperCaseFirstLetter(p);
        }, "") || "Index";

    const pathParts = filePath
      .split("/")
      .slice(2, -1)
      .filter((p) => !/^[(@.]/.test(p))
      .map((p) => ({ part: p, isParam: /\[.*?\]/.test(p) }))
      .map(({ part, isParam }) => ({
        part,
        isArrayParam: part.startsWith("[..."),
        isParam,
      }))
      .map(({ part, isArrayParam, isParam }) => ({
        part: isArrayParam
          ? part.slice(4, -1)
          : isParam
          ? part.slice(1, -1)
          : part,
        isArrayParam,
        isParam,
      }));

    const parameters = (function getPageComponentProps(symbol) {
      const declarations = symbol.getDeclarations();
      if (declarations.length !== 1)
        throw new Error(
          `Multiple declarations in search for page component\nfile: ${filePath}\nline numbers: ${declarations
            .map((d) => d.getStartLineNumber())
            .join(", ")}`,
        );
      const declaration = declarations[0];
      if (declaration.isKind(SyntaxKind.FunctionDeclaration))
        return declaration.getSignature().getParameters();
      if (declaration.isKind(SyntaxKind.FunctionExpression))
        return declaration.getSignature().getParameters();
      if (declaration.isKind(SyntaxKind.ArrowFunction))
        return declaration.getSignature().getParameters();
      if (declaration.isKind(SyntaxKind.ExportAssignment)) {
        let expr = declaration.getExpression();

        // Unwrap chains like withParams(withUser(withFoo(Page)))
        while (expr.isKind(SyntaxKind.CallExpression)) {
          const args = expr.getArguments();
          if (args.length === 0) break;
          const first = args[0];

          // If first arg is another HOC call, keep unwrapping
          if (first.isKind(SyntaxKind.CallExpression)) {
            expr = first;
            continue;
          }

          // If first arg is an inline function, normalize to symbols
          if (
            first.isKind(SyntaxKind.ArrowFunction) ||
            first.isKind(SyntaxKind.FunctionExpression)
          ) {
            return first.getParameters().map((p) => p.getSymbolOrThrow());
          }

          // If first arg is an identifier, resolve its symbol and recurse
          if (first.isKind(SyntaxKind.Identifier)) {
            const sym = first.getSymbol();
            if (!sym)
              throw new Error(
                "Could not resolve symbol for page component identifier",
              );
            return getPageComponentProps(sym);
          }

          // Anything else—stop unwrapping
          break;
        }

        // Fallback: export default is itself a callable expression/identifier
        const sigs = expr.getType().getCallSignatures();
        if (sigs.length !== 1)
          throw new Error("Multiple signatures in search for page component");
        return sigs[0].getParameters();
      }

      throw new Error("Could not find page component parameters");
    })(sourceFile.getDefaultExportSymbolOrThrow());

    if (parameters.length > 1)
      throw new Error("Expected one or zero parameter for page component");
    const propsType =
      parameters.length > 0
        ? parameters[0].getTypeAtLocation(parameters[0].getDeclarations()[0])
        : undefined;

    if (propsType && !doesResolveToObject(propsType))
      throw new Error(
        `Expected object type for page component parameter (props) but got ${propsType.getText()}`,
      );

    console.log(`Processing ${filePath} (${routeName}) ...`);
    const missingPathParams = pathParts.filter(
      ({ part, isParam }) =>
        isParam && !(propsType && propsType.getProperty(part)),
    );
    if (missingPathParams.length > 0) {
      throw new Error(
        `These parameters are missing from the page component: ${missingPathParams
          .map(({ part }) => part)
          .join(", ")}`,
      );
    }

    const isPublic = detectIsPublicForFile(sourceFile);
    routes.set(routeName, {
      path: filePath,
      pathParts,
      propsType,
      isPublic,
    });
  }

  function buildUrlPropsTypeText(
    pathParts: Array<{ part: string; isParam: boolean; isArrayParam: boolean }>,
    searchPropSyms: Symbol[],
  ) {
    const pathFields = pathParts
      .filter((p) => p.isParam)
      .map((p) => `${p.part}: ${p.isArrayParam ? "string[]" : "string"}`);

    const searchFields = searchPropSyms.map((sym) => {
      // Always use URL shapes for search params:
      // they come from URLSearchParams, not the component’s TS/Zod type.
      return `${sym.getName()}?: string | string[]`;
    });

    const all = [...pathFields, ...searchFields];
    return all.length ? `{ ${all.join("; ")} }` : "undefined";
  }

  if (routes.size > 0) {
    serverTemplate.getImportDeclarations().forEach((importDeclaration) => {
      serverSourceFile.addImportDeclaration(importDeclaration.getStructure());
    });
    clientTemplate.getImportDeclarations().forEach((importDeclaration) => {
      clientSourceFile.addImportDeclaration(importDeclaration.getStructure());
    });

    for (const commonVariable of [
      "toStringParam",
      "toPathParams",
      "toSearchParams",
    ]) {
      serverSourceFile.addVariableStatement(
        serverTemplate
          .getVariableStatementOrThrow(commonVariable)
          .getStructure(),
      );
      clientSourceFile.addVariableStatement(
        clientTemplate
          .getVariableStatementOrThrow(commonVariable)
          .getStructure(),
      );
    }

    serverSourceFile.addStatements(`
      // ---- matching helpers (generated) ----
      const __isAbsoluteUrl = (s: string) => /^https?:\\/\\//i.test(s);

      function __parseRelativeUrl(raw: string): URL | null {
        if (!raw || __isAbsoluteUrl(raw)) return null;
        try { return new URL(raw, "http://local/"); } catch { return null; }
      }

      function __stripTrailingSlash(p: string) {
        return p === "/" ? "/" : p.replace(/\\/+$/, "");
      }
    `);

    const redirectSignatures: Map<string, ArrowFunction> = new Map();
    const hookSignatures: Map<string, ArrowFunction> = new Map();
    const INJECTED_PROP_NAMES = new Set(["user", "userId"]);
    for (const [routeName, routeInfo] of routes) {
      const { path, pathParts, propsType } = routeInfo;

      serverSourceFile.addStatements(`\n// Corresponding to ${path}`);
      if (!propsType) {
        const redirectFunction = addServerRedirectFunction(
          routeName,
          propsType,
          "redirectToRoute",
        );
        redirectFunction
          .getBody()
          .replaceWithText(
            `redirect("/${pathParts.map(({ part }) => part).join("/")}")`,
          );
        redirectSignatures.set(routeName, redirectFunction);
      } else if (pathParts) {
        const searchParamProperties = propsType
          .getProperties()
          .filter((p) => !pathParts.some(({ part }) => p.getName() === part))
          .filter((p) => !INJECTED_PROP_NAMES.has(p.getName()));

        if (searchParamProperties.length === 0) {
          const redirectFunction = addServerRedirectFunction(
            routeName,
            propsType,
            "redirectToRouteWithParams",
          );
          updateParamsArgument(
            redirectFunction
              .getBody()
              .getFirstDescendantByKindOrThrow(SyntaxKind.SpreadElement)
              .getExpressionIfKindOrThrow(SyntaxKind.CallExpression)
              .getArguments()
              .at(1),
            pathParts,
          );
          const urlPropsTypeText = buildUrlPropsTypeText(
            pathParts,
            searchParamProperties,
          );
          redirectFunction
            .getParameterOrThrow("props")
            .setType(urlPropsTypeText);
          redirectSignatures.set(routeName, redirectFunction);
        } else {
          const redirectFunction = addServerRedirectFunction(
            routeName,
            propsType,
            "redirectToRouteWithParamsSearchParams",
          );
          updateParamsArgument(
            redirectFunction
              .getBody()
              .getFirstDescendantByKindOrThrow(SyntaxKind.SpreadElement)
              .getExpressionIfKindOrThrow(SyntaxKind.CallExpression)
              .getArguments()
              .at(1),
            pathParts,
          );
          updateSearchParamsArgument(
            redirectFunction
              .getBody()
              .getFirstDescendantByKindOrThrow(SyntaxKind.BinaryExpression)
              .getRight()
              .asKindOrThrow(SyntaxKind.CallExpression)
              .getArguments()
              .at(1),
            searchParamProperties,
          );
          const urlPropsTypeText = buildUrlPropsTypeText(
            pathParts,
            searchParamProperties,
          );
          redirectFunction
            .getParameterOrThrow("props")
            .setType(urlPropsTypeText);
          redirectSignatures.set(routeName, redirectFunction);
        }
      } else {
        const redirectFunction = addServerRedirectFunction(
          routeName,
          propsType,
          "redirectToRouteWithSearchParams",
        );
        updateSearchParamsArgument(
          redirectFunction
            .getBody()
            .getFirstDescendantByKindOrThrow(SyntaxKind.TemplateSpan)
            .getExpressionIfKindOrThrow(SyntaxKind.CallExpression)
            .getArguments()
            .at(1),
          propsType.getProperties(),
        );
        redirectSignatures.set(routeName, redirectFunction);
      }

      if (routeName === "Login") {
        serverSourceFile.addStatements(`
export const hrefToLogin = (props: { url?: string | string[] }): string =>
  [
    "",
    ...toPathParams(props, [{ "part": "login", "isParam": false }]),
  ].join("/") + toSearchParams(props, ["url"]);
`);
      }

      clientSourceFile.addStatements(`\n// Corresponding to ${path}`);
      if (routeName === "Login") {
        clientSourceFile.addStatements(`
export const hrefToLogin = (props: { url?: string | string[] }): string =>
  [
    "",
    ...toPathParams(props, [{ "part": "login", "isParam": false }]),
  ].join("/") + toSearchParams(props, ["url"]);
`);
      }
      if (!propsType) {
        const redirectFunction = addClientRedirectHook(
          routeName,
          propsType,
          "useRouteTo",
        );
        redirectFunction
          .getBody()
          .getFirstDescendantByKindOrThrow(SyntaxKind.StringLiteral)
          .replaceWithText(`"/${pathParts.map(({ part }) => part).join("/")}"`);
        hookSignatures.set(routeName, redirectFunction);
      } else if (pathParts) {
        const searchParamProperties = propsType
          .getProperties()
          .filter((p) => !pathParts.some(({ part }) => p.getName() === part))
          .filter((p) => !INJECTED_PROP_NAMES.has(p.getName()));

        if (searchParamProperties.length === 0) {
          const redirectFunction = addClientRedirectHook(
            routeName,
            propsType,
            "useRouteToWithParams",
          );
          updateParamsArgument(
            redirectFunction
              .getBody()
              .getFirstDescendantByKindOrThrow(SyntaxKind.SpreadElement)
              .getExpressionIfKindOrThrow(SyntaxKind.CallExpression)
              .getArguments()
              .at(1),
            pathParts,
          );
          {
            const urlPropsTypeText = buildUrlPropsTypeText(
              pathParts,
              searchParamProperties,
            );
            redirectFunction
              .getParameterOrThrow("props")
              .setType(urlPropsTypeText); // <-- add this
          }
          hookSignatures.set(routeName, redirectFunction);
        } else {
          const redirectFunction = addClientRedirectHook(
            routeName,
            propsType,
            "useRouteToWithParamsSearchParams",
          );
          updateParamsArgument(
            redirectFunction
              .getBody()
              .getFirstDescendantByKindOrThrow(SyntaxKind.SpreadElement)
              .getExpressionIfKindOrThrow(SyntaxKind.CallExpression)
              .getArguments()
              .at(1),
            pathParts,
          );
          updateSearchParamsArgument(
            redirectFunction
              .getBody()
              .getFirstDescendantByKindOrThrow(SyntaxKind.BinaryExpression)
              .getRight()
              .asKindOrThrow(SyntaxKind.CallExpression)
              .getArguments()
              .at(1),
            searchParamProperties,
          );
          {
            const urlPropsTypeText = buildUrlPropsTypeText(
              pathParts,
              searchParamProperties,
            );
            redirectFunction
              .getParameterOrThrow("props")
              .setType(urlPropsTypeText); // <-- add this
          }
          hookSignatures.set(routeName, redirectFunction);
        }
      } else {
        const redirectFunction = addClientRedirectHook(
          routeName,
          propsType,
          "useRouteToWithSearchParams",
        );
        updateSearchParamsArgument(
          redirectFunction
            .getBody()
            .getFirstDescendantByKindOrThrow(SyntaxKind.TemplateSpan)
            .getExpressionIfKindOrThrow(SyntaxKind.CallExpression)
            .getArguments()
            .at(1),
          propsType.getProperties(),
        );
        hookSignatures.set(routeName, redirectFunction);
      }
    }

    const redirectInterface = serverSourceFile.addInterface({
      name: "RedirectTo",
      isExported: true,
    });
    redirectSignatures.forEach((redirectFunction, routeName) => {
      redirectInterface.addCallSignature({
        parameters: [
          { name: "routeName", type: JSON.stringify(routeName) },
          ...redirectFunction.getParameters().map((p) => p.getStructure()),
        ],
        returnType: "never",
      });
    });
    const redirectStatement = serverSourceFile.addVariableStatement(
      serverTemplate.getVariableStatementOrThrow("redirectTo").getStructure(),
    );
    const redirect = redirectStatement
      .getDeclarations()
      .at(0)
      ?.getInitializerIfKind(SyntaxKind.ArrowFunction);

    if (!redirect)
      throw new Error("Could not locate redirectTo template function");
    redirect.getParameterOrThrow("routeName").setType(
      Array.from(hookSignatures.keys())
        .map((k) => JSON.stringify(k))
        .join(" | "),
    );
    redirect
      .getBody()
      .asKindOrThrow(SyntaxKind.Block)
      .replaceWithText(
        "{\nswitch(routeName) {\n" +
          Array.from(hookSignatures.entries())
            .map(
              ([routeName, redirectFunction]) =>
                `case ${JSON.stringify(
                  routeName,
                )}: return redirectTo${routeName}(${
                  redirectFunction.getParameters().length === 0 ? "" : "props"
                });`,
            )
            .join("\n") +
          "}\n}",
      );

    // === Build MatchedRoute union ===
    const matchedRouteUnion = Array.from(routes.entries())
      .map(([routeName, routeInfo]) => {
        const { pathParts, propsType } = routeInfo;

        if (!propsType) return `| { name: ${JSON.stringify(routeName)} }`;

        const searchParamProperties = propsType
          .getProperties()
          .filter((p) => !pathParts.some((pp) => pp.part === p.getName()))
          .filter((p) => !INJECTED_PROP_NAMES.has(p.getName()));

        const urlPropsTypeText = buildUrlPropsTypeText(
          pathParts,
          searchParamProperties,
        );
        return urlPropsTypeText === "undefined"
          ? `| { name: ${JSON.stringify(routeName)} }`
          : `| { name: ${JSON.stringify(
              routeName,
            )}; props: ${urlPropsTypeText} }`;
      })
      .join("\n");

    serverSourceFile.addStatements(`
      export type MatchedRoute =
      ${matchedRouteUnion}
    `);

    // === Build matcher body ===
    const matcherCases = Array.from(routes.entries())
      .map(([routeName, routeInfo]) => {
        const { pathParts, propsType } = routeInfo;

        // Build a regex like ^/login$ or ^/link/(?<linkCode>[^/]+)$ or catch-all
        const regexParts = pathParts.map((pp) => {
          if (!pp.isParam)
            return `/${pp.part.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`;
          if (pp.isArrayParam) return `/(?<${pp.part}>(?:[^/]+)(?:/[^/]+)*)`;
          return `/(?<${pp.part}>[^/]+)`; // [slug]
        });
        const regexSrc = regexParts.length ? `^${regexParts.join("")}$` : "^/$";
        const pathParamNames = pathParts
          .filter((p) => p.isParam)
          .map((p) => p.part);

        // Compute search param names
        const searchPropNames = propsType
          ? propsType
              .getProperties()
              .map((p) => p.getName())
              .filter((n) => !pathParts.some((pp) => pp.part === n))
              .filter((n) => !INJECTED_PROP_NAMES.has(n))
          : [];

        // Build props extraction
        const buildProps = () => {
          const lines: string[] = [];
          // path params
          for (const name of pathParamNames) {
            const pp = pathParts.find((p) => p.part === name)!;
            if (pp.isArrayParam) {
              lines.push(`${name}: (m.groups!.${name} as string).split("/")`);
            } else {
              lines.push(`${name}: m.groups!.${name} as string`);
            }
          }
          // search params
          for (const name of searchPropNames) {
            lines.push(
              `${name}: (sp.get(${JSON.stringify(name)}) ?? undefined)`,
            );
          }
          if (lines.length === 0) return "undefined";
          return `{ ${lines.join(", ")} }`;
        };

        const propsExtraction = buildProps();

        // Return arm
        if (!propsType) {
          return `
  // ${routeName}
  if (re${routeName}.test(path)) {
    return { name: ${JSON.stringify(routeName)} };
  }`;
        } else {
          return `
  // ${routeName}
  {
    const m = path.match(re${routeName});
    if (m) {
      const sp = u.searchParams;
      const props = ${propsExtraction};
      return props ? { name: ${JSON.stringify(
        routeName,
      )}, props } : { name: ${JSON.stringify(routeName)} } as any;
    }
  }`;
        }
      })
      .join("\n");

    // Emit the regex declarations and the matcher + shim
    const regexDecls = Array.from(routes.keys())
      .map((routeName) => {
        const { pathParts } = routes.get(routeName)!;
        const regexParts = pathParts.map((pp) => {
          if (!pp.isParam)
            return `/${pp.part.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`;
          if (pp.isArrayParam) return `/(?<${pp.part}>(?:[^/]+)(?:/[^/]+)*)`;
          return `/(?<${pp.part}>[^/]+)`;
        });
        const regexSrc = regexParts.length ? `^${regexParts.join("")}$` : "^/$";
        return `const re${routeName} = new RegExp(${JSON.stringify(
          regexSrc,
        )});`;
      })
      .join("\n");

    serverSourceFile.addStatements(`
${regexDecls}

export function matchRouteFromUrl(raw: string): MatchedRoute | null {
  const u = __parseRelativeUrl(raw);
  if (!u) return null;
  const path = __stripTrailingSlash(u.pathname || "/");

${matcherCases}

  return null;
}

export function isRedirectUrlAcceptable(raw: string): boolean {
  return matchRouteFromUrl(raw) !== null;
}

export function redirectToMatchedUrl(raw: string): never {
  const m = matchRouteFromUrl(raw);
  if (!m) return redirectTo("Home");
  switch (m.name) {
${Array.from(routes.entries())
  .map(([routeName, routeInfo]) => {
    const { pathParts, propsType } = routeInfo;
    const hasPathParams = pathParts.some((p) => p.isParam);
    const hasSearchParams = propsType
      ? propsType
          .getProperties()
          .some(
            (p) =>
              !pathParts.some((pp) => pp.part === p.getName()) &&
              !INJECTED_PROP_NAMES.has(p.getName()),
          )
      : false;
    const hasUrlProps = hasPathParams || hasSearchParams;
    return `    case ${JSON.stringify(
      routeName,
    )}: return redirectTo(${JSON.stringify(routeName)}${
      hasUrlProps ? ", (m as any).props" : ""
    });`;
  })
  .join("\n")}
  }
}
`);

    const publicNames = Array.from(routes.entries())
      .filter(([, info]) => info.isPublic)
      .map(([name]) => JSON.stringify(name))
      .join(", ");

    serverSourceFile.addStatements(`
export type RouteName = MatchedRoute["name"];

export const PUBLIC_ROUTE_NAMES: ReadonlySet<RouteName> = new Set([${publicNames}]);

export function isPublicUrl(raw: string): boolean {
  const m = matchRouteFromUrl(raw);
  return !!m && PUBLIC_ROUTE_NAMES.has(m.name);
}
`);

    const useGotoInterface = clientSourceFile.addInterface({
      name: "UseGoto",
      isExported: true,
    });
    hookSignatures.forEach((redirectFunction, routeName) => {
      useGotoInterface.addCallSignature({
        parameters: [{ name: "routeName", type: JSON.stringify(routeName) }],
        returnType: redirectFunction.getType().getText(),
      });
    });
    const useGotoHookStatement = clientSourceFile.addVariableStatement(
      clientTemplate.getVariableStatementOrThrow("useGoto").getStructure(),
    );
    const useGotoHook = useGotoHookStatement
      .getDeclarations()
      .at(0)
      ?.getInitializerIfKind(SyntaxKind.ArrowFunction);
    if (!useGotoHook) throw new Error("Could not locate useGoto template hook");
    useGotoHook.getParameterOrThrow("routeName").setType(
      Array.from(hookSignatures.keys())
        .map((k) => JSON.stringify(k))
        .join(" | "),
    );
    useGotoHook
      .getBody()
      .asKindOrThrow(SyntaxKind.Block)
      .replaceWithText(
        "{\n" +
          Array.from(hookSignatures.keys())
            .map(
              (routeName, index) =>
                `const __route${index} = useGoto${routeName}();`,
            )
            .join("\n") +
          "\nswitch(routeName) {\n" +
          Array.from(hookSignatures.keys())
            .map(
              (routeName, index) =>
                `case ${JSON.stringify(routeName)}: return __route${index};`,
            )
            .join("\n") +
          "}\n}",
      );

    serverSourceFile.insertStatements(0, [
      `// This file is auto-generated by ${path.relative(
        projectRootPath,
        __filename,
      )}\n`,
    ]);
    clientSourceFile.insertStatements(0, [
      `// This file is auto-generated by ${path.relative(
        projectRootPath,
        __filename,
      )}\n`,
    ]);
  }

  clientSourceFile.insertStatements(0, [
    "/* eslint-disable @typescript-eslint/no-explicit-any */",
  ]);
  serverSourceFile.insertStatements(0, [
    "/* eslint-disable @typescript-eslint/no-explicit-any */",
  ]);
  clientSourceFile.fixUnusedIdentifiers();
  serverSourceFile.fixUnusedIdentifiers();
  clientSourceFile.formatText({
    indentSize: 2,
    convertTabsToSpaces: true,
    ensureNewLineAtEndOfFile: true,
    trimTrailingWhitespace: true,
  });
  serverSourceFile.formatText({
    indentSize: 2,
    convertTabsToSpaces: true,
    ensureNewLineAtEndOfFile: true,
    trimTrailingWhitespace: true,
  });
  clientSourceFile.saveSync();
  serverSourceFile.saveSync();
};

main();
