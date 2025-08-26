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

    routes.set(routeName, {
      path: filePath,
      pathParts,
      propsType,
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
