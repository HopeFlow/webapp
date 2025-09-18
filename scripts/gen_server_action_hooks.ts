import path from "node:path";
import {
  Project,
  SyntaxKind,
  Symbol,
  SourceFile,
  ArrowFunction,
  Type,
  Block,
  InterfaceDeclaration,
  Node,
} from "ts-morph";
import fs from "node:fs";
import {
  createProject,
  createShortestModuleSpecifierGetter,
  getOrThrow,
  getRealSymbol,
  getResolvedTypeText,
  upperCaseFirstLetter,
} from "./ts_morph_utilities";

const PRIMITIVE_TYPE_NAMES = [
  "string",
  "number",
  "boolean",
  "any",
  "unknown",
  "void",
  "never",
  "null",
  "undefined",
  "true",
  "false",
];

type ServerActionType =
  | "serverAction"
  | "crudServerAction"
  | "crudServerActionVariant";

type ActionInfo = {
  type: ServerActionType;
  id: string;
  scope: string;
  variantName?: string;
  mutations?: string[];
  parent?: Symbol;
  variants?: Map<Symbol, ActionInfo>;
  dependants?: Map<Symbol, ActionInfo>;
};

const analyseSourceFile = (
  sourceFile: SourceFile,
  actionSymbols: Map<Symbol, ActionInfo>,
  dependants: Map<Symbol, Set<Symbol>>,
) => {
  for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    for (const declaration of declarations) {
      if (declaration.isKind(SyntaxKind.VariableDeclaration)) {
        const candidateServerActionSymbol = getRealSymbol(declaration);
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
            const serverActionArguments = call.getArguments();
            if (serverActionArguments.length !== 1)
              throw new Error("Expected 1 argument for createServerAction");
            const argument = serverActionArguments[0].asKindOrThrow(
              SyntaxKind.ObjectLiteralExpression,
            );
            actionSymbols.set(candidateServerActionSymbol, {
              id: argument
                .getPropertyOrThrow("id")
                .asKindOrThrow(SyntaxKind.PropertyAssignment)
                .getInitializerIfKindOrThrow(SyntaxKind.StringLiteral)
                .getLiteralValue(),
              scope: argument
                .getPropertyOrThrow("scope")
                .asKindOrThrow(SyntaxKind.PropertyAssignment)
                .getInitializerIfKindOrThrow(SyntaxKind.StringLiteral)
                .getLiteralValue(),
              type: "serverAction",
            });
          }
          if (callee.getText() === "createCrudServerAction") {
            const serverActionArguments = call.getArguments();
            if (serverActionArguments.length !== 1)
              throw new Error("Expected 1 argument for createCrudServerAction");
            const argument = serverActionArguments[0].asKindOrThrow(
              SyntaxKind.ObjectLiteralExpression,
            );

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
                .getPropertyOrThrow("id")
                .asKindOrThrow(SyntaxKind.PropertyAssignment)
                .getInitializerIfKindOrThrow(SyntaxKind.StringLiteral)
                .getLiteralValue(),
              scope: argument
                .getPropertyOrThrow("scope")
                .asKindOrThrow(SyntaxKind.PropertyAssignment)
                .getInitializerIfKindOrThrow(SyntaxKind.StringLiteral)
                .getLiteralValue(),
              type: "crudServerAction",
              mutations: ["create", "update", "remove"].filter((mutation) =>
                isMutationProvided(mutation),
              ),
            });
          }
        }
        if (callee.isKind(SyntaxKind.PropertyAccessExpression)) {
          const parent = getRealSymbol(
            callee.getExpressionIfKind(SyntaxKind.Identifier),
          );
          if (parent && callee.getName() === "createVariant") {
            const parentAction = actionSymbols.get(parent);
            if (!parentAction) continue;
            const createVariantArguments = call.getArguments();
            if (createVariantArguments.length < 1)
              throw new Error("Expected at least 1 argument for createVariant");
            const variantName = createVariantArguments[0]
              .asKindOrThrow(SyntaxKind.StringLiteral)
              .getLiteralValue();
            actionSymbols.set(candidateServerActionSymbol, {
              id: `${parentAction!.id}.${variantName}`,
              scope: parentAction.scope,
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
    const candidateServerActionSymbol = getRealSymbol(
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
    const dependantSymbol = getRealSymbol(args[0]);
    if (!dependantSymbol) {
      console.warn(
        `Could not find symbol for dependant in ${candidateServerActionSymbol.getName()}.addInvalidation(${args[0].getText()})`,
      );
      return;
    }
    const serverActionDependants = dependants.get(candidateServerActionSymbol);
    if (!serverActionDependants)
      dependants.set(candidateServerActionSymbol, new Set([dependantSymbol]));
    else serverActionDependants.add(dependantSymbol);
  });
};

const getVariants = (actionSymbols: Map<Symbol, ActionInfo>) => {
  const variants = new Map<Symbol, Set<Symbol>>();
  for (const [symbol, action] of Array.from(actionSymbols.entries()).filter(
    ([, action]) => action.type === "crudServerActionVariant",
  )) {
    if (!action.parent) {
      console.warn(`Variant action ${symbol.getName()} has no parent`);
      continue;
    }
    const serverActionVariants = variants.get(action.parent);
    if (!serverActionVariants) variants.set(action.parent, new Set([symbol]));
    else serverActionVariants.add(symbol);
  }
  return variants;
};

const rectifyActionSymbols = (
  actionSymbols: Map<Symbol, ActionInfo>,
  variants: Map<Symbol, Set<Symbol>>,
  dependants: Map<Symbol, Set<Symbol>>,
) => {
  return new Map<Symbol, ActionInfo>(
    Array.from(actionSymbols.entries())
      .filter(([, action]) => action.type !== "crudServerActionVariant")
      .map(([symbol, { parent: _, ...action }]) => [
        symbol,
        {
          ...action,
          dependants: ((dependantsSet) =>
            dependantsSet &&
            new Map(
              Array.from(dependantsSet).map((s) => [
                s,
                getOrThrow(actionSymbols, s),
              ]),
            ))(dependants.get(symbol)),
          variants: ((variantsSet) =>
            variantsSet &&
            new Map(
              Array.from(variantsSet).map((s) => [
                s,
                getOrThrow(actionSymbols, s),
              ]),
            ))(variants.get(symbol)),
        },
      ]),
  );
};

const analyseProject = (project: Project) => {
  const actionSymbols = new Map<Symbol, ActionInfo>();
  const dependants = new Map<Symbol, Set<Symbol>>();

  for (const sourceFile of project.getSourceFiles())
    analyseSourceFile(sourceFile, actionSymbols, dependants);

  const variants = getVariants(actionSymbols);
  return rectifyActionSymbols(actionSymbols, variants, dependants);
};

const getActionSymbolType = (actionSymbol: Symbol) => {
  const declaration = actionSymbol.getDeclarations().at(0);
  if (!declaration)
    throw new Error(`Could not find declaration for ${actionSymbol.getName()}`);
  return actionSymbol.getTypeAtLocation(declaration);
};

const getActionSymbolTypeParams = (actionSymbol: Symbol) =>
  getActionSymbolType(actionSymbol).getTypeArguments();

const getTemplateHookVariableStatement = (
  templateHookName: string,
  templateSourceFile: SourceFile,
) => {
  const result = templateSourceFile.getVariableStatement(templateHookName);
  if (!result)
    throw new Error(
      `Could not find template variable statement for ${templateHookName}`,
    );
  return result;
};

const collectTypes = (type: Type | undefined, collected: Set<Symbol>) => {
  if (!type) return;

  if (type.getAliasSymbol()) {
    type.getAliasTypeArguments().forEach((t) => collectTypes(t, collected));
  }

  if (type.isArray()) {
    collectTypes(type.getArrayElementTypeOrThrow(), collected);
    return;
  }
  if (type.isTuple()) {
    type.getTupleElements().forEach((t) => collectTypes(t, collected));
    return;
  }

  if (type.isUnion()) {
    type.getUnionTypes().forEach((t) => collectTypes(t, collected));
    return;
  }
  if (type.isIntersection()) {
    type.getIntersectionTypes().forEach((t) => collectTypes(t, collected));
    return;
  }

  const symbol = type.getSymbol();
  if (symbol) {
    if (
      symbol.getName().startsWith("__") ||
      PRIMITIVE_TYPE_NAMES.includes(symbol.getName())
    ) {
      return;
    }

    const declarations = symbol.getDeclarations();
    if (declarations.length > 0) {
      const sourceFile = declarations[0].getSourceFile();
      if (!sourceFile.getFilePath().includes("/node_modules/")) {
        collected.add(symbol);
      }
    }
  }
};

const addHookVariableStatement = (
  templateHookName: string,
  actionSymbol: Symbol,
  actionInfo: ActionInfo,
  argsType: Type,
  templateSourceFile: SourceFile,
  sourceFile: SourceFile,
  mutationDataTypeMap?: Map<string, Type>,
) => {
  const templateStatement = getTemplateHookVariableStatement(
    templateHookName,
    templateSourceFile,
  );
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
                type: getResolvedTypeText(
                  typeChecker.getTypeOfSymbolAtLocation(
                    p,
                    p.getValueDeclarationOrThrow(),
                  ),
                  sourceFile,
                ),
              },
            ],
      );
      return {
        parameters: [...variantNameParam, ...restParams],
        returnType:
          `UseQueryResult<${getResolvedTypeText(
            typeChecker
              .getReturnTypeOfSignature(callSignature)
              .getTypeArguments()
              .at(0)!,
            sourceFile,
          )}>` +
          (symbol === actionSymbol && actionInfo.mutations
            ? `& { ${actionInfo.mutations.map(
                (mutation) =>
                  `${mutation}: UseMutationResult<boolean, Error, ${getResolvedTypeText(
                    mutationDataTypeMap!.get(mutation)!,
                    sourceFile,
                  )}>`,
              )}
 }`
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
  hookDeclaration.rename(`use${upperCaseFirstLetter(actionInfo.id)}`);
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
          ? getResolvedTypeText(
              Array.from(argsTypes.values()).at(0)![0],
              sourceFile,
            )
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
              `${arg.getText()} as ${getResolvedTypeText(
                argsType,
                functionDeclaration,
              )}`,
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
    parameter.setType(
      getResolvedTypeText(mutationDataTypeMap.get(mutation)!, block),
    );
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
      `(
        ${Array.from(actionInfo.variants)
          .map(([variantSymbol, variantInfo]) => {
            const [variantArgsType, variantArgsEmpty] =
              argsTypes.get(variantSymbol)!;
            return `variantName === ${JSON.stringify(
              variantInfo.variantName,
            )} ? ${variantSymbol.getName()}(
              ${
                variantArgsEmpty
                  ? ""
                  : `...args as ${getResolvedTypeText(
                      variantArgsType,
                      functionDeclaration,
                    )}`
              }
            ) : `;
          })
          .join("")}
        ${actionCallExpression.getText()}
      )`,
    );
  }
  return hasAnyType;
};

const main = () => {
  const [projectRootPath, project] = createProject();
  const getShortestModuleSpecifier =
    createShortestModuleSpecifierGetter(projectRootPath);

  const actionSymbols = analyseProject(project);

  const templateSourceFile = project.createSourceFile(
    "",
    fs.readFileSync(
      path.join(__dirname, "templates", "server_action_hook_template.ts"),
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
    const targetPath = `src/server_actions/client/${
      actionInfo.scope
    }/${actionSymbol.getName()}.ts`;
    const hookSourceFile = project.createSourceFile(targetPath, "", {
      overwrite: true,
    });

    const typesToImport = new Set<Symbol>();

    const actionParams = getActionSymbolTypeParams(actionSymbol);
    actionParams.forEach((t) => collectTypes(t, typesToImport));

    if (actionInfo.variants) {
      for (const variantSymbol of Array.from(actionInfo.variants.keys())) {
        const variantParams = getActionSymbolTypeParams(variantSymbol);
        variantParams.forEach((t) => collectTypes(t, typesToImport));
      }
    }

    const importsToAdd = new Map<string, Set<string>>();

    for (const typeSymbol of typesToImport) {
      const declaration = typeSymbol.getDeclarations()[0];
      if (!declaration) continue;

      if (actionSymbols.has(typeSymbol)) continue;
      if (typeSymbol.getName() === actionSymbol.getName()) continue;
      if (
        actionInfo.variants &&
        Array.from(actionInfo.variants.keys()).some(
          (s) => s.getName() === typeSymbol.getName(),
        )
      )
        continue;

      if (
        !typeSymbol.getDeclarations().some((d) => {
          if (Node.isExportable(d)) {
            return d.isExported();
          }
          return false;
        })
      ) {
        throw new Error(
          `Type '${typeSymbol.getName()}' is used by action '${actionSymbol.getName()}' but is not exported from its module '${declaration
            .getSourceFile()
            .getFilePath()}'. Please export the type.`,
        );
      }

      const moduleSpecifier = getShortestModuleSpecifier(
        declaration.getSourceFile().getFilePath(),
        targetPath,
      );

      if (!importsToAdd.has(moduleSpecifier)) {
        importsToAdd.set(moduleSpecifier, new Set());
      }
      importsToAdd.get(moduleSpecifier)!.add(typeSymbol.getName());
    }

    hookSourceFile.addImportDeclaration({
      moduleSpecifier: getShortestModuleSpecifier(
        actionSymbol.getDeclarations().at(0)!.getSourceFile().getFilePath(),
        targetPath,
      ),
      namedImports: [actionSymbol.getName()],
      leadingTrivia: `// This file is auto-generated by ${path.relative(
        projectRootPath,
        __filename,
      )}
`,
    });

    if (actionInfo.variants) {
      Array.from(actionInfo.variants.keys()).forEach((variantSymbol) => {
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

    for (const [moduleSpecifier, namedImports] of importsToAdd) {
      const existingImport = hookSourceFile.getImportDeclaration(
        (d) => d.getModuleSpecifierValue() === moduleSpecifier,
      );
      if (existingImport) {
        const existingNamed = existingImport
          .getNamedImports()
          .map((ni) => ni.getName());
        const newImports = Array.from(namedImports).filter(
          (ni) => !existingNamed.includes(ni),
        );
        if (newImports.length > 0) {
          existingImport.addNamedImports(newImports);
        }
      } else {
        hookSourceFile.addImportDeclaration({
          moduleSpecifier,
          namedImports: Array.from(namedImports),
        });
      }
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

    const hookDeclaration = hookSourceFile.getVariableDeclaration(
      `use${upperCaseFirstLetter(actionInfo.id)}`,
    );
    if (hookDeclaration) {
      hookDeclaration.set({
        trailingTrivia: `use${upperCaseFirstLetter(actionInfo.id)}.scope = "${
          actionInfo.scope
        }";`,
      });
    }

    hookSourceFile.insertStatements(0, [
      "/* eslint-disable @typescript-eslint/no-explicit-any */",
    ]);

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
