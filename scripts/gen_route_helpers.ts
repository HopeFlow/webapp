import path from "node:path";
import {
  createProject,
  doesResolveToObject,
  getResolvedTypeText,
  upperCaseFirstLetter,
} from "./ts_morph_utilities";
import {
  ArrowFunction,
  CallExpression,
  Node,
  ObjectLiteralExpression,
  Symbol,
  SyntaxKind,
  Type,
} from "ts-morph";

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
    if (propsType)
      redirectFunction
        .getParameterOrThrow("props")
        .setType(getResolvedTypeText(propsType));
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
    if (propsType)
      redirectFunction
        .getParameterOrThrow("props")
        .setType(getResolvedTypeText(propsType));
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
    paramsTypeDef: CallExpression | undefined;
    searchParamsTypeDef: CallExpression | undefined;
    isPublic: boolean;
  };
  const routes = new Map<string, RouteInfo>();

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

    const defaultExportSymbol = sourceFile.getDefaultExportSymbolOrThrow();
    const isPublic = defaultExportSymbol
      .getDeclarations()
      .some(
        (d) =>
          d
            .getFirstAncestorByKind(SyntaxKind.CallExpression)
            ?.getExpressionIfKind(SyntaxKind.Identifier)
            ?.getText() === "publicPage",
      );
    let paramsTypeDef: CallExpression | undefined;
    let searchParamsTypeDef: CallExpression | undefined;
    const getPropertyFromPropertyAssignment = (
      expr: ObjectLiteralExpression,
      name: string,
    ) => {
      const property = expr.getProperty(name);
      if (!property) return;
      if (!property.isKind(SyntaxKind.PropertyAssignment))
        throw new Error(
          `Property ${name} in ${expr.getText()} is not PropertyAssignment`,
        );
      return property.getInitializerIfKindOrThrow(SyntaxKind.CallExpression);
    };
    defaultExportSymbol.getDeclarations().forEach((d) => {
      if (d.isKind(SyntaxKind.ExportAssignment)) {
        d.forEachDescendant((n) => {
          if (n.isKind(SyntaxKind.CallExpression)) {
            if (
              ["withParams", "withParamsAndUser"].includes(
                n.getExpression().getText(),
              )
            ) {
              const typeDefArgument = n.getArguments().at(1);
              if (!typeDefArgument)
                throw new Error(
                  `Expected type def argument for ${n
                    .getExpression()
                    .getText()}`,
                );
              if (!typeDefArgument.isKind(SyntaxKind.ObjectLiteralExpression))
                throw new Error(
                  `Expected type def argument for ${n
                    .getExpression()
                    .getText()} to be ObjectLiteralExpression`,
                );
              paramsTypeDef = getPropertyFromPropertyAssignment(
                typeDefArgument,
                "paramsTypeDef",
              );
              searchParamsTypeDef = getPropertyFromPropertyAssignment(
                typeDefArgument,
                "searchParamsTypeDef",
              );
            }
          }
        });
      }
    });

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
        let expression = declaration.getExpression();
        if (expression.isKind(SyntaxKind.CallExpression)) {
          if (expression.getExpression().getText() === "withParams") {
            const callArguments = expression.getArguments();
            if (callArguments.length !== 2)
              throw new Error("Expected 2 arguments for withParams");
            const handlerArgumentSymbol = callArguments[0].getSymbolOrThrow();
            return getPageComponentProps(handlerArgumentSymbol);
          }
        }
        const signatures = expression.getType().getCallSignatures();
        if (signatures.length !== 1)
          throw new Error("Multiple signatures in search for page component");
        return signatures[0].getParameters();
      }
      throw new Error("Could not find page component parameters");
    })(defaultExportSymbol);

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

    routes.set(routeName, {
      path: filePath,
      pathParts,
      propsType,
      paramsTypeDef,
      searchParamsTypeDef,
      isPublic,
    });
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

    const redirectSignatures: Map<string, ArrowFunction> = new Map();
    const hookSignatures: Map<string, ArrowFunction> = new Map();
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
          .filter((p) => !pathParts.some(({ part }) => p.getName() === part));
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

      clientSourceFile.addStatements(`\n// Corresponding to ${path}`);
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
          .filter((p) => !pathParts.some(({ part }) => p.getName() === part));
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

    const routeSpecsMap = serverSourceFile
      .addVariableStatement(
        serverTemplate.getVariableStatementOrThrow("routeSpecs").getStructure(),
      )
      .getDeclarations()
      .at(0);
    if (!routeSpecsMap) throw new Error("Could not find routeSpecs variable");

    routeSpecsMap
      .getTypeNodeOrThrow()
      .asKindOrThrow(SyntaxKind.TypeReference)
      .getTypeArguments()
      .at(0)
      ?.replaceWithText(
        Array.from(hookSignatures.keys())
          .map((k) => JSON.stringify(k))
          .join(" | "),
      );

    const getRouteSpecStr = (v: RouteInfo) =>
      `{ pathRegExp: /^$/, paramsTypeDef: ${v.paramsTypeDef?.getText()}, searchParamsTypeDef: ${v.searchParamsTypeDef?.getText()}, isPublic: ${
        v.isPublic
      } }`;
    routeSpecsMap
      .getInitializerIfKindOrThrow(SyntaxKind.NewExpression)
      .addArgument(
        [
          "[",
          ...Array.from(routes.entries()).map(
            ([k, v]) => `[${JSON.stringify(k)}, ${getRouteSpecStr(v)}],`,
          ),
          "]",
        ].join("\n"),
      );

    for (const funcName of ["parseRouteFromUrl", "isValidUrl", "isPublicUrl"])
      serverSourceFile.addVariableStatement(
        serverTemplate.getVariableStatementOrThrow(funcName).getStructure(),
      );

    const redirectToReturn = serverSourceFile
      .addVariableStatement(
        serverTemplate.getVariableStatementOrThrow("redirectTo").getStructure(),
      )
      .getFirstDescendantByKindOrThrow(SyntaxKind.ReturnStatement);
    redirectToReturn.replaceWithText(
      "switch(routeName) {\n" +
        Array.from(hookSignatures.entries())
          .map(
            ([routeName, redirectFunction]) =>
              `case ${JSON.stringify(
                routeName,
              )}: return redirectTo${routeName}(${
                redirectFunction.getParameters().length === 0 ? "" : "props as any"
              });`,
          )
          .join("\n") +
        "}",
    );

    clientSourceFile.addVariableStatement(
      clientTemplate.getVariableStatementOrThrow("useGoto").getStructure(),
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
