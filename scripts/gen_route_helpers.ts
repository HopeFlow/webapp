import path from "node:path";
import {
  createProject,
  doesResolveToObject,
  getResolvedTypeText,
  toPascalCase,
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
    propsType: Symbol[] | undefined,
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
        .setType(
          `{${propsType
            .map(
              (p) =>
                `${p.getName()}${p.isOptional() ? "?" : ""}: ${p
                  .getTypeAtLocation(redirectFunction)
                  .getText()}`,
            )
            .join(",")}}`,
        );
    return redirectFunction;
  };

  const addClientRedirectHook = (
    routeName: string,
    propsType: Symbol[] | undefined,
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
        .setType(
          `{${propsType
            .map(
              (p) =>
                `${p.getName()}${p.isOptional() ? "?" : ""}: ${p
                  .getTypeAtLocation(redirectFunction)
                  .getText()}`,
            )
            .join(",")}}`,
        );
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
    propsType: Symbol[] | undefined;
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
          // return s + upperCaseFirstLetter(p);
          return s + toPascalCase(p);
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

    console.log(`Processing ${filePath} (${routeName}) ...`);

    const defaultExportSymbol = sourceFile.getDefaultExportSymbolOrThrow();
    const isPublic = defaultExportSymbol
      .getDeclarations()
      .some(
        (d) =>
          d
            .getFirstDescendantByKind(SyntaxKind.CallExpression)
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

    const [parameters, ignoreUserParam] = (function getPageComponentProps(
      symbol,
    ) {
      const declarations = symbol.getDeclarations();
      if (declarations.length !== 1)
        throw new Error(
          `Multiple declarations in search for page component\nfile: ${filePath}\nline numbers: ${declarations
            .map((d) => d.getStartLineNumber())
            .join(", ")}`,
        );
      const declaration = declarations[0];
      if (declaration.isKind(SyntaxKind.FunctionDeclaration))
        return [declaration.getSignature().getParameters(), false];
      if (declaration.isKind(SyntaxKind.FunctionExpression))
        return [declaration.getSignature().getParameters(), false];
      if (declaration.isKind(SyntaxKind.ArrowFunction))
        return [declaration.getSignature().getParameters(), false];
      if (declaration.isKind(SyntaxKind.ExportAssignment)) {
        let ignoreUserParam = false;
        let expression: Node = declaration.getExpression();
        while (expression.isKind(SyntaxKind.CallExpression)) {
          const calleeText = expression.getExpression().getText();
          if (["withParams", "withParamsAndUser"].includes(calleeText)) {
            const callArguments = expression.getArguments();
            if (callArguments.length !== 2)
              throw new Error(`Expected 2 arguments for ${calleeText}`);
            ignoreUserParam = calleeText === "withParamsAndUser";
            expression = callArguments[0];
          } else if (["publicPage", "withUser"].includes(calleeText)) {
            const callArguments = expression.getArguments();
            if (callArguments.length !== 1)
              throw new Error(`Expected 1 argument for ${calleeText}`);
            ignoreUserParam = calleeText === "withUser";
            expression = callArguments[0];
          } else break;
        }
        const signatures = expression.getType().getCallSignatures();
        if (signatures.length !== 1)
          throw new Error("Multiple signatures in search for page component");
        return [
          signatures[0]
            .getParameters()
            .filter((p) => !ignoreUserParam || p.getName() !== "user"),
          ignoreUserParam,
        ];
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

    const filteredPropsType = propsType
      ?.getProperties()
      .filter((p) => !ignoreUserParam || p.getName() !== "user");

    routes.set(routeName, {
      path: filePath,
      pathParts,
      propsType:
        filteredPropsType && filteredPropsType.length > 0
          ? filteredPropsType
          : undefined,
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
        const searchParamProperties = propsType.filter(
          (p) => !pathParts.some(({ part }) => p.getName() === part),
        );
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
          propsType,
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
        const searchParamProperties = propsType.filter(
          (p) => !pathParts.some(({ part }) => p.getName() === part),
        );
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
          propsType,
        );
        hookSignatures.set(routeName, redirectFunction);
      }
    }

    const routeSpecsMapVarStatement = serverSourceFile.addVariableStatement(
      serverTemplate.getVariableStatementOrThrow("routeSpecs").getStructure(),
    );
    const routeSpecsMap = routeSpecsMapVarStatement.getDeclarations().at(0);
    if (!routeSpecsMap) throw new Error("Could not find routeSpecs variable");
    routeSpecsMapVarStatement.prependWhitespace("\n");

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
    const escapeRegExp = (v: string) =>
      v.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
    const getRouteSpecStr = (v: RouteInfo) =>
      `{ pathRegExp: /^\\/${v.pathParts
        .map(({ part, isParam, isArrayParam }) =>
          !isParam
            ? escapeRegExp(part)
            : !isArrayParam
            ? `(?<${part}>[^/]+)`
            : `(?<${part}>.+)`,
        )
        .join(
          "\\/",
        )}$/, paramsTypeDef: ${v.paramsTypeDef?.getText()}, searchParamsTypeDef: ${v.searchParamsTypeDef?.getText()}, isPublic: ${
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

    for (const funcName of ["parseRouteFromUrl", "isValidUrl", "isPublicUrl"]) {
      serverSourceFile
        .addVariableStatement(
          serverTemplate.getVariableStatementOrThrow(funcName).getStructure(),
        )
        .prependWhitespace("\n");
    }

    const redirectToVarStatement = serverSourceFile.addVariableStatement(
      serverTemplate.getVariableStatementOrThrow("redirectTo").getStructure(),
    );
    const redirectToReturn =
      redirectToVarStatement.getFirstDescendantByKindOrThrow(
        SyntaxKind.ReturnStatement,
      );
    redirectToVarStatement.prependWhitespace("\n");

    redirectToReturn.replaceWithText(
      "switch(routeName) {\n" +
        Array.from(hookSignatures.entries())
          .map(
            ([routeName, redirectFunction]) =>
              `case ${JSON.stringify(
                routeName,
              )}: return redirectTo${routeName}(${
                redirectFunction.getParameters().length === 0
                  ? ""
                  : "props as any"
              });`,
          )
          .join("\n") +
        "}",
    );

    clientSourceFile
      .addVariableStatement(
        clientTemplate.getVariableStatementOrThrow("useGoto").getStructure(),
      )
      .prependWhitespace("\n");

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
