import path from "node:path";
import {
  Project,
  SyntaxKind,
  Node,
  Symbol,
  SourceFile,
  VariableDeclaration,
  ArrowFunction,
  Type,
  Block,
  InterfaceDeclaration,
  ParameterDeclarationStructure,
} from "ts-morph";
import fs from "node:fs";

const getOriginalTypeText = (type: import("ts-morph").Type): string => {
  // If it's a type alias, try to resolve
  if (type.isTypeParameter() && type.getConstraint()) {
    return getOriginalTypeText(type.getConstraint()!);
  }
  if (type.isUnion()) {
    // For unions, join the text of constituent types
    return type.getUnionTypes().map(getOriginalTypeText).join(" | ");
  }
  if (type.isTuple()) {
    return (
      "[" + type.getTupleElements().map(getOriginalTypeText).join(", ") + "]"
    );
  }
  if (type.isLiteral()) {
    return type.getText();
  }
  // Try to resolve to the target if it's an alias
  const aliasSymbol = type.getAliasSymbol();
  if (aliasSymbol) {
    const targetType = type.getAliasTypeArguments()[0] ?? type;
    return getOriginalTypeText(targetType);
  }
  // Fallback: just return the text
  return type.getText();
};

const createProject = () => {
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
  });

  const projectRootPath =
    project.getRootDirectories().at(0)?.getPath() ?? path.resolve("..");

  const getShortestModuleSpecifier = (
    moduleSpecifier: string,
    importerModulePath: string,
  ) => {
    if (!moduleSpecifier.startsWith(".") && !moduleSpecifier.startsWith("/"))
      return moduleSpecifier;
    let result = null;
    for (const candidate of [
      path.relative(projectRootPath, moduleSpecifier),
      path.relative(importerModulePath, moduleSpecifier),
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
  return [projectRootPath, getShortestModuleSpecifier, project] as const;
};

const realSymbol = (node: Node | undefined) => {
  if (!node) return undefined;
  const symbol = node.getSymbol();
  return symbol?.getAliasedSymbol() ?? symbol;
};

type ActionInfo = {
  type: "serverAction" | "crudServerAction" | "crudServerActionVariant";
  id: string;
  variantName?: string;
  mutations?: string[];
  parent?: Symbol;
  variants?: Map<Symbol, ActionInfo>;
  dependants?: Map<Symbol, ActionInfo>;
};

const analyseProject = (project: Project) => {
  const actionSymbols = new Map<Symbol, ActionInfo>();

  const dependants = new Map<Symbol, Set<Symbol>>();

  for (const sourceFile of project.getSourceFiles()) {
    for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
      for (const declaration of declarations) {
        if (declaration.isKind(SyntaxKind.VariableDeclaration)) {
          const candidateServerActionSymbol = realSymbol(declaration);
          if (!candidateServerActionSymbol) {
            console.warn(`Could not find symbol for declaration: ${name}`);
            continue;
          }
          const call = declaration
            .getInitializer()
            ?.asKind(SyntaxKind.CallExpression);
          const callee = call?.getExpression();
          if (!call || !callee) continue;
          if (callee.isKind(SyntaxKind.Identifier)) {
            if (callee.getText() === "createServerAction") {
              // TODO: Handle cases when parameter is not string literal
              actionSymbols.set(candidateServerActionSymbol, {
                id: call
                  .getArguments()
                  .at(0)!
                  .asKind(SyntaxKind.StringLiteral)!
                  .getLiteralValue(),
                type: "serverAction",
              });
            }
            if (callee.getText() === "createCrudServerAction") {
              // TODO: Handle cases when parameter is not object literal
              const argument = call
                .getArguments()
                .at(0)!
                .asKind(SyntaxKind.ObjectLiteralExpression)!;

              const isMutationProvided = (mutation: string) => {
                const initializer = argument
                  .getProperty(mutation)
                  ?.asKind(SyntaxKind.PropertyAssignment)
                  ?.getInitializer();
                if (!initializer) return false;
                return initializer.getText() !== "undefined";
              };

              actionSymbols.set(candidateServerActionSymbol, {
                id: argument
                  .getProperty("id")!
                  .asKind(SyntaxKind.PropertyAssignment)!
                  .getInitializer()!
                  .asKind(SyntaxKind.StringLiteral)!
                  .getLiteralValue(),
                type: "crudServerAction",
                mutations: ["create", "update", "remove"].filter((mutation) =>
                  isMutationProvided(mutation),
                ),
              });
            }
          }
          if (callee.isKind(SyntaxKind.PropertyAccessExpression)) {
            const parent = realSymbol(
              callee.getExpressionIfKind(SyntaxKind.Identifier),
            );
            if (parent && callee.getName() === "createVariant") {
              const parentAction = actionSymbols.get(parent);
              const variantName = call
                .getArguments()
                .at(0)!
                .asKind(SyntaxKind.StringLiteral)!
                .getLiteralValue();
              actionSymbols.set(candidateServerActionSymbol, {
                id: `${parentAction!.id}.${variantName}`,
                variantName,
                type: "crudServerActionVariant",
                parent,
              });
            }
          }
        }
      }
    }
    sourceFile.forEachDescendant((node) => {
      if (!node.isKind(SyntaxKind.CallExpression)) return;
      const callee = node.getExpression();
      if (!callee.isKind(SyntaxKind.PropertyAccessExpression)) return;
      if (callee.getName() !== "addInvalidation") return;
      const candidateServerActionSymbol = realSymbol(
        callee.getExpressionIfKind(SyntaxKind.Identifier),
      );
      if (!candidateServerActionSymbol) return;
      const action = actionSymbols.get(candidateServerActionSymbol);
      if (!action) {
        console.warn(
          `Could not find action for symbol: ${candidateServerActionSymbol.getName()}`,
        );
        return;
      }
      const args = node.getArguments();
      if (args.length < 1) {
        console.warn(
          `Call ${candidateServerActionSymbol.getName()}.addInvalidation has no arguments`,
        );
        return;
      }
      const dependantSymbol = realSymbol(args[0]);
      if (!dependantSymbol) {
        console.warn(
          `Could not find symbol for dependant in ${candidateServerActionSymbol.getName()}.addInvalidation(${args[0].getText()})`,
        );
        return;
      }
      if (!dependants.has(candidateServerActionSymbol))
        dependants.set(candidateServerActionSymbol, new Set());
      dependants.get(candidateServerActionSymbol)!.add(dependantSymbol);
    });
  }

  const variants = new Map<Symbol, Set<Symbol>>();
  for (const [symbol, action] of Array.from(actionSymbols.entries()).filter(
    ([, action]) => action.type === "crudServerActionVariant",
  )) {
    if (!action.parent) {
      console.warn(`Variant action ${symbol.getName()} has no parent`);
      continue;
    }
    if (!variants.has(action.parent)) {
      variants.set(action.parent, new Set());
    }
    variants.get(action.parent)!.add(symbol);
  }

  return new Map<Symbol, ActionInfo>(
    actionSymbols
      .entries()
      .filter(([, action]) => action.type !== "crudServerActionVariant")
      .map(([symbol, { parent: _, ...action }]) => [
        symbol,
        {
          ...action,
          dependants: !dependants.has(symbol)
            ? undefined
            : new Map(
                Array.from(dependants.get(symbol)!).map((s) => [
                  s,
                  actionSymbols.get(s)!,
                ]),
              ),
          variants: !variants.has(symbol)
            ? undefined
            : new Map(
                Array.from(variants.get(symbol)!).map((s) => [
                  s,
                  actionSymbols.get(s)!,
                ]),
              ),
        },
      ]),
  );
};

const upperCaseFirstLetter = (str: string) =>
  str[0].toUpperCase() + str.slice(1);

const idToHookName = (id: string) => `use${upperCaseFirstLetter(id)}`;

const getActionSymbolType = (actionSymbol: Symbol) =>
  actionSymbol.getTypeAtLocation(actionSymbol.getDeclarations().at(0)!);

const getActionSymbolTypeParams = (actionSymbol: Symbol) =>
  getActionSymbolType(actionSymbol).getTypeArguments();

const setHookName = (declaration: VariableDeclaration, id: string) =>
  declaration.rename(idToHookName(id));

const addHookVariableStatement = (
  templateHookName: string,
  actionSymbol: Symbol,
  actionInfo: ActionInfo,
  argsType: Type,
  templateSourceFile: SourceFile,
  sourceFile: SourceFile,
  mutationDataTypeMap?: Map<string, Type>,
) => {
  const templateStatement =
    templateSourceFile.getVariableStatement(templateHookName)!;
  const isOriginalArgsEmpty = isEmptyArgsType(argsType);
  const argsTypes = new Map(
    actionInfo.variants
      ? [
          [actionSymbol, [argsType, isOriginalArgsEmpty]] as const,
          ...Array.from(actionInfo.variants.keys()).map(
            (symbol) =>
              [
                symbol,
                ((type) => [type, isEmptyArgsType(type)] as const)(
                  getActionSymbolTypeParams(symbol).at(0)!,
                ),
              ] as const,
          ),
        ]
      : ([[actionSymbol, [argsType, isOriginalArgsEmpty]]] as const),
  );
  const isArgsEmpty = Array.from(argsTypes.values()).every(
    ([, isEmpty]) => isEmpty,
  );
  let hookType: InterfaceDeclaration | null = null;
  if (argsTypes.size > 1) {
    const typeChecker = sourceFile.getProject().getTypeChecker();
    const isRestParam = (paramSymbol: Symbol) =>
      paramSymbol
        .getValueDeclarationOrThrow()
        .asKindOrThrow(SyntaxKind.Parameter)
        .isRestParameter();
    const callSignatures = [
      ...Array.from(actionInfo.variants?.entries() ?? []).map(
        ([variantSymbol, variantInfo]) =>
          [variantInfo.variantName!, variantSymbol] as const,
      ),
      [null, actionSymbol] as const,
    ].map(([name, symbol]) => {
      const variantNameParam = actionInfo.variants
        ? [
            {
              isRestParameter: false,
              name: "variantName",
              type: JSON.stringify(name),
            },
          ]
        : [];
      const callSignature =
        symbol === actionSymbol
          ? getActionSymbolType(symbol)
              .getCallSignatures()
              .find(
                (signature) =>
                  getActionSymbolType(
                    signature.getParameters().at(0)!,
                  ).getLiteralValue() === "read",
              )!
          : getActionSymbolType(symbol).getCallSignatures().at(0)!;
      const restParams = callSignature.getParameters().flatMap((p) =>
        symbol === actionSymbol && p.getName() === "action"
          ? []
          : [
              {
                isRestParameter: isRestParam(p),
                name: p.getName(),
                type: getOriginalTypeText(
                  typeChecker.getTypeOfSymbolAtLocation(
                    p,
                    p.getValueDeclarationOrThrow(),
                  ),
                ),
              },
            ],
      );
      return {
        parameters: [...variantNameParam, ...restParams],
        returnType:
          `UseQueryResult<${getOriginalTypeText(
            typeChecker
              .getReturnTypeOfSignature(callSignature)
              .getTypeArguments()
              .at(0)!,
          )}>` +
          (symbol === actionSymbol && actionInfo.mutations
            ? `& { ${actionInfo.mutations.map(
                (mutation) =>
                  `${mutation}: UseMutationResult<boolean, Error, ${getOriginalTypeText(
                    mutationDataTypeMap!.get(mutation)!,
                  )}>`,
              )} }`
            : ""),
      };
    });
    hookType = sourceFile.addInterface({
      name: `Use${upperCaseFirstLetter(actionInfo.id)}`,
      isExported: true,
    });
    hookType.addCallSignatures(callSignatures);
  }
  const hookDeclaration = sourceFile
    .addVariableStatement(templateStatement.getStructure())
    .setIsExported(true)
    .getDeclarations()
    .at(0)!
    .asKind(SyntaxKind.VariableDeclaration)!;
  setHookName(hookDeclaration, actionInfo.id);
  const functionDeclaration = hookDeclaration.getInitializerIfKindOrThrow(
    SyntaxKind.ArrowFunction,
  );
  if (hookType) {
    hookDeclaration.setType(hookType.getName());
    functionDeclaration.setReturnType("any");
  }
  if (actionInfo.variants)
    functionDeclaration.insertParameter(0, {
      name: "variantName",
      type:
        Array.from(actionInfo.variants.values())
          .map((variantInfo) => JSON.stringify(variantInfo.variantName))
          .join(" | ") + " | null",
    });
  if (isArgsEmpty) functionDeclaration.getParameterOrThrow("args").remove();
  else
    functionDeclaration
      .getParameterOrThrow("args")
      .setType(
        argsTypes.size === 1
          ? getOriginalTypeText(Array.from(argsTypes.values()).at(0)![0])
          : "unknown[]",
      );
  return [
    hookDeclaration,
    functionDeclaration,
    isArgsEmpty,
    isOriginalArgsEmpty,
    argsTypes,
    hookType !== null,
  ] as const;
};

const isEmptyArgsType = (type: Type) =>
  type.isTuple() && type.getTupleElements().length === 0;

const setQueryKey = (
  functionDeclaration: ArrowFunction,
  idOrRawExpression: string,
  isArgsEmpty: boolean,
  useRawExpression?: true,
) => {
  functionDeclaration
    .getVariableDeclaration("queryKey")
    ?.setInitializer(
      `[${
        useRawExpression ? idOrRawExpression : JSON.stringify(idOrRawExpression)
      }${isArgsEmpty ? "" : ", ...args"}]`,
    );
};

const setDependentQueryKeys = (
  functionDeclaration: ArrowFunction,
  variants: string[],
  dependants: string[],
) => {
  functionDeclaration
    .getVariableDeclaration("dependantQueryKeys")!
    .setInitializer(
      JSON.stringify([
        ...variants.map((variant) => [variant]),
        ...dependants.map((dependant) => [dependant]),
      ]),
    );
};

const rectifyServerActionCalls = (
  functionDeclaration: ArrowFunction,
  templateServerFunctionName: string,
  serverFunctionName: string,
  isArgsEmpty: boolean,
  argsType?: Type,
) => {
  functionDeclaration
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(
      (call) => call.getExpression().getText() === templateServerFunctionName,
    )
    .forEach((serverActionCall) => {
      serverActionCall.setExpression(serverFunctionName);
      if (isArgsEmpty)
        serverActionCall
          .getArguments()
          .filter((arg) => arg.getText() === "...args")
          .forEach((arg) => serverActionCall.removeArgument(arg));
      else if (argsType)
        serverActionCall
          .getArguments()
          .filter((arg) => arg.getText() === "args")
          .forEach((arg) =>
            arg.replaceWithText(
              `${arg.getText()} as ${getOriginalTypeText(argsType)}`,
            ),
          );
    });
};

const buildServerActionHook = (
  actionSymbol: Symbol,
  actionInfo: ActionInfo,
  templateSourceFile: SourceFile,
  sourceFile: SourceFile,
) => {
  const [P] = getActionSymbolTypeParams(actionSymbol);
  const [, functionDeclaration, isArgsEmpty] = addHookVariableStatement(
    "useServerAction",
    actionSymbol,
    actionInfo,
    P,
    templateSourceFile,
    sourceFile,
  );

  setQueryKey(functionDeclaration, actionInfo.id, isArgsEmpty);
  rectifyServerActionCalls(
    functionDeclaration,
    "serverAction",
    actionSymbol.getName(),
    isArgsEmpty,
  );
  return false;
};

const buildServerActionWithInvalidationsHook = (
  actionSymbol: Symbol,
  actionInfo: ActionInfo,
  templateSourceFile: SourceFile,
  sourceFile: SourceFile,
) => {
  const [P] = getActionSymbolTypeParams(actionSymbol);
  const [, functionDeclaration, isArgsEmpty] = addHookVariableStatement(
    "useServerActionWithInvalidations",
    actionSymbol,
    actionInfo,
    P,
    templateSourceFile,
    sourceFile,
  );

  setQueryKey(functionDeclaration, actionInfo.id, isArgsEmpty);
  setDependentQueryKeys(
    functionDeclaration,
    [],
    Array.from(actionInfo.dependants!).map(
      ([, dependantActionInfo]) => dependantActionInfo.id,
    ),
  );
  rectifyServerActionCalls(
    functionDeclaration,
    "serverAction",
    actionSymbol.getName(),
    isArgsEmpty,
  );
  return false;
};

const addCrudMutations = (
  mutations: string[],
  mutationDataTypeMap: Map<string, Type>,
  block: Block,
  templateSourceFile: SourceFile,
) => {
  const mutationStatementTemplate = templateSourceFile
    .getVariableStatement("useCrudServerActionMutation")!
    .getDeclarations()
    .at(0)!
    .getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction)
    .getBody()
    .asKindOrThrow(SyntaxKind.Block)
    .getStatements()
    .at(0)!
    .asKindOrThrow(SyntaxKind.VariableStatement)
    .getStructure();

  mutations.forEach((mutation) => {
    const mutationStatement = block.addVariableStatement(
      mutationStatementTemplate,
    );
    mutationStatement.getDeclarations().at(0)!.rename(mutation);
    const mutationFnAssignment = mutationStatement
      .getDeclarations()
      .at(0)!
      .getInitializer()!
      .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
      .find(
        (propertyAssignment) => propertyAssignment.getName() === "mutationFn",
      );
    if (!mutationFnAssignment)
      throw new Error(
        "Could not find mutationFn assignment in mutation statement",
      );
    const parameter = mutationFnAssignment.getFirstDescendantByKindOrThrow(
      SyntaxKind.Parameter,
    );
    parameter.setType(getOriginalTypeText(mutationDataTypeMap.get(mutation)!));
    const serverActionCall = mutationFnAssignment
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .find((call) => call.getExpression().getText() === "crudServerAction");
    if (!serverActionCall)
      throw new Error("Could not find serverAction call in mutation statement");
    serverActionCall
      .getArguments()
      .at(0)!
      .replaceWithText(JSON.stringify(mutation));
  });
};

const buildCrudServerActionHook = (
  actionSymbol: Symbol,
  actionInfo: ActionInfo,
  templateSourceFile: SourceFile,
  sourceFile: SourceFile,
) => {
  const [C, , U, D, P] = getActionSymbolTypeParams(actionSymbol);
  const mutationDataTypeMap = new Map([
    ["create", C],
    ["update", U],
    ["remove", D],
  ]);

  const [
    ,
    functionDeclaration,
    isArgsEmpty,
    isOriginalArgsEmpty,
    argsTypes,
    hasAnyType,
  ] = addHookVariableStatement(
    "useCrudServerAction",
    actionSymbol,
    actionInfo,
    P,
    templateSourceFile,
    sourceFile,
    mutationDataTypeMap,
  );
  const variantNameToKeyMap = actionInfo.variants
    ? Object.fromEntries(
        Array.from(actionInfo.variants.values()).map((variantInfo) => [
          variantInfo.variantName!,
          variantInfo.id,
        ]),
      )
    : null;

  setQueryKey(
    functionDeclaration,
    (actionInfo.variants
      ? `variantName ? (${JSON.stringify(variantNameToKeyMap)})[variantName] : `
      : "") + JSON.stringify(actionInfo.id),
    isArgsEmpty,
    true,
  );
  setDependentQueryKeys(
    functionDeclaration,
    [
      ...(actionInfo.mutations ? [actionInfo.id] : []),
      ...(actionInfo.variants
        ? Array.from(actionInfo.variants!.values()).map(
            (actionInfo) => actionInfo.id,
          )
        : []),
    ],
    actionInfo.dependants
      ? Array.from(actionInfo.dependants).map(
          ([, dependantActionInfo]) => dependantActionInfo.id,
        )
      : [],
  );

  if (actionInfo.mutations) {
    const body = functionDeclaration.getBody()!.asKindOrThrow(SyntaxKind.Block);
    const returnStatement = body.getStatementByKindOrThrow(
      SyntaxKind.ReturnStatement,
    )!;
    addCrudMutations(
      actionInfo.mutations,
      mutationDataTypeMap,
      body,
      templateSourceFile,
    );
    const returnStatementExpression = returnStatement
      .getExpression()!
      .getText();
    returnStatement.remove();
    if (actionInfo.variants) {
      const ifNotVariantName = body
        .addStatements(`if (!variantName) {}`)
        .at(0)!
        .asKindOrThrow(SyntaxKind.IfStatement);
      ifNotVariantName
        .getThenStatement()!
        .asKindOrThrow(SyntaxKind.Block)
        .addStatements(
          `return { ...${returnStatementExpression}, ${actionInfo.mutations.join(
            ", ",
          )} }`,
        );
      body.addStatements(`return ${returnStatementExpression}`);
    } else {
      body.addStatements(
        `return { ...${returnStatementExpression}, ${actionInfo.mutations.join(
          ", ",
        )} }`,
      );
    }
  }

  rectifyServerActionCalls(
    functionDeclaration,
    "crudServerAction",
    actionSymbol.getName(),
    isOriginalArgsEmpty,
    argsTypes.size > 1 ? argsTypes.get(actionSymbol)![0] : undefined,
  );

  if (actionInfo.variants) {
    const actionCallExpression = functionDeclaration
      .getVariableDeclaration("query")!
      .getFirstDescendantByKindOrThrow(SyntaxKind.ArrowFunction)
      .getBody()
      .getFirstDescendantByKindOrThrow(SyntaxKind.CallExpression);

    actionCallExpression.replaceWithText(
      "(" +
        Array.from(actionInfo.variants)
          .map(([variantSymbol, variantInfo]) => {
            const [variantArgsType, variantArgsEmpty] =
              argsTypes.get(variantSymbol)!;
            return `variantName === ${JSON.stringify(
              variantInfo.variantName,
            )} ? ${variantSymbol.getName()}(${
              variantArgsEmpty
                ? ""
                : `...args as ${getOriginalTypeText(variantArgsType)}`
            }) : `;
          })
          .join("") +
        actionCallExpression.getText() +
        ")",
    );
  }
  return hasAnyType;
};

const main = () => {
  const [projectRootPath, getShortestModuleSpecifier, project] =
    createProject();

  const actionSymbols = analyseProject(project);

  const templateSourceFile = project.createSourceFile(
    "",
    fs.readFileSync(
      path.join(
        __dirname,
        "gen_client_hooks",
        "server_action_hook_template.ts",
      ),
      "utf-8",
    ),
  );

  for (const [actionSymbol, actionInfo] of actionSymbols) {
    if (actionInfo.type === "crudServerActionVariant") continue;

    console.log(`Found action: ${actionSymbol.getName()} (${actionInfo.type})`);
    const dependantSymbols = actionInfo.dependants;
    if (dependantSymbols) {
      for (const [dependantSymbol] of dependantSymbols) {
        console.log(`  Dependant: ${dependantSymbol.getName()}`);
      }
    }
    const variantSymbols = actionInfo.variants;
    if (variantSymbols) {
      for (const [variantSymbol] of variantSymbols) {
        console.log(`  Variant: ${variantSymbol.getName()}`);
      }
    }
    const targetPath = `src/client/hooks/generated/${actionSymbol.getName()}.ts`;
    const hookSourceFile = project.createSourceFile(targetPath, "", {
      overwrite: true,
    });

    hookSourceFile.addImportDeclaration({
      moduleSpecifier: getShortestModuleSpecifier(
        actionSymbol.getDeclarations().at(0)!.getSourceFile().getFilePath(),
        targetPath,
      ),
      namedImports: [actionSymbol.getName()],
      leadingTrivia: `// This file is auto-generated by ${path.relative(
        projectRootPath,
        __filename,
      )}\n`,
    });

    if (actionInfo.variants) {
      actionInfo.variants.keys().forEach((variantSymbol) => {
        hookSourceFile.addImportDeclaration({
          moduleSpecifier: getShortestModuleSpecifier(
            variantSymbol
              .getDeclarations()
              .at(0)!
              .getSourceFile()
              .getFilePath(),
            targetPath,
          ),
          namedImports: [variantSymbol.getName()],
        });
      });
    }
    hookSourceFile.addImportDeclaration({
      moduleSpecifier: "@tanstack/react-query",
      namedImports: [
        ...(actionInfo.dependants || actionInfo.mutations
          ? ["useMutation"]
          : []),
        "useQuery",
        "useQueryClient",
        "type UseQueryResult",
        "type UseMutationResult",
      ],
    });

    let hasAnyType = false;
    if (actionInfo.type === "serverAction") {
      if (!dependantSymbols)
        hasAnyType = buildServerActionHook(
          actionSymbol,
          actionInfo,
          templateSourceFile,
          hookSourceFile,
        );
      else
        hasAnyType = buildServerActionWithInvalidationsHook(
          actionSymbol,
          actionInfo,
          templateSourceFile,
          hookSourceFile,
        );
    } else if (actionInfo.type === "crudServerAction") {
      hasAnyType = buildCrudServerActionHook(
        actionSymbol,
        actionInfo,
        templateSourceFile,
        hookSourceFile,
      );
    } else throw new Error(`Invalid action type: ${actionInfo.type}`);

    if (hasAnyType) {
      hookSourceFile.insertStatements(0, [
        "/* eslint-disable @typescript-eslint/no-explicit-any */",
      ]);
    }

    console.log(
      `Generating hook for ${actionSymbol.getName()} at ${targetPath}:`,
    );

    hookSourceFile.fixUnusedIdentifiers();
    hookSourceFile.formatText({
      indentSize: 2,
      convertTabsToSpaces: true,
      ensureNewLineAtEndOfFile: true,
      trimTrailingWhitespace: true,
    });
  }

  project.removeSourceFile(templateSourceFile);
  project.saveSync();
};

main();
